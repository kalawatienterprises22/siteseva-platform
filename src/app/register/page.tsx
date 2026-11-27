import Link from "next/link";
import { RegistrationForm } from "@/components/registration-form";
export const dynamic="force-dynamic";
export default function RegisterPage(){return <><header className="site-header"><Link href="/" className="brand"><span className="brand-mark">S</span><span>SiteSeva</span></Link><nav><Link href="/login">User Login</Link></nav></header><RegistrationForm /><footer className="site-footer"><Link href="/">← SiteSeva Home</Link></footer></>;}
