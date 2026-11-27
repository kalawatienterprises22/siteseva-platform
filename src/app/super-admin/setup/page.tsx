import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default function SuperAdminSetupPage() {
  redirect("/super-admin/login");
}
