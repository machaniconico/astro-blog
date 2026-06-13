// 雑談配信のネタを分類するカテゴリ定義
export interface Category {
	/** URL やデータの識別子に使う英数字スラッグ */
	id: string;
	/** 画面に表示する日本語名 */
	name: string;
	/** カードなどに添える絵文字 */
	emoji: string;
	/** カテゴリの説明（一覧やメタ情報に使う） */
	description: string;
	/** アクセントカラー（CSS のカスタムプロパティに流し込む） */
	color: string;
}

export const categories: Category[] = [
	{
		id: 'daily',
		name: '日常・あるある',
		emoji: '🏠',
		description: '誰もが「わかる」と頷ける、暮らしの中のあるあるネタ。',
		color: '#f59e0b',
	},
	{
		id: 'food',
		name: '食べ物・グルメ',
		emoji: '🍜',
		description: '好きな食べ物から食の小さなこだわりまで、盛り上がる鉄板テーマ。',
		color: '#ef4444',
	},
	{
		id: 'hobby',
		name: '趣味・エンタメ',
		emoji: '🎬',
		description: '映画・音楽・読書など、夢中になっているものを語るネタ。',
		color: '#8b5cf6',
	},
	{
		id: 'game',
		name: 'ゲーム',
		emoji: '🎮',
		description: '思い出のゲームから最近ハマっているタイトルまで。',
		color: '#22c55e',
	},
	{
		id: 'anime',
		name: 'アニメ・漫画',
		emoji: '📺',
		description: '推し作品・推しキャラについて熱く語れるネタ。',
		color: '#ec4899',
	},
	{
		id: 'travel',
		name: '旅行・お出かけ',
		emoji: '✈️',
		description: '行った場所・行きたい場所、お出かけの思い出を共有。',
		color: '#06b6d4',
	},
	{
		id: 'love',
		name: '恋愛・人間関係',
		emoji: '💬',
		description: '恋バナや友達付き合いなど、距離が縮まる話題。',
		color: '#fb7185',
	},
	{
		id: 'work',
		name: '仕事・学校',
		emoji: '🏫',
		description: '学生時代や仕事の話。共感とツッコミが生まれやすい。',
		color: '#3b82f6',
	},
	{
		id: 'season',
		name: '季節・イベント',
		emoji: '🎏',
		description: '季節の行事やイベントにまつわる、その時期ならではのネタ。',
		color: '#14b8a6',
	},
	{
		id: 'memory',
		name: '子供の頃・思い出',
		emoji: '🎒',
		description: '懐かしさで盛り上がる、子供の頃の思い出ネタ。',
		color: '#a3a635',
	},
	{
		id: 'ifthen',
		name: 'もしも・妄想',
		emoji: '🪄',
		description: '「もし〜だったら？」で想像力が膨らむ妄想トーク。',
		color: '#6366f1',
	},
	{
		id: 'money',
		name: 'お金・節約',
		emoji: '💰',
		description: '買ってよかったもの、節約術など、お金まわりの話題。',
		color: '#eab308',
	},
	{
		id: 'health',
		name: '健康・美容',
		emoji: '🌿',
		description: '運動・睡眠・スキンケアなど、体と向き合うネタ。',
		color: '#10b981',
	},
	{
		id: 'tech',
		name: 'テクノロジー・ガジェット',
		emoji: '⚙️',
		description: 'ガジェット・アプリ・最新技術についてのネタ。',
		color: '#64748b',
	},
	{
		id: 'audience',
		name: '視聴者参加・アンケート',
		emoji: '🙋',
		description: 'コメントで答えてもらいやすい、視聴者参加型の質問ネタ。',
		color: '#f97316',
	},
];

export const categoryMap: Record<string, Category> = Object.fromEntries(
	categories.map((c) => [c.id, c]),
);

export function getCategory(id: string): Category | undefined {
	return categoryMap[id];
}
