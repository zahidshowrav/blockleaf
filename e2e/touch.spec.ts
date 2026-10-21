import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * HD-04, on a phone.
 *
 * Run under the `mobile-chrome` project, which emulates a Pixel 7 with touch
 * and a coarse pointer. A touch device never fires `mousemove`, so everything
 * the desktop suite reaches by hovering has to be reached another way here.
 */

/** Smallest side of the element's box, in CSS px. */
const smallestSide = async (page: Page, selector: string) => {
	const box = await page.locator(selector).first().boundingBox();
	if (!box) throw new Error(`${selector} has no box`);
	return Math.min(box.width, box.height);
};

test.describe('The editor on a phone', () => {
	test('the block handle follows the caret, because nothing hovers', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).tap();
		await page.keyboard.type('First block');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Second block');

		const handle = page.locator('.blockleaf-block-handle');
		await expect(handle).toBeVisible();

		// It moves with the caret, not with a pointer that does not exist.
		// Polled rather than measured once: the move is a React render away.
		const anchorY = async () =>
			(await page.locator('.blockleaf-block-handle-anchor').boundingBox())
				?.y ?? -1;

		const onSecond = await anchorY();
		await page.locator(`${EDITOR} p`).first().tap();
		await expect.poll(anchorY).toBeLessThan(onSecond);
	});

	test('the block menu opens from a tap on that handle', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).tap();
		await page.keyboard.type('A block to act on');

		await page.locator('.blockleaf-block-handle__button').last().tap();

		await expect(
			page.getByRole('menu', { name: 'Block actions' })
		).toBeVisible();
	});

	// Reordering by dragging needs a pointer. Move up and Move down are the
	// same capability, reachable by thumb.
	test('a block can be moved without dragging it', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).tap();
		await page.keyboard.type('First');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Second');

		await page.locator('.blockleaf-block-handle__button').last().tap();
		await page.getByRole('menuitem', { name: 'Move up' }).tap();

		await expect(page.locator(`${EDITOR} p`).first()).toHaveText('Second');
	});

	test('the handle goes away when the editor loses the caret', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).tap();
		await page.keyboard.type('A block');
		await expect(page.locator('.blockleaf-block-handle')).toBeVisible();

		await page.locator('.sandbox__bar h1').tap();

		await expect(page.locator('.blockleaf-block-handle')).toBeHidden();
	});

	test('touch targets are at least 44px', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).tap();
		await page.keyboard.type('Some text to format');

		expect(
			await smallestSide(page, '.blockleaf-block-handle__button')
		).toBeGreaterThanOrEqual(44);

		await page.keyboard.press('Shift+Home');
		await expect(page.locator('.blockleaf-bubble-menu')).toBeVisible();
		expect(
			await smallestSide(page, '.blockleaf-bubble-menu__button')
		).toBeGreaterThanOrEqual(44);
	});

	test('the slash menu stays on screen and its items are tappable', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).tap();
		await page.keyboard.type('/');

		const menu = page.locator('.blockleaf-slash-menu');
		await expect(menu).toBeVisible();

		const box = await menu.boundingBox();
		const width = page.viewportSize()?.width ?? 0;
		expect(box?.x).toBeGreaterThanOrEqual(0);
		expect((box?.x ?? 0) + (box?.width ?? 0)).toBeLessThanOrEqual(width);

		expect(
			await smallestSide(page, '.blockleaf-slash-menu__item')
		).toBeGreaterThanOrEqual(44);
	});

	test('a table does not push the page sideways', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).tap();
		await page.keyboard.type('||| ');
		await expect(page.locator(`${EDITOR} table`)).toBeVisible();

		expect(
			await page.evaluate(
				() => document.documentElement.scrollWidth > window.innerWidth
			)
		).toBe(false);
	});

	// A stored `colwidth` is the author's, and a phone does not get to
	// overrule it — the table keeps its width and scrolls inside its own box
	// instead of cutting the document off at the screen edge. `?wide` serves a
	// document whose columns are 260px each, which no phone can show at once.
	test('a table wider than the screen scrolls rather than overflowing', async ({
		page
	}) => {
		await page.goto('/?wide');
		await expect(page.locator(`${EDITOR} table`)).toBeVisible();

		const overflow = await page.evaluate(() => {
			const wrapper = document.querySelector(
				'.tiptap.ProseMirror .tableWrapper'
			) as HTMLElement;
			return {
				scrolls: wrapper.scrollWidth > wrapper.clientWidth,
				withinViewport: wrapper.clientWidth <= window.innerWidth,
				pageOverflows:
					document.documentElement.scrollWidth > window.innerWidth
			};
		});

		expect(overflow.scrolls).toBe(true);
		expect(overflow.withinViewport).toBe(true);
		expect(overflow.pageOverflows).toBe(false);
	});
});
