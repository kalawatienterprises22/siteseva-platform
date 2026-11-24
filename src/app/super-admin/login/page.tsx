import { LoginForm } from "@/components/login-form";

export default function SuperAdminLoginPage() {
  return (
    <LoginForm
      endpoint="/api/super-admin/auth/login"
      heading="Company Super Admin"
      description="यह अलग और प्रतिबंधित Super Admin प्रवेश है। सामान्य यूजर लॉगिन यहाँ स्वीकार नहीं होगा।"
    />
  );
}
