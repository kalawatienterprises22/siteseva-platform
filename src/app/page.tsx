import Link from "next/link";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

type Listing = { id: string; title: string; category: string; location_text: string; daily_rate: string | null };
type Tender = { id: string; title: string; category: string; location_text: string; deadline: Date | null };

async function getPublicMarketplace() {
  try {
    const db = getDb();
    const [listings, tenders] = await Promise.all([
      db.query<Listing>(`SELECT id, title, category, location_text, daily_rate
        FROM marketplace_listings WHERE status='APPROVED'
        ORDER BY created_at DESC LIMIT 6`),
      db.query<Tender>(`SELECT id, title, category, location_text, deadline
        FROM tenders WHERE status='PUBLISHED'
        ORDER BY created_at DESC LIMIT 6`),
    ]);
    return { listings: listings.rows, tenders: tenders.rows, connected: true };
  } catch {
    return { listings: [] as Listing[], tenders: [] as Tender[], connected: false };
  }
}

const categories = [
  ["मशीनरी और वाहन", "JCB, Excavator, Crane, Dumper और अन्य उपकरण"],
  ["टेंडर और काम", "निर्माण कार्य, सप्लाई और जॉब अवसर"],
  ["कोटेशन", "प्रोजेक्ट के लिए पारदर्शी मूल्य प्रस्ताव"],
  ["कॉन्ट्रैक्टर", "कंपनी और ठेकेदार नेटवर्क"],
  ["ऑपरेटर और ड्राइवर", "कुशल मशीन ऑपरेटर और वाहन चालक"],
  ["साइट रिपोर्ट", "डीजल, रनिंग घंटे और ब्रेकडाउन रिकॉर्ड"],
];

export default async function Home() {
  const data = await getPublicMarketplace();
  return (
    <main className="site-shell">
      <header className="site-header">
        <Link href="/" className="brand"><span className="brand-mark">S</span><span>SiteSeva<small>Construction marketplace & operations</small></span></Link>
        <nav><Link href="/login">लॉगिन</Link><Link className="nav-cta" href="/login">शुरू करें</Link></nav>
      </header>
      <section className="hero">
        <div className="eyebrow">निर्माण उद्योग के लिए एक डिजिटल प्लेटफॉर्म</div>
        <h1>मशीनरी, टेंडर और साइट ऑपरेशन — <em>एक ही जगह।</em></h1>
        <p>मशीन और वाहन खोजें, काम के अवसर देखें, कोटेशन प्रबंधित करें और अपनी साइट की गतिविधियों का रिकॉर्ड रखें।</p>
        <div className="hero-actions"><Link className="primary-btn" href="/login">SiteSeva में प्रवेश करें</Link><Link className="text-link" href="#marketplace">लाइव लिस्टिंग देखें →</Link></div>
        <div className="hero-note">मालिकों, कॉन्ट्रैक्टरों, ऑपरेटरों और ड्राइवरों के लिए।</div>
      </section>
      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">प्लेटफॉर्म सुविधाएँ</div><h2>काम को व्यवस्थित और आसान बनाइए</h2></div></div>
        <div className="feature-grid">{categories.map(([title, desc]) => <article className="feature-card" key={title}><span className="feature-dot">●</span><h3>{title}</h3><p>{desc}</p></article>)}</div>
      </section>
      <section className="section" id="marketplace">
        <div className="section-heading"><div><div className="eyebrow">मार्केटप्लेस</div><h2>उपलब्ध मशीनरी</h2></div><Link className="text-link" href="/login">अपनी मशीन लिस्ट करें →</Link></div>
        {!data.connected ? <p className="empty-state">मार्केटप्लेस सेवा अभी उपलब्ध नहीं है। कृपया थोड़ी देर बाद देखें।</p> : data.listings.length === 0 ? <p className="empty-state">अभी कोई स्वीकृत मशीनरी लिस्टिंग प्रकाशित नहीं हुई है।</p> :
          <div className="listing-grid">{data.listings.map(item => <article className="listing-card" key={item.id}><div className="listing-category">{item.category.replaceAll("_"," ")}</div><h3>{item.title}</h3><p>⌖ {item.location_text}</p><strong>{item.daily_rate ? "₹"+Number(item.daily_rate).toLocaleString("en-IN")+" / दिन" : "रेट के लिए संपर्क करें"}</strong></article>)}</div>}
      </section>
      <section className="section">
        <div className="section-heading"><div><div className="eyebrow">नए अवसर</div><h2>प्रकाशित टेंडर</h2></div><Link className="text-link" href="/login">टेंडर पोस्ट करें →</Link></div>
        {!data.connected ? <p className="empty-state">टेंडर सेवा अभी उपलब्ध नहीं है।</p> : data.tenders.length === 0 ? <p className="empty-state">अभी कोई प्रकाशित टेंडर नहीं है।</p> :
          <div className="tender-list">{data.tenders.map(item => <article className="tender-row" key={item.id}><div><h3>{item.title}</h3><p>{item.category} · {item.location_text}</p></div><span>{item.deadline ? new Date(item.deadline).toLocaleDateString("en-IN") : "तिथि घोषित नहीं"}</span></article>)}</div>}
      </section>
      <footer className="site-footer"><div><strong>SiteSeva</strong><p>निर्माण कार्यों और संसाधनों को जोड़ने वाला स्वतंत्र प्लेटफॉर्म।</p></div><div className="footer-links"><Link href="/privacy">Privacy Policy</Link><Link href="/login">User Login</Link><Link href="/super-admin/login">Company Admin</Link></div><small>© {new Date().getFullYear()} SiteSeva. All rights reserved.</small></footer>
    </main>
  );
}
