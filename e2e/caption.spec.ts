import { expect, test, type Page } from '@playwright/test';

import { EDITOR, dropFile } from './helpers.js';

/**
 * HD-10. A caption sits beside the table, inside a `figure`, so where the
 * caret goes on Enter and Backspace is decided by the browser's selection —
 * which jsdom cannot show.
 */

const captionedTable = async (page: Page) => {
	await page.goto('/');
	await page.locator(EDITOR).click();
	await page.keyboard.type('||| ');
	await expect(page.locator(`${EDITOR} table`)).toBeVisible();

	await page.keyboard.press('Control+Alt+r');
	await page
		.getByRole('menu', { name: 'Row actions' })
		.getByRole('menuitem', { name: 'Toggle caption' })
		.click();
	// Tiptap's `focus()` lands a frame later. Keys typed before it go to the
	// menu item, which is about to unmount, and are lost.
	await expect(page.locator(EDITOR)).toBeFocused();
};

test.describe('table caption', () => {
	test('a caption is typed under the table, and Enter leaves it', async ({
		page
	}) => {
		await captionedTable(page);

		const editor = page.locator(EDITOR);
		const caption = editor.locator('figure > figcaption');
		await expect(caption).toBeVisible();
		await expect(caption).toHaveAttribute(
			'data-placeholder',
			'Write a caption'
		);

		await page.keyboard.type('Sales by quarter');
		await expect(caption).toHaveText('Sales by quarter');

		await page.keyboard.press('Enter');
		await page.keyboard.type('After');
		await expect(caption).toHaveText('Sales by quarter');
		await expect(editor.locator('figure + p')).toHaveText('After');

		const json = page.locator('.sandbox__json');
		await expect(json).toContainText('"type": "figure"');
		await expect(json).toContainText('"type": "caption"');
		await expect(json).toContainText('Sales by quarter');
	});

	test('Backspace in an empty caption removes it and goes back to the table', async ({
		page
	}) => {
		await captionedTable(page);

		await page.keyboard.press('Backspace');

		const editor = page.locator(EDITOR);
		await expect(editor.locator('figure')).toHaveCount(0);
		await expect(editor.locator('table')).toBeVisible();

		// The caret is back in the last cell.
		await page.keyboard.type('last');
		await expect(editor.locator('td').last()).toHaveText('last');
	});

	test('deleting the table deletes its caption with it', async ({ page }) => {
		await captionedTable(page);
		await page.keyboard.type('Goes too');

		await page.locator(`${EDITOR} td`).first().click();
		// The controls follow the selection a frame later; the shortcut is
		// theirs, so it is only heard once their handle is up.
		await expect(
			page.locator('.blockleaf-table-controls__handle[data-axis="row"]')
		).toBeVisible();
		await page.keyboard.press('Control+Alt+r');
		await page
			.getByRole('menu', { name: 'Row actions' })
			.getByRole('menuitem', { name: 'Delete table' })
			.click();

		const editor = page.locator(EDITOR);
		await expect(editor.locator('table')).toHaveCount(0);
		await expect(editor.locator('figure')).toHaveCount(0);
		await expect(page.locator('.sandbox__json')).not.toContainText(
			'Goes too'
		);
	});
});

/**
 * PA-20. An image takes the same caption, from the image's own toolbar. The
 * image stays an atom beside its caption, so the caret moving between the two
 * is again the browser's selection, not jsdom's.
 */
const captionedImage = async (page: Page) => {
	await page.goto('/');
	await page.locator(EDITOR).click();
	await dropFile(page, 'red-balloon.png');
	const image = page.locator(`${EDITOR} img.blockleaf-image`);
	await expect(image).toBeVisible({ timeout: 10000 });

	await image.click();
	await page
		.getByRole('toolbar', { name: 'Image' })
		.getByRole('button', { name: 'Toggle caption' })
		.click();
	await expect(page.locator(EDITOR)).toBeFocused();
};

test.describe('image caption', () => {
	test('a caption is typed under the image, and Enter leaves it', async ({
		page
	}) => {
		await captionedImage(page);

		const editor = page.locator(EDITOR);
		const caption = editor.locator('figure > figcaption');
		await expect(editor.locator('figure > img')).toBeVisible();
		await expect(caption).toHaveAttribute(
			'data-placeholder',
			'Write a caption'
		);

		await page.keyboard.type('Photo: Ada');
		await expect(caption).toHaveText('Photo: Ada');

		await page.keyboard.press('Enter');
		await page.keyboard.type('After');
		await expect(caption).toHaveText('Photo: Ada');
		await expect(editor.locator('figure + p')).toHaveText('After');

		const json = page.locator('.sandbox__json');
		await expect(json).toContainText('"type": "figure"');
		await expect(json).toContainText('Photo: Ada');
	});

	test('Backspace in an empty caption removes it and selects the image', async ({
		page
	}) => {
		await captionedImage(page);

		await page.keyboard.press('Backspace');

		const editor = page.locator(EDITOR);
		await expect(editor.locator('figure')).toHaveCount(0);
		await expect(
			editor.locator('img.blockleaf-image.ProseMirror-selectednode')
		).toBeVisible();
		// The image toolbar is back, because the image is selected again.
		await expect(
			page.getByRole('toolbar', { name: 'Image' })
		).toBeVisible();
	});

	test('deleting the image deletes its caption with it', async ({ page }) => {
		await captionedImage(page);
		await page.keyboard.type('gone');

		await page.locator(`${EDITOR} figure > img`).click();
		await page
			.getByRole('toolbar', { name: 'Image' })
			.getByRole('button', { name: 'Delete image' })
			.click();

		const editor = page.locator(EDITOR);
		await expect(editor.locator('figure')).toHaveCount(0);
		await expect(editor.locator('figcaption')).toHaveCount(0);
		await expect(page.locator('.sandbox__json')).not.toContainText('gone');
	});
});
