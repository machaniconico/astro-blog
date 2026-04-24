/* App shell + seed data + hash router. */

const WORKS = [
  { id: "music-theory-app", title: "Music Theory Lab", description: "インタラクティブにコード理論を学べるWebアプリ。音を鳴らしながらスケールやコードを視覚的に把握できる。", techStack: ["TypeScript", "React", "Web Audio API"], liveUrl: "#", githubUrl: "#", pubDate: "2026-02-14" },
  { id: "clip-extractor", title: "Clip Extractor", description: "YouTube配信アーカイブから切り抜きショート動画を自動生成するWebアプリ。盛り上がりを検出してクリップ化。", techStack: ["Python", "FFmpeg", "Next.js"], liveUrl: "#", githubUrl: "#", pubDate: "2026-01-22" },
  { id: "v-simple-editor", title: "V — Simple Video Editor", description: "Simple UI, full-featured video editor。C++とQt、FFmpegで書かれた軽量ビデオエディタ。", techStack: ["C++", "Qt", "FFmpeg"], githubUrl: "#", pubDate: "2025-12-05" },
  { id: "video-editor-app", title: "Mobile Video Editor", description: "iOS/Android向けの動画編集モバイルアプリ。トリミング、フィルター、BGMなどを直感的に。", techStack: ["React Native", "Expo"], liveUrl: "#", pubDate: "2025-11-10" },
  { id: "learn-apps", title: "Programming Learn Apps", description: "12言語対応のプログラミング学習アプリ・モノレポ。JS/TS, Python, C#, C++, Java ほか。", techStack: ["Monorepo", "TypeScript"], githubUrl: "#", pubDate: "2025-10-01" },
  { id: "slide-generator", title: "Slide Generator", description: "Markdownからきれいなスライドを生成する小さなツール。テーマ差し替え対応。", techStack: ["TypeScript", "Vite"], githubUrl: "#", pubDate: "2025-09-03" },
];

const POSTS = [
  { id: "using-mdx", title: "Using MDX", description: "MDXでブログを書き始めた話と設定メモ。", pubDate: "2024-06-01", heroImage: "../../assets/blog-placeholder-5.jpg",
    body: ["MDXはMarkdownの特別な方言で、JavaScriptとJSX構文を埋め込める。これにより、記事中にインタラクティブなUIコンポーネントを配置できるのが最大の魅力。", "Astroの@astrojs/mdxインテグレーションで有効化できる。本ブログもこの仕組みで動いている。", "実装してみた感想としては、MDXを使えばインタラクティブな技術解説が書きやすい。図解やグラフをそのまま記事に埋め込めるのはありがたい。"] },
  { id: "astro-content-collections", title: "Astro Content Collectionsで型安全な記事管理", description: "Zodスキーマでfrontmatterを型付けする方法。", pubDate: "2026-03-15", heroImage: "../../assets/blog-placeholder-2.jpg",
    body: ["Astroのcontent collectionsを使うと、Markdown/MDXの記事をZodでスキーマ定義できる。frontmatterのtypoを開発時に検出できるので安心。", "今回のブログではblog, diary, worksの3コレクションを用意した。ビルド時に型エラーが出るので、安心してスキーマを変更できる。"] },
  { id: "lighthouse-100", title: "Lighthouse 100点を取るまで", description: "フォントpreload、画像最適化、JS削減のメモ。", pubDate: "2026-02-20", heroImage: "../../assets/blog-placeholder-3.jpg",
    body: ["LCPとCLSの改善に効いた施策をまとめる。Atkinson Hyperlegibleをpreloadしておくだけで、初期描画のテキストがかなり安定する。", "Astroはデフォルトで必要最小限のJSしか送らないので、素のMarkdownページであればJSゼロが現実的。"] },
  { id: "slate-and-blue", title: "Slateと青だけで組むミニマルUI", description: "色数を絞ると迷いが減る、という話。", pubDate: "2026-01-18", heroImage: "../../assets/blog-placeholder-4.jpg",
    body: ["色を一色に絞ると、UIの「重み付け」が明快になる。アクセントの青はリンクと主要ボタンにだけ使う。残りは全てslateグレーで組む。", "結果、レイアウトの情報階層が整理され、読者の視線が自然に誘導される。"] },
];

const DIARY = [
  { id: "2026-03-29-hajimemashite", title: "初めまして", description: "初めましての挨拶", pubDate: "2026-03-30", tags: ["日記"],
    body: [
      "はじめまして！このサイトの管理人、まちゃと申します。",
      "趣味はゲーム配信と音楽鑑賞。コンテンツ制作やアプリ開発はこれから本格的にやっていきます。",
      "社畜として社会の歯車として生きるのに限界を感じて、AIを活用したアプリ開発と、Adobeのソフトをメインとしたコンテンツ制作を始めることにしました。その記録を残す場所として、このサイトを立ち上げました。",
      "テクノロジーに関する情報や、生活・健康に役立つライフハック、あとは一部の制作物なんかを投稿していけたらと思っています。",
      "スマホで稼いでPCを購入するための導線を増やしたいと思っているので、PC持ってない人にも役立つ情報を発信していくつもりです。",
      "応援よろしくお願いします！",
    ] },
  { id: "2026-04-05-asa-no-routine", title: "朝のルーティンを見直した", description: "早起きしてコードを書く時間を確保する話。", pubDate: "2026-04-05", tags: ["日常", "振り返り"],
    body: ["仕事前の1時間を確保できると、個人開発の進みが別次元になる。", "無理に早起きするより、夜を早めに切る方が自分には合っていた。"] },
  { id: "2026-04-12-machizukai", title: "街で見かけたUIメモ", description: "券売機のボタン配置で気づいたこと。", pubDate: "2026-04-12", tags: ["気づき"],
    body: ["よく使う選択肢ほど中心に寄せる。単純だけど徹底されているUIは気持ちいい。"] },
];

const useHashRoute = () => {
  const getRoute = () => (window.location.hash.replace(/^#/, "") || "/");
  const [route, setRoute] = React.useState(getRoute());
  React.useEffect(() => {
    const onHash = () => setRoute(getRoute());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);
  const navigate = (r) => { window.location.hash = r; window.scrollTo(0, 0); };
  return [route, navigate];
};

const App = () => {
  const [route, navigate] = useHashRoute();
  let body;
  if (route === "/" || route === "") {
    body = <Home navigate={navigate} />;
  } else if (route === "/works") {
    body = <Works works={WORKS} />;
  } else if (route === "/blog") {
    body = <Blog posts={POSTS} navigate={navigate} />;
  } else if (route === "/diary") {
    body = <Diary entries={DIARY} navigate={navigate} />;
  } else if (route.startsWith("/blog/")) {
    const slug = route.replace("/blog/", "");
    const p = POSTS.find((x) => x.id === slug);
    body = p ? <Post post={p} kind="blog" navigate={navigate} /> : <main style={{ padding: "4em 2em" }}>Not found.</main>;
  } else if (route.startsWith("/diary/")) {
    const slug = route.replace("/diary/", "");
    const e = DIARY.find((x) => x.id === slug);
    body = e ? <Post post={e} kind="diary" navigate={navigate} /> : <main style={{ padding: "4em 2em" }}>Not found.</main>;
  } else {
    body = <main style={{ padding: "4em 2em" }}>Not found.</main>;
  }
  return (
    <React.Fragment>
      <Header current={route} navigate={navigate} />
      {body}
      <Footer />
    </React.Fragment>
  );
};

ReactDOM.createRoot(document.getElementById("root")).render(<App />);
