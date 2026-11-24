import "server-only";
import { createHash, createHmac, randomBytes, randomUUID } from "node:crypto";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import type { NextRequest } from "next/server";
import type { PoolClient } from "pg";
import { getDb } from "@/lib/db";

const SESSION_TTL_SECONDS = 60 * 60 * 12;
const MAX_LOGIN_ATTEMPTS = 10;
const LOCK_AFTER_FAILURES = 8;
const LOCK_MINUTES = 15;
const DUMMY_HASH_PROMISE = bcrypt.hash("not-a-real-site-seva-account-password", 12);

export type Portal = "common" | "super-admin";

export type AuthUser = {
  id: string;
  displayName: string;
  roles: string[];
  sessionId: string;
};

function sessionSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (!secret || secret.length < 64) {
    throw new Error("SESSION_SECRET is missing or too short");
  }
  return secret;
}

function sha256(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

function fingerprint(value: string): string {
  return createHmac("sha256", sessionSecret()).update(value).digest("hex");
}

function getRequestFingerprints(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip") || "unknown";
  const agent = request.headers.get("user-agent") || "unknown";
  return {
    ip: fingerprint(ip),
    userAgent: fingerprint(agent.slice(0, 500)),
  };
}

function cookieName() {
  return process.env.NODE_ENV === "production"
    ? "__Host-siteseva_session"
    : "siteseva_session";
}

async function setUserContext(client: PoolClient, userId: string) {
  await client.query("SELECT set_config('app.user_id', $1, true)", [userId]);
}

export async function loginWithPassword(
  request: NextRequest,
  input: { mobile: string; password: string; portal: Portal },
): Promise<
  | { ok: true; user: { id: string; displayName: string; roles: string[] }; redirectTo: string }
  | { ok: false; status: number; message: string }
> {
  const db = getDb();
  const fingerprints = getRequestFingerprints(request);
  const identifierFingerprint = fingerprint(input.mobile);

  const rate = await db.query<{ count: number }>(
    `SELECT count(*)::int AS count
       FROM app_login_attempts
      WHERE attempted_at > now() - interval '15 minutes'
        AND (identifier_fingerprint = $1 OR ip_fingerprint = $2)`,
    [identifierFingerprint, fingerprints.ip],
  );
  if ((rate.rows[0]?.count ?? 0) >= MAX_LOGIN_ATTEMPTS) {
    return { ok: false, status: 429, message: "बहुत अधिक प्रयास हुए हैं। 15 मिनट बाद दोबारा प्रयास करें।" };
  }

  const lookup = await db.query<{
    id: string;
    password_hash: string;
    status: string;
    failed_login_count: number;
    locked_until: Date | null;
  }>("SELECT * FROM app_auth_lookup($1)", [input.mobile]);
  const account = lookup.rows[0];
  const storedHash = account?.password_hash ?? await DUMMY_HASH_PROMISE;
  const passwordMatches = await bcrypt.compare(input.password, storedHash);
  const currentlyLocked = Boolean(account?.locked_until && new Date(account.locked_until).getTime() > Date.now());

  if (!account || !passwordMatches || account.status !== "ACTIVE" || currentlyLocked) {
    if (account) {
      const client = await db.connect();
      try {
        await client.query("BEGIN");
        await setUserContext(client, account.id);
        await client.query(
          `UPDATE app_users
              SET failed_login_count = failed_login_count + 1,
                  locked_until = CASE
                    WHEN failed_login_count + 1 >= $2 THEN now() + ($3 * interval '1 minute')
                    ELSE locked_until
                  END,
                  updated_at = now()
            WHERE id = $1`,
          [account.id, LOCK_AFTER_FAILURES, LOCK_MINUTES],
        );
        await client.query("COMMIT");
      } catch {
        await client.query("ROLLBACK");
        throw new Error("Authentication update failed");
      } finally {
        client.release();
      }
    }
    await db.query(
      "INSERT INTO app_login_attempts (identifier_fingerprint, ip_fingerprint, succeeded) VALUES ($1, $2, false)",
      [identifierFingerprint, fingerprints.ip],
    );
    return { ok: false, status: 401, message: "मोबाइल नंबर या पासवर्ड सही नहीं है, या अकाउंट सक्रिय नहीं है।" };
  }

  const client = await db.connect();
  const token = randomBytes(32).toString("base64url");
  const sessionId = randomUUID();
  const expiresAt = new Date(Date.now() + SESSION_TTL_SECONDS * 1000);
  let roles: string[] = [];

  try {
    await client.query("BEGIN");
    await setUserContext(client, account.id);

    const roleResult = await client.query<{ role_key: string }>(
      `SELECT r.role_key
         FROM app_user_roles ur
         JOIN app_roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1`,
      [account.id],
    );
    roles = roleResult.rows.map((row) => row.role_key);

    const hasSuperAdmin = roles.includes("SUPER_ADMIN");
    const portalAllowed = input.portal === "super-admin"
      ? hasSuperAdmin
      : roles.length > 0 && !hasSuperAdmin;

    if (!portalAllowed) {
      await client.query("ROLLBACK");
      await db.query(
        "INSERT INTO app_login_attempts (identifier_fingerprint, ip_fingerprint, succeeded) VALUES ($1, $2, false)",
        [identifierFingerprint, fingerprints.ip],
      );
      return {
        ok: false,
        status: 403,
        message: input.portal === "super-admin"
          ? "इस खाते को Super Admin प्रवेश की अनुमति नहीं है।"
          : "Super Admin के लिए अलग प्रवेश लिंक इस्तेमाल करें।",
      };
    }

    await client.query(
      `UPDATE app_users
          SET failed_login_count = 0, locked_until = NULL, updated_at = now()
        WHERE id = $1`,
      [account.id],
    );
    await client.query(
      `INSERT INTO app_sessions
        (id, user_id, token_hash, expires_at, ip_fingerprint, user_agent_fingerprint)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [sessionId, account.id, sha256(token), expiresAt, fingerprints.ip, fingerprints.userAgent],
    );
    await client.query(
      "INSERT INTO app_login_attempts (identifier_fingerprint, ip_fingerprint, succeeded) VALUES ($1, $2, true)",
      [identifierFingerprint, fingerprints.ip],
    );
    await client.query(
      `INSERT INTO app_audit_logs
        (actor_user_id, actor_role_key, action, target_type, target_id, outcome, details)
       VALUES ($1, $2, 'AUTH_LOGIN', 'USER', $1, 'SUCCESS', '{}'::jsonb)`,
      [account.id, roles.includes("SUPER_ADMIN") ? "SUPER_ADMIN" : roles[0]],
    );
    await client.query("COMMIT");
  } catch {
    await client.query("ROLLBACK");
    throw new Error("Authentication transaction failed");
  } finally {
    client.release();
  }

  const cookieStore = await cookies();
  cookieStore.set(cookieName(), token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
    priority: "high",
  });

  return {
    ok: true,
    user: { id: account.id, displayName: "SiteSeva User", roles },
    redirectTo: input.portal === "super-admin" ? "/super-admin" : "/dashboard",
  };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(cookieName())?.value;
  if (!token) return null;

  const lookup = await getDb().query<{
    session_id: string;
    user_id: string;
    expires_at: Date;
    revoked_at: Date | null;
    user_status: string;
  }>("SELECT * FROM app_session_lookup($1)", [sha256(token)]);
  const session = lookup.rows[0];
  if (
    !session ||
    session.revoked_at ||
    new Date(session.expires_at).getTime() <= Date.now() ||
    session.user_status !== "ACTIVE"
  ) {
    return null;
  }

  const client = await getDb().connect();
  try {
    await client.query("BEGIN");
    await setUserContext(client, session.user_id);
    const current = await client.query<{ id: string; display_name: string }>(
      `SELECT u.id, u.display_name
         FROM app_sessions s
         JOIN app_users u ON u.id = s.user_id
        WHERE s.id = $1 AND s.user_id = $2
          AND s.token_hash = $3 AND s.revoked_at IS NULL
          AND s.expires_at > now() AND u.status = 'ACTIVE'`,
      [session.session_id, session.user_id, sha256(token)],
    );
    if (!current.rows[0]) {
      await client.query("ROLLBACK");
      return null;
    }
    const roleResult = await client.query<{ role_key: string }>(
      `SELECT r.role_key
         FROM app_user_roles ur
         JOIN app_roles r ON r.id = ur.role_id
        WHERE ur.user_id = $1`,
      [session.user_id],
    );
    await client.query(
      "UPDATE app_sessions SET last_seen_at = now() WHERE id = $1",
      [session.session_id],
    );
    await client.query("COMMIT");
    return {
      id: current.rows[0].id,
      displayName: current.rows[0].display_name,
      roles: roleResult.rows.map((row) => row.role_key),
      sessionId: session.session_id,
    };
  } catch {
    await client.query("ROLLBACK");
    return null;
  } finally {
    client.release();
  }
}

export async function revokeCurrentSession() {
  const user = await getCurrentUser();
  const cookieStore = await cookies();
  if (user) {
    const client = await getDb().connect();
    try {
      await client.query("BEGIN");
      await setUserContext(client, user.id);
      await client.query(
        "UPDATE app_sessions SET revoked_at = now() WHERE id = $1 AND user_id = $2 AND revoked_at IS NULL",
        [user.sessionId, user.id],
      );
      await client.query(
        `INSERT INTO app_audit_logs
          (actor_user_id, actor_role_key, action, target_type, target_id, outcome, details)
         VALUES ($1, $2, 'AUTH_LOGOUT', 'SESSION', $3, 'SUCCESS', '{}'::jsonb)`,
        [user.id, user.roles[0] ?? null, user.sessionId],
      );
      await client.query("COMMIT");
    } catch {
      await client.query("ROLLBACK");
      throw new Error("Session revocation failed");
    } finally {
      client.release();
    }
  }
  cookieStore.delete(cookieName());
}
