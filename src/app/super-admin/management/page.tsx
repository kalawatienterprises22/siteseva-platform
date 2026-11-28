import {redirect} from "next/navigation";
import Link from "next/link";
import {getCurrentUser} from "@/lib/auth";
import {SuperAdminManagement} from "@/components/super-admin-management";
export const dynamic="force-dynamic";
export default async function SuperAdminManagementPage(){const user=await getCurrentUser();if(!user)redirect("/super-admin/login");if(!user.roles.includes("SUPER_ADMIN"))redirect("/dashboard");return <main className="dashboard-shell"><header className="dashboard-header"><div><div className="eyebrow">SITE SEVA · COMPANY CONTROL</div><h1>Super Admin Management</h1><p>Company administration: users, organizations, machine listings, assignments and driver approvals.</p></div><Link className="secondary" href="/super-admin">Super Admin Dashboard</Link></header><SuperAdminManagement/></main>}
