import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

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
