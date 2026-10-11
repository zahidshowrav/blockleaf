import { test, expect } from '@playwright/test';

test.describe('Blockleaf editor smoke tests', () => {
	test('mounts editor and displays initial document in host app', async ({
		page
	}) => {
		await page.goto('/');

		const editor = page.locator('.tiptap.ProseMirror');
		await expect(editor).toBeVisible();

		const jsonPane = page.locator('.sandbox__json');
		await expect(jsonPane).toContainText('"schemaVersion": 1');
	});

	test('converts markdown input rules into headings and lists', async ({
		page
	}) => {
		await page.goto('/');

		const editor = page.locator('.tiptap.ProseMirror');
		await editor.click();

		// Type heading markdown shortcut
		await page.keyboard.type('# Hello Blockleaf');
		await expect(editor.locator('h1')).toHaveText('Hello Blockleaf');

		// Press Enter to start new paragraph
		await page.keyboard.press('Enter');

		// Type bullet list markdown shortcut
		await page.keyboard.type('* First item');
		await expect(editor.locator('ul > li')).toHaveText('First item');
	});

	test('creates table via input rule, navigates cells, and appends row on Tab in last cell', async ({
		page
	}) => {
		await page.goto('/');

		const editor = page.locator('.tiptap.ProseMirror');
		await editor.click();

		// Type table input rule '||| '
		await page.keyboard.type('||| ');

		const table = editor.locator('table');
		await expect(table).toBeVisible();

		// Default table has 3 rows: 1 header row (3 th) + 2 body rows (6 td)
		const rows = table.locator('tr');
		await expect(rows).toHaveCount(3);
		await expect(table.locator('th')).toHaveCount(3);
		await expect(table.locator('td')).toHaveCount(6);

		// Type in first header cell
		await page.keyboard.type('Col A');
		await expect(table.locator('th').nth(0)).toContainText('Col A');

		// Tab to next cell
		await page.keyboard.press('Tab');
		await page.keyboard.type('Col B');
		await expect(table.locator('th').nth(1)).toContainText('Col B');

		// Shift+Tab back to previous cell (selects cell contents)
		await page.keyboard.press('Shift+Tab');
		await page.keyboard.type('Col A Replaced');
		await expect(table.locator('th').nth(0)).toContainText(
			'Col A Replaced'
		);

		// Advance forward to the last cell of the table (8 Tabs from cell 0)
		for (let i = 0; i < 8; i++) {
			await page.keyboard.press('Tab');
		}
		await page.keyboard.type('Final cell');
		await expect(table.locator('td').last()).toContainText('Final cell');

		// Tab on the last cell appends a new row (EC-16)
		await page.keyboard.press('Tab');
		await expect(rows).toHaveCount(4);
		await expect(table.locator('td')).toHaveCount(9);

		// Focus moved to the first cell of the newly added row
		await page.keyboard.type('Row 4 Col 1');
		await expect(rows.nth(3).locator('td').first()).toContainText(
			'Row 4 Col 1'
		);

		// Verify host application JSON pane recorded the table node
		const jsonPane = page.locator('.sandbox__json');
		await expect(jsonPane).toContainText('"type": "table"');
	});
});
