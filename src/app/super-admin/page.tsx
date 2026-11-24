import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function SuperAdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/super-admin/login");
  if (!user.roles.includes("SUPER_ADMIN")) redirect("/dashboard");

  return (
    <main>
      <section className="panel">
        <div className="eyebrow">SiteSeva · Company Control</div>
        <h1>Super Admin Panel</h1>
        <p>स्वागत है, {user.displayName}। यह पोर्टल केवल SUPER_ADMIN भूमिका वाले खाते के लिए है।</p>
        <p>यहाँ से कंपनी-स्तर के यूजर, अनुमतियाँ, अनुमोदन, सुरक्षा और ऑडिट नियंत्रण जोड़े जाएँगे।</p>
        <form action="/api/auth/logout" method="post"><button className="secondary" type="submit">लॉगआउट</button></form>
      </section>
    </main>
  );
}
