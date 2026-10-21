/**
 * Measures the editor against a long document.
 *
 * Run with `pnpm perf`. It boots the sandbox, opens documents of several
 * sizes and times the three things a long document makes expensive: getting
 * it on screen, typing into it, and handing it back to the host.
 *
 * Numbers from one machine are not a budget — they are a before and after.
 * The e2e suite carries the regression ceiling; this is for deciding what to
 * change.
 */
import { chromium, type Page } from '@playwright/test';
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';

/** Not 5180 or 5181: those belong to Playwright and the GIF recorder. */
const port = 5182;
const origin = `http://localhost:${port}`;
const sizes = [100, 1_000, 5_000, 10_000];
const keystrokes = 20;

/** Generous on purpose: this is measuring, not asserting. */
const mountCeilingMs = 180_000;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');

const startSandbox = async (): Promise<ChildProcess> => {
	const child = spawn(
		'pnpm',
		['--filter', 'sandbox', 'dev', '--port', String(port)],
		{ cwd: repoRoot, stdio: 'ignore' }
	);

	const deadline = Date.now() + 60_000;
	while (Date.now() < deadline) {
		try {
			if ((await fetch(origin)).ok) return child;
		} catch {
			// Vite is not listening yet.
		}
		await wait(250);
	}

	child.kill();
	throw new Error(`The sandbox never came up on ${origin}.`);
};

type Measurement = {
	blocks: number;
	mountMs: number;
	keystrokeMs: number;
};

const measure = async (
	page: Page,
	blocks: number,
	suffix = ''
): Promise<Measurement> => {
	const started = Date.now();
	await page.goto(`${origin}/?blocks=${blocks}${suffix}`);
	await page
		.locator('.tiptap.ProseMirror p')
		.first()
		.waitFor({ timeout: mountCeilingMs });
	const mountMs = Date.now() - started;

	// Into the *first* block, so every position the editor maps has the whole
	// document ahead of it. Typing at the end is the flattering measurement.
	await page.locator('.tiptap.ProseMirror p').first().click();

	const typingStarted = Date.now();
	for (let index = 0; index < keystrokes; index += 1) {
		await page.keyboard.type('x');
	}
	const keystrokeMs = (Date.now() - typingStarted) / keystrokes;

	return { blocks, mountMs, keystrokeMs };
};

const main = async (): Promise<void> => {
	const sandbox = await startSandbox();
	const browser = await chromium.launch();

	try {
		const page = await browser.newPage({
			viewport: { width: 1280, height: 900 }
		});

		const rows: Measurement[] = [];
		for (const blocks of sizes) {
			for (const [label, suffix] of [
				['saved document', ''],
				['imported, no ids', '&ids=0'],
				['editor alone', '&immediate=0&json=0']
			] as const) {
				process.stdout.write(`${blocks} blocks, ${label}… `);
				const row = await measure(page, blocks, suffix);
				process.stdout.write(
					`mount ${row.mountMs}ms, keystroke ${row.keystrokeMs.toFixed(1)}ms\n`
				);
				rows.push(row);
			}
		}

		// Playwright's own round trip is in the keystroke figure and is the
		// same at every size, so the growth across rows is the signal rather
		// than any single number.
		console.log('\nblocks\tmount (ms)\tper keystroke (ms)');
		for (const row of rows) {
			console.log(
				`${row.blocks}\t${row.mountMs}\t\t${row.keystrokeMs.toFixed(1)}`
			);
		}
	} finally {
		await browser.close();
		sandbox.kill();
	}
};

await main();
