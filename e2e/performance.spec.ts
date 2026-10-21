import { expect, test } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * The HD-05 regression guard.
 *
 * Not a benchmark — `pnpm perf` is for numbers, and numbers from one machine
 * are not a budget. This catches the one shape of failure that matters: an
 * editor that goes quadratic again on a document it has to open.
 *
 * `?ids=0` is the import case, which is the one that broke. A document this
 * editor saved earlier already has its block ids; one that came from
 * somewhere else does not, and stamping them used to cost one ProseMirror
 * transaction step per block, each applied to the document the one before it
 * produced. A 5,000-block import took 34 seconds.
 */
const BLOCKS = 5_000;

/** Measured at ~1.3s. Seven times that still catches a return to quadratic. */
const CEILING_MS = 10_000;

test.describe('A long document', () => {
	test('opens without going quadratic', async ({ page }) => {
		const started = Date.now();
		await page.goto(`/?blocks=${BLOCKS}&ids=0&json=0`);
		await expect(page.locator(`${EDITOR} p`).first()).toBeVisible({
			timeout: CEILING_MS
		});
		const elapsed = Date.now() - started;

		expect(await page.locator(`${EDITOR} p`).count()).toBe(BLOCKS);
		expect(elapsed).toBeLessThan(CEILING_MS);
	});

	test('still takes typing at the far end of it', async ({ page }) => {
		await page.goto(`/?blocks=${BLOCKS}&ids=0&json=0`);
		await expect(page.locator(`${EDITOR} p`).first()).toBeVisible({
			timeout: CEILING_MS
		});

		// The first block, so every position the editor maps has the whole
		// document ahead of it.
		await page.locator(`${EDITOR} p`).first().click();
		await page.keyboard.type('typed');

		await expect(page.locator(`${EDITOR} p`).first()).toContainText(
			'typed'
		);
	});
});
