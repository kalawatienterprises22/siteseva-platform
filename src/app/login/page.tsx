import Link from "next/link";
import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <>
      <LoginForm
        endpoint="/api/auth/login"
        heading="यूजर लॉगिन"
        description="कॉन्ट्रैक्टर, मशीन मालिक, ड्राइवर, ऑपरेटर और अन्य स्वीकृत यूजर के लिए।"
      />
      <nav className="portal-link"><Link href="/super-admin/login">Company Super Admin प्रवेश</Link></nav>
    </>
  );
}
