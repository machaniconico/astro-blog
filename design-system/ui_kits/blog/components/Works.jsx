/* Works — portfolio grid (/works route). */

const LiveDemoLink = ({ href }) => {
  const [h, setH] = React.useState(false);
  return (
    <a href={href} target="_blank" rel="noreferrer"
       onMouseEnter={() => setH(true)} onMouseLeave={() => setH(false)}
       style={{ display: "inline-flex", alignItems: "center", gap: "0.4em", padding: "0.45em 1em", borderRadius: 8, fontSize: "0.8em", fontWeight: 600, textDecoration: "none", color: "#fff", transition: "background 0.25s ease, box-shadow 0.25s ease", background: h ? "var(--warm-dark)" : "var(--warm)", boxShadow: h ? "var(--shadow-glow-warm-hover)" : "var(--shadow-glow-warm)" }}>
      <IconExternal size={14} />Live Demo
    </a>
  );
};

const WorkCard = ({ work }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <article
      onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{
        background: "var(--bg-card)",
        border: `1px solid ${hover ? "rgba(37,99,235,0.4)" : "var(--border-color)"}`,
        borderRadius: 16, padding: "1.75em", display: "flex", flexDirection: "column",
        transition: "all 0.25s ease",
        transform: hover ? "translateY(-3px)" : "none",
        boxShadow: hover ? "0 12px 40px rgba(0,0,0,0.1)" : "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1em" }}>
        <IconChip size={42} radius={10}><IconMonitor size={22} /></IconChip>
        <time style={{ fontSize: "0.75em", color: "var(--text-muted)" }}><FormattedDate date={work.pubDate} /></time>
      </div>
      <h2 style={{ fontSize: "1.15em", fontWeight: 700, margin: "0 0 0.6em", color: "var(--text-primary)", lineHeight: 1.3 }}>{work.title}</h2>
      <p style={{ fontSize: "0.85em", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1.25em", flex: 1 }}>{work.description}</p>
      <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4em", marginBottom: "1.25em" }}>
        {work.techStack.map((t) => <Tag key={t} variant="accent">{t}</Tag>)}
      </div>
      <div style={{ display: "flex", gap: "0.75em", flexWrap: "wrap" }}>
        {work.liveUrl && <LiveDemoLink href={work.liveUrl} />}
        {work.githubUrl && (
          <a href={work.githubUrl} target="_blank" rel="noreferrer"
             style={{ display: "inline-flex", alignItems: "center", gap: "0.4em", padding: "0.45em 1em", borderRadius: 8, fontSize: "0.8em", fontWeight: 600, textDecoration: "none", background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-color)" }}>
            <IconGithubLucide size={14} />GitHub
          </a>
        )}
      </div>
    </article>
  );
};

const Works = ({ works }) => (
  <main style={{ width: "100%", maxWidth: 1000, margin: "0 auto", padding: "0 1.5em 5em" }}>
    <div style={{ padding: "4em 0 3em", borderBottom: "1px solid var(--border-color)", marginBottom: "3em" }}>
      <p style={{ fontSize: "0.75em", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 0.5em", fontWeight: 600 }}>Portfolio</p>
      <h1 style={{ fontSize: "2.5em", fontWeight: 800, margin: "0 0 0.4em", letterSpacing: "-0.03em" }}>成果物置き場</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "1em", margin: 0 }}>これまでに作ったWebアプリ、ツール、OSSプロジェクトを紹介します。</p>
    </div>
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "1.5em" }}>
      {works.map((w) => <WorkCard key={w.id} work={w} />)}
    </div>
  </main>
);

Object.assign(window, { Works });
