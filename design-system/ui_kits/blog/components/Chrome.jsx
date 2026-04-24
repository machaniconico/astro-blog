/* Chrome — Header + Footer. */

/* Pencil-tip lockup mark — stands in for the missing logo.
   Shaft + collar at currentColor; graphite tip in accent blue.
   Tilted 45° so it reads as an icon, not a numeric "1". */
const PencilMark = ({ size = 22 }) => (
  <svg viewBox="0 0 24 24" width={size} height={size} fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    {/* wooden shaft */}
    <path d="M4 20 L14 10 L18 14 L8 24 Z" transform="translate(-1 -4)" />
    {/* metal collar */}
    <path d="M14 10 L18 14" transform="translate(-1 -4)" />
    {/* graphite tip — accent */}
    <path d="M2 21 L4 19 L8 23 Z" transform="translate(-1 -4)" fill="#2563eb" stroke="none" />
  </svg>
);

const Wordmark = ({ onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <a onClick={onClick}
       onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
       style={{ textDecoration: "none", color: "#0f172a", fontWeight: 700, letterSpacing: "-0.02em", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: "0.55em" }}>
      <span style={{ display: "inline-flex", color: "#334155", transform: hover ? "rotate(-8deg)" : "none", transition: "transform 0.25s cubic-bezier(0.34,1.56,0.64,1)" }}>
        <PencilMark size={22} />
      </span>
      <span>個人開発のすゝめ</span>
    </a>
  );
};

const NavLink = ({ route, current, label, navigate }) => {
  const [hover, setHover] = React.useState(false);
  const active = current === route || (route !== "/" && current.startsWith(route));
  const style = {
    padding: "0.5em 0.6em",
    color: active || hover ? "#0f172a" : "#64748b",
    borderBottom: `3px solid ${active ? "#2563eb" : "transparent"}`,
    textDecoration: "none",
    fontSize: "0.9em",
    transition: "color 0.2s ease",
    cursor: "pointer",
  };
  return <a style={style} onClick={(e) => { e.preventDefault(); navigate(route); }} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}>{label}</a>;
};

const Header = ({ current, navigate }) => (
  <header style={{ padding: "0 1.5em", background: "rgba(255,255,255,0.92)", backdropFilter: "blur(12px)", WebkitBackdropFilter: "blur(12px)", borderBottom: "1px solid rgba(0,0,0,0.08)", position: "sticky", top: 0, zIndex: 100 }}>
    <nav style={{ display: "flex", alignItems: "center", justifyContent: "space-between", height: 60, maxWidth: 1000, margin: "0 auto" }}>
      <h2 style={{ margin: 0, fontSize: "1em" }}>
        <Wordmark onClick={(e) => { e.preventDefault(); navigate("/"); }} />
      </h2>
      <div style={{ display: "flex" }}>
        <NavLink route="/" current={current} label="Home" navigate={navigate} />
        <NavLink route="/works" current={current} label="Works" navigate={navigate} />
        <NavLink route="/blog" current={current} label="Blog" navigate={navigate} />
        <NavLink route="/diary" current={current} label="Diary" navigate={navigate} />
      </div>
      <div style={{ display: "flex", alignItems: "center" }}>
        <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: "#64748b", padding: "0.4em", display: "flex" }}>
          <span className="sr-only">GitHub</span><IconGithubMark size={28} />
        </a>
      </div>
    </nav>
  </header>
);

const Footer = () => (
  <footer style={{ borderTop: "1px solid rgba(0,0,0,0.08)", padding: "2em 1.5em", background: "rgba(248,250,252,0.95)" }}>
    <div style={{ maxWidth: 1000, margin: "0 auto", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <p style={{ fontSize: "0.8em", color: "var(--text-muted)", margin: 0, display: "inline-flex", alignItems: "center", gap: "0.55em" }}>
        <span style={{ color: "#94a3b8", display: "inline-flex" }}><PencilMark size={16} /></span>
        © {new Date().getFullYear()} 個人開発のすゝめ. All rights reserved.
      </p>
      <div style={{ display: "flex", gap: "0.75em" }}>
        <a href="https://github.com" target="_blank" rel="noreferrer" style={{ color: "var(--text-muted)" }}><IconGithubMark size={22} /></a>
      </div>
    </div>
  </footer>
);

Object.assign(window, { Header, Footer, PencilMark, Wordmark });
