/**
 * Checks that what the repository claims is released is actually installable.
 *
 * Everything else compares the docs to the package manifests. Nothing
 * compared the manifests to npm — and on 2026-10-20 a publish failed with a
 * 409 while the manifests had already moved to `0.5.0`. It resolved itself,
 * but for a few minutes the site would have been advertising a version
 * nobody could install. That is the gap this closes.
 *
 * It is not run on every pull request: a feature branch is *expected* to sit
 * at an unreleased version while its changeset waits. It runs on a schedule,
 * against `main`, where the two should always agree.
 */
import { readFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const packages = ['editor', 'renderer'] as const;

const manifestVersion = async (name: string): Promise<string> => {
	const raw = await readFile(
		join(repoRoot, 'packages', name, 'package.json'),
		'utf8'
	);
	return (JSON.parse(raw) as { version: string }).version;
};

const publishedVersion = async (name: string): Promise<string> => {
	const response = await fetch(
		`https://registry.npmjs.org/@blockleaf%2F${name}`,
		{ headers: { accept: 'application/json' } }
	);
	if (!response.ok) {
		throw new Error(
			`${response.status} ${response.statusText} for @blockleaf/${name}`
		);
	}
	const metadata = (await response.json()) as {
		'dist-tags': { latest: string };
	};
	return metadata['dist-tags'].latest;
};

const problems: string[] = [];

for (const name of packages) {
	const [manifest, published] = await Promise.all([
		manifestVersion(name),
		publishedVersion(name)
	]);

	if (manifest === published) {
		console.log(`✔ @blockleaf/${name}  ${manifest} is live on npm`);
	} else {
		problems.push(
			`@blockleaf/${name}: this repository says ${manifest}, npm serves ${published}`
		);
	}
}

if (problems.length > 0) {
	console.error('');
	for (const problem of problems) console.error(problem);
	console.error(
		'\nA release did not land. Check the Release workflow before trusting anything the docs say about versions.'
	);
	process.exitCode = 1;
}
