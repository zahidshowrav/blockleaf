import { test, expect, type Page } from '@playwright/test';

/**
 * The chrome is positioned against `.blockleaf-editor`, so anything that
 * leaves that box is at the mercy of the host's layout. Most hosts give an
 * editor a fixed height and let it scroll — the documentation site's demo
 * does — and in that arrangement the drag handle was clipped away entirely
 * and the block menu both clipped and counted towards the scroll height.
 *
 * The sandbox does not scroll, which is why none of it was caught. These
 * tests impose the constraint rather than changing the workbench.
 */
const EDITOR = '.tiptap.ProseMirror';
const PANE = '.sandbox__pane:not(.sandbox__json)';

/** The pointer has to be inside the content for the handle to resolve a block. */
const hoverBlock = async (page: Page, index: number) => {
	const block = page.locator(`${EDITOR} > *`).nth(index);
	const box = await block.boundingBox();
	if (!box) throw new Error(`block ${index} has no box`);

	await page.mouse.move(box.x + 40, box.y + 6);
	// A second move: the handle only reacts to mousemove, and Playwright's
	// first move can land before the editor has attached its listener.
	await page.mouse.move(box.x + 41, box.y + 6);
	return box;
};

test.describe('Chrome inside a scrolling container', () => {
	test.beforeEach(async ({ page }) => {
		await page.goto('/');
		await page.waitForSelector(EDITOR);
		await page.addStyleTag({
			content: `${PANE} { height: 320px; overflow: auto; }`
		});

		await page.locator(EDITOR).click();
		for (const line of ['Alpha', 'Bravo', 'Charlie', 'Delta', 'Echo']) {
			await page.keyboard.type(line);
			await page.keyboard.press('Enter');
		}
	});

	test('the drag handle sits beside the block under the pointer', async ({
		page
	}) => {
		const handle = page.locator('.blockleaf-block-handle');

		for (const index of [1, 3]) {
			const block = await hoverBlock(page, index);
			await expect(handle).toBeVisible();

			const rect = await handle.boundingBox();
			expect(rect).not.toBeNull();
			// Level with the block, not stranded at the end of the content.
			expect(Math.abs(rect!.y - block.y)).toBeLessThanOrEqual(12);
		}
	});

	test('the drag handle stays inside the scrolling box', async ({ page }) => {
		await hoverBlock(page, 1);
		await expect(page.locator('.blockleaf-block-handle')).toBeVisible();

		const clipped = await page.evaluate(
			({ handleSel, paneSel }) => {
				const handle = document.querySelector(handleSel);
				const pane = document.querySelector(paneSel);
				if (!handle || !pane) return null;

				const h = handle.getBoundingClientRect();
				const p = pane.getBoundingClientRect();
				return { overflowLeft: p.left - h.left, width: h.width };
			},
			{ handleSel: '.blockleaf-block-handle', paneSel: PANE }
		);

		expect(clipped).not.toBeNull();
		expect(clipped!.width).toBeGreaterThan(0);
		// Any positive overflow is a slice of the handle the user cannot click.
		expect(clipped!.overflowLeft).toBeLessThanOrEqual(0);
	});

	test('the block menu is not clipped and does not grow the scrollbar', async ({
		page
	}) => {
		const scrollHeight = () =>
			page.locator(PANE).evaluate((node) => node.scrollHeight);
		const before = await scrollHeight();

		// The last block, so the menu would open hard against the bottom edge.
		const count = await page.locator(`${EDITOR} > *`).count();
		await hoverBlock(page, count - 1);
		await page
			.locator(
				'.blockleaf-block-handle__button[aria-label="Block actions"]'
			)
			.click();

		const menu = page.locator('.blockleaf-block-menu');
		await expect(menu).toBeVisible();

		const geometry = await menu.evaluate((node) => ({
			onBody: node.parentElement === document.body,
			bottom: node.getBoundingClientRect().bottom,
			top: node.getBoundingClientRect().top,
			viewport: window.innerHeight
		}));

		expect(geometry.onBody).toBe(true);
		expect(geometry.top).toBeGreaterThanOrEqual(0);
		expect(geometry.bottom).toBeLessThanOrEqual(geometry.viewport);
		expect(await scrollHeight()).toBe(before);
	});

	test('pressing outside the block menu closes it', async ({ page }) => {
		await hoverBlock(page, 1);
		await page
			.locator(
				'.blockleaf-block-handle__button[aria-label="Block actions"]'
			)
			.click();
		await expect(page.locator('.blockleaf-block-menu')).toBeVisible();

		await page.locator('.sandbox__bar').click();
		await expect(page.locator('.blockleaf-block-menu')).toHaveCount(0);
	});
});
