/* Post reading view — used by both /blog/[slug] and /diary/[slug]. */

const Post = ({ post, kind, navigate }) => (
  <main style={{ width: "calc(100% - 2em)", maxWidth: "100%", margin: 0 }}>
    <article>
      {kind === "blog" && post.heroImage && (
        <div style={{ width: "100%" }}>
          <img src={post.heroImage} alt="" style={{ display: "block", margin: "0 auto", borderRadius: 12, maxWidth: 1020, width: "100%", boxShadow: "0 2px 6px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.05), 0 16px 32px rgba(0,0,0,0.04)" }} />
        </div>
      )}
      <div style={{ width: "clamp(60ch, 50vw, 72ch)", maxWidth: "calc(100% - 2em)", margin: "auto", padding: kind === "diary" ? "3em 1em 5em" : "1em", color: "var(--text-primary)" }}>
        {kind === "diary" && (
          <a onClick={(e) => { e.preventDefault(); navigate("/diary"); }} style={{ display: "inline-flex", alignItems: "center", gap: "0.4em", fontSize: "0.8em", color: "var(--text-muted)", textDecoration: "none", marginBottom: "1.5em", cursor: "pointer" }}>
            <IconArrowLeft size={14} />日常の日記
          </a>
        )}
        {kind === "diary" && (
          <div style={{ display: "flex", alignItems: "center", gap: "0.75em", marginBottom: "0.75em", fontSize: "0.85em", color: "var(--text-muted)", flexWrap: "wrap" }}>
            <FormattedDate date={post.pubDate} />
            {post.tags && post.tags.length > 0 && (
              <div style={{ display: "flex", gap: "0.4em" }}>
                {post.tags.map((t) => (
                  <span key={t} style={{ fontSize: "0.75em", padding: "0.2em 0.6em", background: "rgba(79,156,249,0.08)", border: "1px solid rgba(79,156,249,0.15)", borderRadius: 20, color: "var(--text-muted)" }}>{t}</span>
                ))}
              </div>
            )}
          </div>
        )}
        <div style={{ textAlign: kind === "blog" ? "center" : "left", padding: kind === "blog" ? "1em 0" : 0, marginBottom: "1em", lineHeight: 1 }}>
          {kind === "blog" && (
            <div style={{ marginBottom: "0.5em", color: "var(--text-muted)", fontSize: "0.85em" }}>
              <FormattedDate date={post.pubDate} />
            </div>
          )}
          <h1 style={{ margin: "0 0 0.75em", fontSize: "2.2em", fontWeight: 800, letterSpacing: "-0.03em", lineHeight: 1.2 }}>{post.title}</h1>
          <hr style={{ border: "none", borderTop: "1px solid var(--border-color)", margin: "0 0 2em" }} />
        </div>
        <div style={{ lineHeight: 1.85, fontSize: "1.02em" }}>
          {post.body.map((para, i) => <p key={i} style={{ marginBottom: "2.4em" }}>{para}</p>)}
        </div>
      </div>
    </article>
  </main>
);

Object.assign(window, { Post });
