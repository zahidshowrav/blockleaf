import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

/**
 * The browser half of CH-05.
 *
 * The unit suite runs axe over each surface in jsdom, which has no layout —
 * so colour contrast, focus visibility and anything that depends on where an
 * element actually ends up can only be checked here.
 */

const EDITOR = '.tiptap.ProseMirror';

test.describe('Chrome accessibility in a real browser', () => {
	test('the editor at rest has no violations', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).click();

		const results = await new AxeBuilder({ page })
			.include('.blockleaf-editor')
			.analyze();

		expect(results.violations).toEqual([]);
	});

	test('the slash menu has no violations, contrast included', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('/');

		await expect(page.locator('.blockleaf-slash-menu')).toBeVisible();

		const results = await new AxeBuilder({ page })
			.include('.blockleaf-slash-menu')
			.analyze();

		expect(results.violations).toEqual([]);
	});

	test('the bubble menu has no violations, contrast included', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('Some text to format');
		await page.keyboard.press('Shift+Home');

		await expect(page.locator('.blockleaf-bubble-menu')).toBeVisible();

		const results = await new AxeBuilder({ page })
			.include('.blockleaf-bubble-menu')
			.analyze();

		expect(results.violations).toEqual([]);
	});

	test('the table grid picker has no violations', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('/table');
		await page.keyboard.press('Enter');

		await expect(page.locator('.blockleaf-grid-picker')).toBeVisible();

		const results = await new AxeBuilder({ page })
			.include('.blockleaf-grid-picker')
			.analyze();

		expect(results.violations).toEqual([]);
	});
});

test.describe('A document built without touching the mouse', () => {
	test('types a heading, a list and a table from the keyboard alone', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).click();

		const editor = page.locator(EDITOR);

		// A heading, via the slash menu.
		// `allowSpaces` is off in the suggestion plugin, so a space ends the
		// query. Aliases exist for exactly this.
		await page.keyboard.type('/h1');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Quarterly review');
		await expect(editor.locator('h1')).toHaveText('Quarterly review');

		await page.keyboard.press('Enter');

		// A list, via the slash menu.
		await page.keyboard.type('/bullet');
		await page.keyboard.press('Enter');
		await page.keyboard.type('First point');
		await expect(editor.locator('ul > li').first()).toContainText(
			'First point'
		);

		await page.keyboard.press('Enter');
		await page.keyboard.press('Enter');

		// A table, via the slash menu and the grid picker — arrow keys only.
		await page.keyboard.type('/table');
		await page.keyboard.press('Enter');
		await expect(page.locator('.blockleaf-grid-picker')).toBeVisible();

		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('Enter');

		const table = editor.locator('table');
		await expect(table).toBeVisible();
		await expect(table.locator('tr').first().locator('th')).toHaveCount(4);

		await page.keyboard.type('Metric');
		await expect(table.locator('th').first()).toContainText('Metric');
	});

	test('Backspace in the grid picker goes back to the list', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).click();

		await page.keyboard.type('/table');
		await page.keyboard.press('Enter');
		await expect(page.locator('.blockleaf-grid-picker')).toBeVisible();

		await page.keyboard.press('Backspace');
		await expect(page.locator('.blockleaf-grid-picker')).toBeHidden();
		await expect(page.locator('.blockleaf-slash-menu')).toBeVisible();
	});

	test('Escape in the grid picker dismisses the whole menu', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).click();

		await page.keyboard.type('/table');
		await page.keyboard.press('Enter');
		await expect(page.locator('.blockleaf-grid-picker')).toBeVisible();

		// Escape belongs to the suggestion plugin, which exits the whole
		// popup — consistent with Escape everywhere else in the chrome.
		await page.keyboard.press('Escape');
		await expect(page.locator('.blockleaf-grid-picker')).toBeHidden();
		await expect(page.locator('.blockleaf-slash-menu')).toBeHidden();
		await expect(page.locator(`${EDITOR} table`)).toHaveCount(0);
	});

	test('the block menu opens with the context-menu key', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('A block to act on');

		await page.keyboard.press('Shift+F10');

		const menu = page.getByRole('menu', { name: 'Block actions' });
		await expect(menu).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(menu).toBeHidden();
	});

	test('the row menu opens from the keyboard inside a table', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('||| ');
		await expect(page.locator(`${EDITOR} table`)).toBeVisible();

		await page.keyboard.press('Control+Alt+r');

		const menu = page.getByRole('menu', { name: 'Row actions' });
		await expect(menu).toBeVisible();

		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('Enter');

		// "Insert row below" was the second entry.
		await expect(page.locator(`${EDITOR} table tr`)).toHaveCount(4);
	});

	test('the bubble menu link editor opens with Mod+K', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('Link this text');
		await page.keyboard.press('Shift+Home');
		await expect(page.locator('.blockleaf-bubble-menu')).toBeVisible();

		await page.keyboard.press('Control+k');

		const field = page.getByLabel('Link address');
		await expect(field).toBeVisible();
		await expect(field).toBeFocused();

		await page.keyboard.type('https://example.com');
		await page.keyboard.press('Enter');

		await expect(page.locator(`${EDITOR} a`)).toHaveAttribute(
			'href',
			'https://example.com'
		);
	});

	test('Mod+K works before the toolbar has finished appearing', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('Link this text');
		await page.keyboard.press('Shift+Home');

		// Long enough for the selection transaction to land — `Mod+K` on an
		// empty selection correctly does nothing — but well inside the
		// toolbar's 250 ms update delay, where the field is created hidden
		// and `focus()` on it silently does nothing. The field has to end up
		// focused anyway, once the toolbar appears.
		await page.waitForTimeout(50);
		await page.keyboard.press('Control+k');

		await expect(page.getByLabel('Link address')).toBeFocused();
	});

	test('a rejected link says why and does not apply', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('Link this text');
		await page.keyboard.press('Shift+Home');
		await expect(page.locator('.blockleaf-bubble-menu')).toBeVisible();
		await page.keyboard.press('Control+k');
		await expect(page.getByLabel('Link address')).toBeFocused();

		await page.keyboard.type('javascript:alert(1)');
		await page.keyboard.press('Enter');

		await expect(page.getByRole('alert')).toContainText(
			'Only https, mailto and relative links are allowed.'
		);
		await expect(page.locator(`${EDITOR} a`)).toHaveCount(0);
	});
});
