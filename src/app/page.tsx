export default function Home() {
  return (
    <main>
      <section className="panel">
        <div className="eyebrow">Independent platform · Security-first foundation</div>
        <h1>SiteSeva</h1>
        <span className="status">प्रारंभिक निर्माण जारी है</span>
        <p>
          SiteSeva का नया सिस्टम अलग GitHub repository, अलग Vercel project और अलग
          Neon database पर बनाया जा रहा है। अभी कोई पुराना प्रोजेक्ट या उसका डेटा
          इससे जुड़ा नहीं है।
        </p>
        <p>अगला चरण: सुरक्षित पहचान सत्यापन, अलग Super Admin प्रवेश, भूमिका-आधारित अनुमति और ऑडिट लॉग।</p>
        <p><a href="/login">यूजर लॉगिन</a>　|　<a href="/super-admin/login">Company Super Admin लॉगिन</a></p>
      </section>
    </main>
  );
}
