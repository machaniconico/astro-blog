import { readFile } from 'node:fs/promises';

/**
 * ワークフロー定義の本来の置き場所は .github/workflows/。
 * トークンのスコープの都合で docs/workflows/ に仮置きされている間もテストが通るよう、
 * どちらからでも読めるようにしてある（docs/workflows/README.md を参照）。
 */
const LOCATIONS = ['.github/workflows', 'docs/workflows'];

export async function readWorkflow(fileName) {
	for (const location of LOCATIONS) {
		try {
			return await readFile(new URL(`../../${location}/${fileName}`, import.meta.url), 'utf8');
		} catch (error) {
			if (error.code !== 'ENOENT') throw error;
		}
	}
	throw new Error(`${fileName} が ${LOCATIONS.join(' / ')} のどこにも見つかりません`);
}
