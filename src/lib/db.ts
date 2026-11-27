import "server-only";
import { Pool } from "pg";

declare global {
  // Reuse one pool across warm serverless invocations.
  // eslint-disable-next-line no-var
  var siteSevaPool: Pool | undefined;
}

function createPool(): Pool {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) throw new Error("DATABASE_URL is not configured");

  const parsedUrl = new URL(connectionString);
  const sslMode = parsedUrl.searchParams.get("sslmode");
  if (sslMode && ["prefer", "require", "verify-ca"].includes(sslMode)) {
    parsedUrl.searchParams.set("sslmode", "verify-full");
  }

  return new Pool({
    connectionString: parsedUrl.toString(),
    max: 5,
    idleTimeoutMillis: 10_000,
    connectionTimeoutMillis: 5_000,
    ssl: { rejectUnauthorized: true },
    application_name: "siteseva-platform",
  });
}

export function getDb(): Pool {
  if (!global.siteSevaPool) global.siteSevaPool = createPool();
  return global.siteSevaPool;
}
