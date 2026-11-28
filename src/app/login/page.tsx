import { LoginForm } from "@/components/login-form";

export default function LoginPage() {
  return (
    <>
      <LoginForm
        endpoint="/api/auth/login"
        heading="यूजर लॉगिन"
        headingEn="User Login"
        description="कॉन्ट्रैक्टर, मशीन मालिक, ड्राइवर, ऑपरेटर और अन्य स्वीकृत यूजर के लिए।"
        descriptionEn="For contractors, equipment owners, drivers, operators and other approved users."
      />
    </>
  );
}
