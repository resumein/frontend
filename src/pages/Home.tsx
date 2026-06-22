import Navbar from '../components/Navbar';

export default function HomePage() {
  const handleLogin = () => {
    window.location.href = `https://github.com/login/oauth/authorize?client_id=Ov23liNS8d2pIPvcG6pO&scope=read:user user:email`;
  };

  return (
    <>
      <Navbar />
      <main className="hero">
        <h1>Simple. Fast. ATS Ready.</h1>
        <p>
          Create professional resumes in minutes with a clean, developer-friendly and open-source resume builder.
        </p>
        <div>
          <button onClick={handleLogin} className="btn-cta">
            Start Building
          </button>
        </div>
      </main>
    </>
  );
}