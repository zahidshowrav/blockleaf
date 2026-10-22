/**
 * Fails if a published package's version is written out where it will go
 * stale.
 *
 * The comparisons table claimed `@blockleaf/editor@0.0.5` for five releases
 * because nothing checked. Two rules, because the two kinds of file have
 * different options:
 *
 * - `apps/docs/content` can render `<PackageVersion />`, so a literal there
 *   is simply banned.
 * - `README.md` and `docs/` are plain Markdown with no way to interpolate, so
 *   a literal is allowed but must match what the manifests say today.
 *
 * In practice that second rule means: do not name a current version in either
 * of them. `progress-tracker.md` did, and because the release pull request is
 * the thing that moves the manifests, this check turned every release red
 * until somebody hand-edited a snapshot line. Link to npm instead — a
 * sentence that has to be rewritten on every publish is one that will not be.
 *
 * Only the `@blockleaf/<pkg>@<version>` form is matched. A version in a
 * sentence about the past — "the exemption expired when `0.1.0` was
 * published" — is a fact rather than a claim about now, and is left alone.
 */
import { readFile, readdir } from 'node:fs/promises';
import { dirname, extname, join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const packages = ['editor', 'renderer'] as const;

const SPEC = /@blockleaf\/(editor|renderer)@([0-9][0-9A-Za-z.-]*)/g;

const versions = async (): Promise<Record<string, string>> => {
	const entries = await Promise.all(
		packages.map(async (name) => {
			const manifest: unknown = JSON.parse(
				await readFile(
					join(repoRoot, 'packages', name, 'package.json'),
					'utf8'
				)
			);
			const { version } = manifest as { version: string };
			return [name, version] as const;
		})
	);
	return Object.fromEntries(entries);
};

const walk = async (dir: string): Promise<string[]> => {
	const found: string[] = [];
	for (const entry of await readdir(dir, { withFileTypes: true })) {
		if (entry.name === 'node_modules' || entry.name.startsWith('.')) {
			continue;
		}
		const path = join(dir, entry.name);
		if (entry.isDirectory()) {
			found.push(...(await walk(path)));
		} else if (['.md', '.mdx'].includes(extname(entry.name))) {
			found.push(path);
		}
	}
	return found;
};

type Problem = { file: string; line: number; found: string; why: string };

const check = async (): Promise<Problem[]> => {
	const current = await versions();
	const banned = await walk(join(repoRoot, 'apps', 'docs', 'content'));
	const verified = [
		join(repoRoot, 'README.md'),
		...(await walk(join(repoRoot, 'docs')))
	];
	const problems: Problem[] = [];

	for (const file of [...banned, ...verified]) {
		const mustInterpolate = banned.includes(file);
		const lines = (await readFile(file, 'utf8')).split('\n');

		for (const [index, line] of lines.entries()) {
			for (const match of line.matchAll(SPEC)) {
				const [found, name, version] = match;
				if (mustInterpolate) {
					problems.push({
						file: relative(repoRoot, file),
						line: index + 1,
						found,
						why: 'use <PackageVersion /> here, not a literal'
					});
				} else if (version !== current[name as string]) {
					problems.push({
						file: relative(repoRoot, file),
						line: index + 1,
						found,
						why: `the manifest says ${current[name as string]}`
					});
				}
			}
		}
	}

	return problems;
};

const problems = await check();

if (problems.length === 0) {
	console.log('✔ no stale package versions in the docs');
} else {
	for (const problem of problems) {
		console.error(
			`${problem.file}:${problem.line}  ${problem.found} — ${problem.why}`
		);
	}
	console.error(`\n${problems.length} stale or hard-coded version(s).`);
	process.exitCode = 1;
}
