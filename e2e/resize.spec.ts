import { expect, test, type Page } from '@playwright/test';

import { EDITOR, dropFile } from './helpers.js';

/**
 * PA-24. Dragging a handle is pointer work over real layout, and whether the
 * height follows the width is the browser's to decide — none of it is
 * visible to jsdom.
 */

const selectedImage = async (page: Page) => {
	await page.goto('/?media');
	await page.locator(EDITOR).click();
	await dropFile(page, 'red-balloon.png');
	const image = page.locator(`${EDITOR} img.blockleaf-image`);
	await expect(image).toBeVisible({ timeout: 10000 });
	await image.click();
	await expect(page.locator('.blockleaf-resize')).toBeVisible();
	return image;
};

const storedWidth = async (page: Page): Promise<unknown> =>
	JSON.parse((await page.locator('.sandbox__json').textContent()) ?? '{}')
		.content?.[0]?.attrs?.width;

test.describe('resizing an image', () => {
	test('dragging the right handle widens it, and the height follows', async ({
		page
	}) => {
		const image = await selectedImage(page);
		const before = await image.boundingBox();
		if (!before) throw new Error('no image box');

		const handle = page.locator(
			'.blockleaf-resize__handle[data-side="right"]'
		);
		const box = await handle.boundingBox();
		if (!box) throw new Error('no handle box');
		await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
		await page.mouse.down();
		await page.mouse.move(box.x + 100, box.y + box.height / 2, {
			steps: 5
		});
		await page.mouse.up();

		await expect
			.poll(() => storedWidth(page))
			.toBe(Math.round(before.width + 100 - box.width / 2));
		const after = await image.boundingBox();
		if (!after) throw new Error('no image box');
		// The picture is square, so it stays square: only the width was set.
		expect(Math.abs(after.height - after.width)).toBeLessThan(2);
		await expect(image).toHaveClass(/ProseMirror-selectednode/);
	});

	test('one drag is one undo step', async ({ page }) => {
		const image = await selectedImage(page);
		const handle = page.locator(
			'.blockleaf-resize__handle[data-side="right"]'
		);
		const box = await handle.boundingBox();
		if (!box) throw new Error('no handle box');
		await page.mouse.move(box.x + 2, box.y + 4);
		await page.mouse.down();
		await page.mouse.move(box.x - 60, box.y + 4, { steps: 6 });
		await page.mouse.up();
		await expect.poll(() => storedWidth(page)).not.toBe(240);

		await page.keyboard.press('Control+z');
		await expect.poll(() => storedWidth(page)).toBe(240);
		await expect(image).toHaveAttribute('width', '240');
	});

	test('Full width fills the page and stores a name, not pixels', async ({
		page
	}) => {
		const image = await selectedImage(page);
		await page
			.getByRole('toolbar', { name: 'Image' })
			.getByRole('button', { name: 'Full width' })
			.click();

		await expect(image).toHaveAttribute('data-width', 'full');
		await expect.poll(() => storedWidth(page)).toBe('full');
		const editor = await page.locator(EDITOR).boundingBox();
		const box = await image.boundingBox();
		expect(Math.abs((box?.width ?? 0) - (editor?.width ?? 0))).toBeLessThan(
			2
		);
	});

	test('the keyboard narrows it too', async ({ page }) => {
		await selectedImage(page);
		await page.keyboard.press('Alt+Shift+ArrowLeft');
		await expect.poll(() => storedWidth(page)).toBeLessThan(240);
	});

	test('handles go away when the image is not selected', async ({ page }) => {
		await selectedImage(page);
		await page.keyboard.press('ArrowDown');
		await expect(page.locator('.blockleaf-resize')).toBeHidden();
	});
});
