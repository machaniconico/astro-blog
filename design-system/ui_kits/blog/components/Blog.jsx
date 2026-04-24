/* Blog — editorial feed (/blog route). First post spans full width. */

const Blog = ({ posts, navigate }) => (
  <main style={{ width: "100%", maxWidth: 1000, margin: "0 auto", padding: "0 1.5em 5em" }}>
    <div style={{ padding: "4em 0 3em", borderBottom: "1px solid var(--border-color)", marginBottom: "3em" }}>
      <p style={{ fontSize: "0.75em", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 0.5em", fontWeight: 600 }}>Dev Journal</p>
      <h1 style={{ fontSize: "2.5em", fontWeight: 800, margin: "0 0 0.4em", letterSpacing: "-0.03em" }}>開発記録の日記</h1>
      <p style={{ color: "var(--text-secondary)", fontSize: "1em", margin: 0 }}>技術メモ、学習記録、開発日誌。試行錯誤の軌跡をMarkdownで残していく。</p>
    </div>
    <ul style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", listStyle: "none", margin: 0, padding: 0 }}>
      {posts.map((p, i) => {
        const first = i === 0;
        const [hover, setHover] = React.useState ? React.useState(false) : [false, () => {}];
        return (
          <li key={p.id} style={{ width: first ? "100%" : "calc(50% - 0.75rem)", marginBottom: first ? "0.5rem" : 0 }}>
            <a onClick={(e) => { e.preventDefault(); navigate(`/blog/${p.id}`); }}
               style={{ display: "block", textDecoration: "none", cursor: "pointer" }}>
              <img src={p.heroImage} alt="" style={{ width: "100%", marginBottom: "0.5rem", borderRadius: 12, border: "1px solid var(--border-color)", display: "block", aspectRatio: first ? "2 / 1" : "2 / 1", objectFit: "cover" }} />
              <h4 style={{ margin: 0, color: "var(--text-primary)", lineHeight: 1.2, fontSize: first ? "1.8rem" : "1.25rem", fontWeight: 700 }}>{p.title}</h4>
              <p style={{ margin: "0.3em 0 0", color: "var(--text-muted)", fontSize: "0.8em" }}><FormattedDate date={p.pubDate} /></p>
            </a>
          </li>
        );
      })}
    </ul>
  </main>
);

Object.assign(window, { Blog });
