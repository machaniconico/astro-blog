/* Small reusable UI primitives. */

const Eyebrow = ({ children }) => (
  <p style={{ fontSize: "0.8em", letterSpacing: "0.2em", textTransform: "uppercase", color: "var(--accent)", margin: "0 0 0.8em", fontWeight: 600 }}>{children}</p>
);

const SectionLabel = ({ children }) => (
  <p style={{ fontSize: "0.75em", letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--text-muted)", margin: "0 0 1.5em", fontWeight: 600 }}>{children}</p>
);

const Button = ({ variant = "primary", href, onClick, children }) => {
  const base = { display: "inline-block", padding: "0.65em 1.5em", borderRadius: 8, fontWeight: 600, fontSize: "0.95em", textDecoration: "none", transition: "all 0.2s ease", border: "none", cursor: "pointer", fontFamily: "inherit" };
  const primary = { background: "var(--accent)", color: "#fff", boxShadow: "0 0 20px rgba(37,99,235,0.25)" };
  const secondary = { background: "transparent", color: "var(--text-secondary)", border: "1px solid var(--border-color)" };
  const style = { ...base, ...(variant === "primary" ? primary : secondary) };
  const onEnter = (e) => {
    if (variant === "primary") { e.currentTarget.style.background = "#1d4ed8"; e.currentTarget.style.boxShadow = "0 0 28px rgba(37,99,235,0.35)"; e.currentTarget.style.transform = "translateY(-1px)"; }
    else { e.currentTarget.style.borderColor = "var(--accent)"; e.currentTarget.style.color = "var(--accent)"; e.currentTarget.style.background = "rgba(37,99,235,0.05)"; }
  };
  const onLeave = (e) => {
    if (variant === "primary") { e.currentTarget.style.background = "var(--accent)"; e.currentTarget.style.boxShadow = "0 0 20px rgba(37,99,235,0.25)"; e.currentTarget.style.transform = "none"; }
    else { e.currentTarget.style.borderColor = "var(--border-color)"; e.currentTarget.style.color = "var(--text-secondary)"; e.currentTarget.style.background = "transparent"; }
  };
  return <a href={href} onClick={onClick} style={style} onMouseEnter={onEnter} onMouseLeave={onLeave}>{children}</a>;
};

const Tag = ({ children, variant = "muted" }) => {
  const base = { fontSize: "0.7em", padding: "0.25em 0.65em", background: "rgba(37,99,235,0.06)", borderRadius: 20, letterSpacing: "0.02em", display: "inline-block" };
  const muted = { border: "1px solid rgba(37,99,235,0.12)", color: "var(--text-muted)" };
  const accent = { border: "1px solid rgba(37,99,235,0.15)", color: "var(--accent)", fontWeight: 500 };
  return <span style={{ ...base, ...(variant === "accent" ? accent : muted) }}>{children}</span>;
};

const IconChip = ({ size = 52, radius = 12, children }) => (
  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", width: size, height: size, background: "rgba(37,99,235,0.07)", border: "1px solid rgba(37,99,235,0.15)", borderRadius: radius, color: "var(--accent)", flexShrink: 0 }}>{children}</div>
);

const FormattedDate = ({ date }) => {
  const d = date instanceof Date ? date : new Date(date);
  const formatted = d.toLocaleDateString("en-us", { year: "numeric", month: "short", day: "numeric" });
  return <time dateTime={d.toISOString()}>{formatted}</time>;
};

Object.assign(window, { Eyebrow, SectionLabel, Button, Tag, IconChip, FormattedDate });
