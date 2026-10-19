/**
 * Records the demo GIF the README leads with.
 *
 * `pnpm demo:gif` boots the sandbox, drives the editor from the keyboard,
 * screenshots the editor pane every few keystrokes and encodes the frames with
 * `gifenc`. No ffmpeg and no system binary, so anyone who can run the test
 * suite can regenerate the GIF when the chrome changes.
 */
import { chromium, type Page } from '@playwright/test';
import gifencModule from 'gifenc';
import { spawn, type ChildProcess } from 'node:child_process';
import { mkdir, stat, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { setTimeout as wait } from 'node:timers/promises';
import { fileURLToPath } from 'node:url';
import { PNG } from 'pngjs';

/** The slice of `gifenc` this uses. The package ships no types. */
type Palette = number[][];

type GifencApi = {
	GIFEncoder: () => {
		writeFrame: (
			index: Uint8Array,
			width: number,
			height: number,
			options: { palette?: Palette; delay?: number; first?: boolean }
		) => void;
		finish: () => void;
		bytes: () => Uint8Array;
	};
	quantize: (rgba: Uint8Array, maxColors: number) => Palette;
	applyPalette: (rgba: Uint8Array, palette: Palette) => Uint8Array;
};

const { GIFEncoder, applyPalette, quantize } =
	gifencModule as unknown as GifencApi;

/** Not 5180: that one belongs to Playwright's own web server. */
const port = 5181;
const origin = `http://localhost:${port}`;
const viewport = { width: 820, height: 700 };

/** Pinned, because every frame of a GIF is the same size. */
const paneHeight = 380;
const frameDelayMs = 90;
const charactersPerFrame = 3;
const maxColors = 256;
const paletteSamples = 8;

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
const output = join(repoRoot, '.github', 'media', 'demo.gif');

type Frame = { png: Buffer; delay: number };

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

const recorder = (
	page: Page,
	clip: { x: number; y: number; width: number; height: number }
) => {
	const frames: Frame[] = [];

	const shoot = async (): Promise<void> => {
		frames.push({
			png: await page.screenshot({ clip, type: 'png' }),
			delay: frameDelayMs
		});
	};

	/**
	 * Waits, then records one frame that lingers for that long — the chrome
	 * needs a moment to appear and position itself, and a frame taken the
	 * instant a key goes down catches the editor before it has reacted.
	 */
	const hold = async (ms: number): Promise<void> => {
		await wait(ms);
		await shoot();
		const last = frames.at(-1);
		if (last) last.delay = ms;
	};

	const type = async (text: string): Promise<void> => {
		let pending = 0;
		for (const character of text) {
			await page.keyboard.type(character);
			pending += 1;
			if (pending === charactersPerFrame) {
				pending = 0;
				await shoot();
			}
		}
		if (pending > 0) await shoot();
	};

	const press = async (key: string): Promise<void> => {
		await page.keyboard.press(key);
		await shoot();
	};

	return { frames, shoot, hold, type, press };
};

const encode = (frames: Frame[]): Uint8Array => {
	const decoded = frames.map((frame) => ({
		image: PNG.sync.read(frame.png),
		delay: frame.delay
	}));
	const first = decoded.at(0);
	if (!first) throw new Error('Nothing was recorded.');

	// One palette for the whole recording, sampled across it: a per-frame
	// palette would flicker and write a colour table into every frame.
	const step = Math.max(1, Math.ceil(decoded.length / paletteSamples));
	const sample = Buffer.concat(
		decoded
			.filter((_, index) => index % step === 0)
			.map((frame) => frame.image.data)
	);
	const palette = quantize(sample, maxColors);

	const encoder = GIFEncoder();
	for (const [index, frame] of decoded.entries()) {
		const { width, height, data } = frame.image;
		encoder.writeFrame(
			applyPalette(data, palette),
			width,
			height,
			index === 0
				? { palette, delay: frame.delay, first: true }
				: { delay: frame.delay }
		);
	}
	encoder.finish();
	return encoder.bytes();
};

const main = async (): Promise<void> => {
	const sandbox = await startSandbox();
	const browser = await chromium.launch();

	try {
		const page = await browser.newPage({ viewport });
		await page.goto(origin);

		const pane = page.locator('div.sandbox__pane');
		await pane.waitFor();

		// Pinned rather than left to grow with the document, so the clip
		// rectangle stays the same size for every frame.
		await page.addStyleTag({
			content: `div.sandbox__pane { height: ${paneHeight}px; min-height: 0; overflow: hidden; }`
		});

		const box = await pane.boundingBox();
		if (!box) throw new Error('The editor pane is not on screen.');

		const take = recorder(page, box);
		await page.locator('.ProseMirror').click();
		await take.shoot();
		await take.hold(600);

		await take.type('# Blockleaf');
		await take.press('Enter');
		await take.type(
			'A block editor whose document you can actually depend on.'
		);
		await take.press('Enter');
		await take.hold(400);

		await take.type('/');
		await take.hold(700);
		await take.type('bullet');
		await take.hold(500);
		await take.press('Enter');
		await page
			.locator('.ProseMirror ul:not([data-type]) > li')
			.waitFor({ timeout: 5_000 });
		await take.hold(300);

		await take.type('Headless core, replaceable chrome');
		await take.press('Enter');
		await take.type('One stylesheet, no CSS framework');
		await take.press('Enter');
		await take.type('Versioned JSON, migrations included');
		await take.hold(400);

		// The bubble menu, on a selection made without touching the mouse.
		await take.press('Shift+Home');
		await take.hold(900);
		await take.press('ControlOrMeta+b');
		await take.hold(1_600);

		await mkdir(dirname(output), { recursive: true });
		await writeFile(output, encode(take.frames));

		const { size } = await stat(output);
		console.log(
			`${take.frames.length} frames → ${output} (${Math.round(size / 1024)} kB)`
		);
	} finally {
		await browser.close();
		sandbox.kill();
	}
};

await main();
