import { LoginForm } from "@/components/login-form";

export default function SuperAdminLoginPage() {
  return (
    <LoginForm
      endpoint="/api/super-admin/auth/login"
      heading="Company Super Admin"
      description="यह अलग और प्रतिबंधित Super Admin प्रवेश है। पासवर्ड के साथ Authenticator ऐप का कोड भी जरूरी है।"
      mfaRequired
    />
  );
}
