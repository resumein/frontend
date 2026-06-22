export default function HomePage() {
    const handleLogin = () => {
        window.location.href = `https://github.com/login/oauth/authorize?client_id=Ov23liNS8d2pIPvcG6pO&scope=read:user user:email`;
    };

  return (
    <main>
      <section className="hero-section">
        <h1>resume.vishok.in</h1>
        <button className="cta-button" onClick={handleLogin}>Login</button>
      </section>
      
      {/* Other landing page sections (Features, Pricing, etc.) can go below */}
    </main>
  );
}