import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.roles.includes("SUPER_ADMIN")) redirect("/super-admin");

  return (
    <main>
      <section className="panel">
        <div className="eyebrow">SiteSeva · सुरक्षित यूजर पोर्टल</div>
        <h1>नमस्ते, {user.displayName}</h1>
        <p>आपकी पहचान सर्वर पर सत्यापित हुई है। अभी आपके खाते की भूमिका के अनुसार डैशबोर्ड तैयार किया जा रहा है।</p>
        <p><strong>आपकी भूमिका:</strong> {user.roles.join(", ")}</p>
        <form action="/api/auth/logout" method="post"><button className="secondary" type="submit">लॉगआउट</button></form>
      </section>
    </main>
  );
}
