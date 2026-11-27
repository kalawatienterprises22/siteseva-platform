"use client";

import { useState } from "react";

type Item = { id: string; title: string; detail: string; kind: "listing" | "tender" | "worker" };
export function ModerationQueue({ items }: { items: Item[] }) {
  const [rows, setRows] = useState(items);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  async function decide(item: Item, decision: "approve" | "reject") {
    setBusy(item.id); setMessage("");
    try {
      const response = await fetch("/api/super-admin/moderation", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: item.kind, id: item.id, decision }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "कार्रवाई पूरी नहीं हुई।");
      setRows(current => current.filter(row => row.id !== item.id));
      setMessage(decision === "approve" ? "रिकॉर्ड स्वीकृत हो गया।" : "रिकॉर्ड अस्वीकृत हो गया।");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "त्रुटि हुई।");
    } finally { setBusy(null); }
  }
  return <section className="panel">
    <div className="section-heading"><div><div className="eyebrow">समीक्षा कतार</div><h2>अनुमोदन के लिए लंबित</h2></div><strong>{rows.length}</strong></div>
    {message && <p role="status">{message}</p>}
    {rows.length === 0 ? <p className="empty-state">अभी कोई रिकॉर्ड समीक्षा के लिए लंबित नहीं है।</p> :
      <div className="moderation-list">{rows.map(item => <article className="moderation-row" key={item.id}>
        <div><span className="listing-category">{item.kind === "listing" ? "मशीनरी" : item.kind === "tender" ? "टेंडर" : "वर्कर प्रोफाइल"}</span><h3>{item.title}</h3><p>{item.detail}</p></div>
        <div className="moderation-actions">
          <button className="primary-btn" disabled={busy !== null} onClick={() => decide(item, "approve")}>{busy === item.id ? "कृपया प्रतीक्षा करें" : "स्वीकृत करें"}</button>
          <button className="secondary" disabled={busy !== null} onClick={() => decide(item, "reject")}>अस्वीकृत</button>
        </div>
      </article>)}</div>}
  </section>;
}
