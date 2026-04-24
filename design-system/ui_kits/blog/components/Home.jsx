/* Home — hero + nav cards (/ route). */

/* Iteration-mark ゝ component — OWNS both rest and hover states entirely
   inside its SVG. The SVG is absolutely positioned over a width-reserving
   transparent ゝ (so kerning of neighboring kana is natural). Rest: filled
   ゝ at 30% opacity, stroke invisible. Hover: filled ゝ fades out while
   stroked ゝ draws itself in with a gradient. The component must NOT be
   nested inside a gradient-clip parent, or the layout ゝ gets clipped. */
const IterationMark = ({ trigger }) => {
  const [played, setPlayed] = React.useState(false);
  const [hovered, setHovered] = React.useState(false);
  const strokeRef = React.useRef(null);

  const DASH = 260;

  React.useEffect(() => {
    if (!trigger) return;
    setHovered(true);
    if (played) return;
    const el = strokeRef.current;
    if (!el) return;
    el.style.strokeDasharray = DASH;
    el.style.strokeDashoffset = DASH;
    requestAnimationFrame(() => {
      el.style.transition = "stroke-dashoffset 0.9s cubic-bezier(0.65, 0, 0.35, 1)";
      el.style.strokeDashoffset = 0;
    });
    setPlayed(true);
  }, [trigger, played]);

  const textProps = {
    x: "50", y: "78", textAnchor: "middle",
    fontFamily: '"Hiragino Kaku Gothic ProN","Yu Gothic","Meiryo",sans-serif',
    fontSize: "96", fontWeight: "800",
  };

  return (
    <span style={{ position: "relative", display: "inline-block", WebkitTextFillColor: "initial", color: "currentColor" }}>
      {/* Width-reserving, fully transparent ゝ (preserves kerning) */}
      <span style={{ color: "transparent" }}>ゝ</span>
      <svg aria-hidden="true" viewBox="0 0 100 100" preserveAspectRatio="xMidYMid meet"
           style={{ position: "absolute", inset: 0, width: "100%", height: "100%", overflow: "visible", pointerEvents: "none" }}>
        <defs>
          <linearGradient id="iter-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#2563eb" />
            <stop offset="100%" stopColor="#7c3aed" />
          </linearGradient>
        </defs>
        {/* Rest state: filled ゝ, faint; fades out on hover */}
        <text {...textProps}
              fill="#2563eb"
              style={{ opacity: hovered ? 0 : 0.3, transition: "opacity 0.3s ease" }}>
          ゝ
        </text>
        {/* Hover state: stroked ゝ, draws itself in */}
        <text {...textProps} ref={strokeRef}
              fill="none" stroke="url(#iter-grad)" strokeWidth="4"
              strokeLinecap="round" strokeLinejoin="round"
              style={{ strokeDasharray: DASH, strokeDashoffset: DASH }}>
          ゝ
        </text>
      </svg>
    </span>
  );
};

const HeroTitle = () => {
  const [hover, setHover] = React.useState(false);
  const gradStyle = { background: "linear-gradient(135deg,#2563eb,#7c3aed)", WebkitBackgroundClip: "text", backgroundClip: "text", WebkitTextFillColor: "transparent" };
  return (
    <h1 onMouseEnter={() => setHover(true)}
        style={{ fontSize: "clamp(2.5em, 7vw, 4.5em)", fontWeight: 800, lineHeight: 1.1, margin: "0 0 0.5em", color: "var(--text-primary)", letterSpacing: "-0.03em", cursor: "default" }}>
      個人開発の<span style={gradStyle}>す</span><IterationMark trigger={hover} /><span style={gradStyle}>め</span>
    </h1>
  );
};

const HeroDecoration = () => (
  <div aria-hidden="true" style={{ position: "absolute", right: -80, top: "50%", transform: "translateY(-50%)", width: 500, height: 500, pointerEvents: "none" }}>
    {[
      { size: 200, color: "rgba(249,115,22,0.15)" },
      { size: 320, color: "rgba(249,115,22,0.10)" },
      { size: 440, color: "rgba(249,115,22,0.05)" },
    ].map((r, i) => (
      <div key={i} style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: r.size, height: r.size, borderRadius: "50%", border: `1px solid ${r.color}` }} />
    ))}
    <div style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)", width: 8, height: 8, borderRadius: "50%", background: "var(--warm)", boxShadow: "0 0 22px rgba(249,115,22,0.55)" }} />
  </div>
);

const NavCard = ({ icon, title, description, tags, onClick }) => {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      onClick={(e) => { e.preventDefault(); onClick(); }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        display: "flex", flexDirection: "column", padding: "1.75em",
        background: "var(--bg-card)",
        border: `1px solid ${hover ? "rgba(37,99,235,0.4)" : "var(--border-color)"}`,
        borderRadius: 16, textDecoration: "none", color: "inherit",
        transition: "all 0.25s ease", cursor: "pointer", position: "relative", overflow: "hidden",
        transform: hover ? "translateY(-3px)" : "none",
        boxShadow: hover ? "0 12px 40px rgba(0,0,0,0.1), 0 0 0 1px rgba(37,99,235,0.1)" : "none",
      }}
    >
      {hover && <div style={{ position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(37,99,235,0.03) 0%, transparent 60%)", pointerEvents: "none" }} />}
      <IconChip size={52} radius={12}>{icon}</IconChip>
      <div style={{ flex: 1, marginTop: "1.25em", position: "relative" }}>
        <h3 style={{ fontSize: "1.15em", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 0.5em" }}>{title}</h3>
        <p style={{ fontSize: "0.85em", color: "var(--text-secondary)", lineHeight: 1.7, margin: "0 0 1.25em" }}>{description}</p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "0.4em" }}>{tags.map((t) => <Tag key={t}>{t}</Tag>)}</div>
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", color: hover ? "var(--accent)" : "var(--text-muted)", marginTop: "1.25em", transform: hover ? "translateX(4px)" : "none", transition: "all 0.2s ease", position: "relative" }}>
        <IconArrowRight size={20} />
      </div>
    </a>
  );
};

const Home = ({ navigate }) => (
  <main style={{ width: "100%", maxWidth: 1000, margin: "0 auto", padding: "0 1.5em" }}>
    <section style={{ position: "relative", padding: "5em 0 4em", overflow: "hidden" }}>
      <div style={{ position: "relative", zIndex: 1, maxWidth: 640 }}>
        <Eyebrow>Personal Dev Journal</Eyebrow>
        <HeroTitle />
        <p style={{ fontSize: "1.1em", color: "var(--text-secondary)", lineHeight: 1.8, marginBottom: "2em" }}>
          コードを書き、思考を記録し、日々を綴る。<br />アイデアを形にする過程を、ここに残していく。
        </p>
        <div style={{ display: "flex", gap: "1em", flexWrap: "wrap" }}>
          <Button variant="primary" href="#" onClick={(e) => { e.preventDefault(); navigate("/works"); }}>制作物を見る</Button>
          <Button variant="secondary" href="#" onClick={(e) => { e.preventDefault(); navigate("/blog"); }}>記事を読む</Button>
          <Button variant="secondary" href="#" onClick={(e) => { e.preventDefault(); navigate("/diary"); }}>日記を見る</Button>
        </div>
      </div>
      <HeroDecoration />
    </section>

    <section style={{ padding: "2em 0 5em" }}>
      <SectionLabel>コンテンツ</SectionLabel>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: "1.25em" }}>
        <NavCard icon={<IconMonitor size={28} />} title="成果物置き場"
          description="これまで作ったWebアプリ・ツールを一覧で紹介。使った技術スタックや開発背景も合わせて記録。"
          tags={["Web App", "CLI Tool", "OSS"]} onClick={() => navigate("/works")} />
        <NavCard icon={<IconFileText size={28} />} title="開発記録の日記"
          description="技術メモ、学習記録、開発日誌。試行錯誤の軌跡をMarkdownで残していく場所。"
          tags={["技術メモ", "学習記録", "開発日誌"]} onClick={() => navigate("/blog")} />
        <NavCard icon={<IconBookOpen size={28} />} title="日常の日記"
          description="日々の気づき、思考の断片、日常の出来事。技術とは関係なく、ただ言葉を残したい日のために。"
          tags={["日常", "気づき", "振り返り"]} onClick={() => navigate("/diary")} />
      </div>
    </section>
  </main>
);

Object.assign(window, { Home });
