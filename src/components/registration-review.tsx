"use client";
import {useState} from "react";
type Item={id:string;full_name:string;mobile_e164:string;requested_role:string;organization_name:string|null;gst_number:string|null;created_at:string};
export function RegistrationReview({initialItems}:{initialItems:Item[]}){
 const [items,setItems]=useState(initialItems),[busy,setBusy]=useState(""),[error,setError]=useState("");
 async function decide(id:string,decision:"APPROVE"|"REJECT"){
  setBusy(id);setError("");
  try{
   const response=await fetch("/api/super-admin/registrations",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"same-origin",cache:"no-store",body:JSON.stringify({id,decision})});
   const data=await response.json();
   if(!response.ok){setError(data.error||"Review failed.");return;}
   setItems(current=>current.filter(x=>x.id!==id));
  }catch{setError("Network error. Please retry.");}
  finally{setBusy("");}
 }
 return <section className="panel">
  <div className="section-heading"><div><div className="eyebrow">Pending review</div><h2>नए अकाउंट अनुरोध ({items.length})</h2></div></div>
  {error?<p className="error" role="alert">{error}</p>:null}
  {!items.length?<p className="empty-state">अभी कोई Pending Registration नहीं है।</p>:<div className="tender-list">{items.map(item=><article className="tender-row" key={item.id}>
   <div><h3>{item.full_name} · {item.requested_role.replaceAll("_"," ")}</h3><p>{item.mobile_e164} · {item.organization_name||"Individual account"}</p>{item.gst_number?<p>GSTIN: <strong>{item.gst_number}</strong></p>:null}<small>{new Date(item.created_at).toLocaleString("en-IN")}</small></div>
   <div className="hero-actions"><button type="button" disabled={!!busy} onClick={()=>decide(item.id,"APPROVE")}>{busy===item.id?"Processing…":"Approve"}</button><button type="button" className="secondary" disabled={!!busy} onClick={()=>decide(item.id,"REJECT")}>Reject</button></div>
  </article>)}</div>}
 </section>;
}
