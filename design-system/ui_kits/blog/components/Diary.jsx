/* Diary — narrow single-column feed (/diary route). */

const DiaryCard = ({ entry, navigate }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <a onClick={(e) => { e.preventDefault(); navigate(`/diary/${entry.id}`); }}
       onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
       style={{
         display: "block", padding: "1.75em",
         background: "var(--bg-card)",
         border: `1px solid ${hover ? "rgba(37,99,235,0.4)" : "var(--border-color)"}`,
         borderRadius: 16, textDecoration: "none", color: "inherit",
         transition: "all 0.25s ease", cursor: "pointer",
         transform: hover ? "translateY(-2px)" : "none",
         boxShadow: hover ? "0 8px 30px rgba(0,0,0,0.1)" : "none",
       }}>
      <div style={{ display: "flex", alignItems: "center", gap: "0.75em", marginBottom: "0.75em", flexWrap: "wrap" }}>
        <time style={{ fontSize: "0.78em", color: "var(--text-muted)" }}><FormattedDate date={entry.pubDate} /></time>
        {entry.tags && entry.tags.length > 0 && (
          <div style={{ display: "flex", gap: "0.4em" }}>
            {entry.tags.map((t) => (
              <span key={t} style={{ fontSize: "0.68em", padding: "0.2em 0.6em", background: "rgba(37,99,235,0.06)", border: "1px solid rgba(37,99,235,0.12)", borderRadius: 20, color: "var(--text-muted)" }}>{t}</span>
            ))}
          </div>
        )}
      </div>
      <h2 style={{ fontSize: "1.2em", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.5em", lineHeight: 1.3 }}>{entry.title}</h2>
      <p style={{ fontSize: "0.88em", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1em" }}>{entry.description}</p>
      <span style={{ display: "inline-flex", alignItems: "center", gap: hover ? "0.5em" : "0.3em", fontSize: "0.8em", color: "var(--accent)", fontWeight: 600, transition: "gap 0.2s ease", position: "relative" }}>
        <span style={{ position: "relative", display: "inline-block" }}>
          続きを読む
          <span aria-hidden="true" style={{ position: "absolute", left: 0, right: 0, bottom: -2, height: 1, background: "linear-gradient(90deg,#2563eb,#7c3aed)", transformOrigin: "left center", transform: hover ? "scaleX(1)" : "scaleX(0)", transition: "transform 0.35s cubic-bezier(0.65,0,0.35,1)" }} />
        </span>
        <IconArrowRight size={14} />
      </span>
    </a>
  );
};

const Diary = ({ entries, navigate }) => (
  <main style={{ width: "100%", maxWidth: 760, margin: "0 auto", padding: "0 1.5em 5em" }}>
    <div style={{ padding: "4em 0 3em", borderBottom: "1px solid var(--border-color)", marginBottom: "3em" }}>
      <p style={{ fontSize: "0.75em", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 0.5em", fontWeight: 600 }}>Daily Life</p>
      <h1 style={{ fontSize: "2.5em", fontWeight: 800, margin: "0 0 0.4em", letterSpacing: "-0.03em" }}>日常の日記</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "1em", margin: 0 }}>日々の気づき、思考の断片、日常の出来事。技術とは関係なく、ただ言葉を残したい日のために。</p>
    </div>
    <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "flex", flexDirection: "column", gap: "1em" }}>
      {entries.map((e) => <li key={e.id}><DiaryCard entry={e} navigate={navigate} /></li>)}
    </ul>
  </main>
);

Object.assign(window, { Diary });
