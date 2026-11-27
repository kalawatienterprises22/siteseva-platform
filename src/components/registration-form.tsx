"use client";
import { FormEvent, useState } from "react";
const roleLabels: Record<string,string> = {CONTRACTOR:"Contractor / ठेकेदार",LABOUR_CONTRACTOR:"Labour Contractor / लेबर ठेकेदार",MACHINE_OWNER:"Machine / Vehicle Owner",DRIVER:"Driver / ड्राइवर",OPERATOR:"Machine Operator / ऑपरेटर",PUBLIC_USER:"Public User / सामान्य यूजर"};
export function RegistrationForm() {
 const [role,setRole]=useState("CONTRACTOR"),[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState("");
 const contractor=["CONTRACTOR","LABOUR_CONTRACTOR"].includes(role);
 async function submit(event:FormEvent<HTMLFormElement>) {
  event.preventDefault();const formElement=event.currentTarget;setBusy(true);setError("");setSuccess("");
  const form=new FormData(formElement),payload={fullName:String(form.get("fullName")||"").trim(),mobile:String(form.get("mobile")||"").trim(),role,organizationName:String(form.get("organizationName")||"").trim(),gstNumber:String(form.get("gstNumber")||"").trim().toUpperCase(),password:String(form.get("password")||"")};
  try {const response=await fetch("/api/register",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify(payload)});const data=await response.json();if(!response.ok){setError(data.error||"Registration request failed.");return;}setSuccess(data.message||"Request received. Await Super Admin review.");formElement.reset();setRole("CONTRACTOR");}
  catch{setError("Network error. Please try again.");}finally{setBusy(false);}
 }
 return <main><section className="panel login-panel"><div className="eyebrow">SiteSeva · New account request</div><h1>रजिस्ट्रेशन / Register</h1><p>अपनी भूमिका चुनें। खाता तुरंत नहीं खुलेगा—Company Super Admin मोबाइल और आवश्यक दस्तावेज़ जाँचकर इसे सक्रिय करेगा।</p>
 <form className="login-form" onSubmit={submit}><label htmlFor="fullName">पूरा नाम / Full name</label><input id="fullName" name="fullName" minLength={2} maxLength={120} autoComplete="name" required/><label htmlFor="mobile">मोबाइल नंबर / Mobile number</label><input id="mobile" name="mobile" type="tel" inputMode="tel" defaultValue="+91" placeholder="+919876543210" required/><label htmlFor="role">आपकी भूमिका / Account type</label><select id="role" value={role} onChange={e=>setRole(e.target.value)}>{Object.entries(roleLabels).map(([value,label])=><option key={value} value={value}>{label}</option>)}</select>
 {contractor?<><label htmlFor="organizationName">कंपनी / फर्म का नाम</label><input id="organizationName" name="organizationName" minLength={2} maxLength={160} required/><label htmlFor="gstNumber">GSTIN (अनिवार्य)</label><input id="gstNumber" name="gstNumber" autoCapitalize="characters" maxLength={15} minLength={15} pattern="[0-9]{2}[A-Za-z]{5}[0-9]{4}[A-Za-z][1-9A-Za-z]Z[0-9A-Za-z]" required/></>:<input type="hidden" name="organizationName" value=""/>}
 <label htmlFor="password">मजबूत पासवर्ड / Password (कम-से-कम 12 अक्षर)</label><input id="password" name="password" type="password" autoComplete="new-password" minLength={12} maxLength={128} required/>{error?<p className="error" role="alert">{error}</p>:null}{success?<p className="success" role="status">{success}</p>:null}<button type="submit" disabled={busy}>{busy?"भेजा जा रहा है…":"Registration Request भेजें"}</button></form>
 <p className="small-note">मोबाइल नंबर और GST दस्तावेज़ की जाँच Admin द्वारा मैन्युअल रूप से होगी। अभी SMS OTP/WhatsApp सत्यापन सक्रिय नहीं है।</p></section></main>;
}
