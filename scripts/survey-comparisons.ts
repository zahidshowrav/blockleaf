/**
 * Re-reads the comparison table's figures from npm.
 *
 * `apps/docs/content/docs/comparisons.mdx` carries a version, a date and a
 * licence for every editor it compares Blockleaf against. Those go stale on
 * somebody else's release schedule, and the page is dated rather than live
 * precisely because the prose around the table is a judgement that does not
 * update itself.
 *
 * So this updates the figures and nothing else. Where a figure contradicts
 * something the prose claims — a project the page calls dormant publishing
 * again — it says so and leaves the sentence alone. That is a person's job.
 *
 * `pnpm survey:comparisons` rewrites the file.
 * `pnpm survey:comparisons --check` reports drift and exits 1, writing nothing.
 */
import { readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const page = join(
	repoRoot,
	'apps',
	'docs',
	'content',
	'docs',
	'comparisons.mdx'
);

/**
 * The packages the table names, and the repository behind each where the
 * prose makes a claim about activity.
 */
const projects = [
	{ name: '@tiptap/core', repo: 'ueberdosis/tiptap' },
	{ name: 'novel', repo: 'steven-tey/novel' },
	{ name: '@blocknote/core', repo: 'TypeCellOS/BlockNote' },
	{ name: '@editorjs/editorjs', repo: 'codex-team/editor.js' },
	{ name: 'lexical', repo: 'facebook/lexical' }
] as const;

const MONTHS = [
	'Jan',
	'Feb',
	'Mar',
	'Apr',
	'May',
	'Jun',
	'Jul',
	'Aug',
	'Sep',
	'Oct',
	'Nov',
	'Dec'
] as const;

type Release = { version: string; published: string; licence: string };

const fetchJson = async (url: string): Promise<unknown> => {
	const response = await fetch(url, {
		headers: { accept: 'application/json' }
	});
	if (!response.ok) {
		throw new Error(`${response.status} ${response.statusText} for ${url}`);
	}
	return response.json();
};

/** Reads the registry rather than shelling out to npm, so this needs no npm login. */
const latest = async (name: string): Promise<Release> => {
	const metadata = (await fetchJson(
		`https://registry.npmjs.org/${name.replace('/', '%2F')}`
	)) as {
		'dist-tags': { latest: string };
		time: Record<string, string>;
		versions: Record<string, { license?: string }>;
	};

	const version = metadata['dist-tags'].latest;
	const published = metadata.time[version];
	if (!published) throw new Error(`${name}@${version} has no publish date`);

	return {
		version,
		published,
		licence: metadata.versions[version]?.license ?? 'unknown'
	};
};

const lastPush = async (repo: string): Promise<string | null> => {
	try {
		const data = (await fetchJson(
			`https://api.github.com/repos/${repo}`
		)) as { pushed_at?: string };
		return data.pushed_at?.slice(0, 10) ?? null;
	} catch {
		// Unauthenticated GitHub is rate-limited, and a missing push date is
		// worth a blank line in the report rather than a failed survey.
		return null;
	}
};

const asMonth = (iso: string): string => {
	const date = new Date(iso);
	return `${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
};

const today = (): string => {
	const now = new Date();
	return `${now.getUTCDate()} ${
		[
			'January',
			'February',
			'March',
			'April',
			'May',
			'June',
			'July',
			'August',
			'September',
			'October',
			'November',
			'December'
		][now.getUTCMonth()]
	} ${now.getUTCFullYear()}`;
};

const escape = (value: string): string =>
	value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const main = async (): Promise<void> => {
	const checkOnly = process.argv.includes('--check');
	let source = await readFile(page, 'utf8');

	const changes: string[] = [];
	const notes: string[] = [];
	const activity: string[] = [];

	for (const project of projects) {
		const release = await latest(project.name);

		// Only the row's own `pkg@version`, Mon Year — the Blockleaf row is a
		// component and nothing here should touch it.
		const row = new RegExp(
			'`' +
				escape(project.name) +
				'@([0-9][^`]*)`, ([A-Z][a-z]{2} \\d{4})'
		);
		const found = source.match(row);

		if (!found) {
			notes.push(`${project.name}: no row found in the table`);
			continue;
		}

		const [, wasVersion, wasDate] = found;
		const nowDate = asMonth(release.published);

		if (wasVersion !== release.version || wasDate !== nowDate) {
			changes.push(
				`${project.name}: ${wasVersion} (${wasDate}) → ${release.version} (${nowDate})`
			);
			source = source.replace(
				row,
				'`' + project.name + '@' + release.version + '`, ' + nowDate
			);
		}

		// Scoped to this project's own row. Checking the whole file would pass
		// whenever any other row happened to carry the same licence, which is
		// exactly the relicence this is meant to catch.
		const rowText = source
			.split('\n')
			.find((line) => line.includes('`' + project.name + '@'));

		if (
			rowText &&
			release.licence !== 'unknown' &&
			!rowText.includes(release.licence)
		) {
			notes.push(
				`${project.name}: npm says ${release.licence}; its row does not say so`
			);
		}

		// The page calls Novel dormant. If it ships again, that paragraph is
		// wrong in a way no table edit fixes.
		const pushed = await lastPush(project.repo);
		if (pushed) {
			activity.push(`${project.name}: last push ${pushed}`);
		}
	}

	if (changes.length > 0) {
		source = source.replace(
			/<Callout title="Checked on [^"]+">/,
			`<Callout title="Checked on ${today()}">`
		);
	}

	// Activity is context, not a problem: the page argues about how actively
	// each project is maintained, and that argument is a sentence a person
	// wrote and only a person can revise.
	for (const line of activity) console.log(`activity  ${line}`);
	for (const note of notes) console.log(`CHECK     ${note}`);
	for (const change of changes) console.log(`moved     ${change}`);

	if (changes.length === 0) {
		console.log('\n✔ every figure in the comparison table is current');
		return;
	}

	if (checkOnly) {
		console.error(`\n${changes.length} figure(s) out of date.`);
		process.exitCode = 1;
		return;
	}

	await writeFile(page, source);
	console.log(`\n${changes.length} figure(s) updated in comparisons.mdx`);
};

await main();
