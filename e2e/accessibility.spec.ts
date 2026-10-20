import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { EDITOR, dropFile } from './helpers.js';

/**
 * The browser half of CH-05, widened by HD-01 to every surface the chrome
 * puts on screen.
 *
 * The unit suite runs axe over each surface in jsdom, which has no layout —
 * so colour contrast, focus visibility and anything that depends on where an
 * element actually ends up can only be checked here.
 */

const violations = async (page: Page, selector: string) =>
	(await new AxeBuilder({ page }).include(selector).analyze()).violations;

const openEditor = async (page: Page) => {
	await page.goto('/');
	await page.locator(EDITOR).click();
};

test.describe('Chrome accessibility in a real browser', () => {
	test('the editor at rest has no violations', async ({ page }) => {
		await openEditor(page);

		expect(await violations(page, '.blockleaf-editor')).toEqual([]);
	});

	test('the slash menu has no violations, contrast included', async ({
		page
	}) => {
		await openEditor(page);
		await page.keyboard.type('/');
		await expect(page.locator('.blockleaf-slash-menu')).toBeVisible();

		expect(await violations(page, '.blockleaf-slash-menu')).toEqual([]);
	});

	test('the bubble menu has no violations, contrast included', async ({
		page
	}) => {
		await openEditor(page);
		await page.keyboard.type('Some text to format');
		await page.keyboard.press('Shift+Home');
		await expect(page.locator('.blockleaf-bubble-menu')).toBeVisible();

		expect(await violations(page, '.blockleaf-bubble-menu')).toEqual([]);
	});

	test('the link editor has no violations', async ({ page }) => {
		await openEditor(page);
		await page.keyboard.type('Link this text');
		await page.keyboard.press('Shift+Home');
		await expect(page.locator('.blockleaf-bubble-menu')).toBeVisible();
		await page.keyboard.press('Control+k');
		await expect(page.getByLabel('Link address')).toBeFocused();

		expect(await violations(page, '.blockleaf-bubble-menu')).toEqual([]);
	});

	test('the table grid picker has no violations', async ({ page }) => {
		await openEditor(page);
		await page.keyboard.type('/table');
		await page.keyboard.press('Enter');
		await expect(page.locator('.blockleaf-grid-picker')).toBeVisible();

		expect(await violations(page, '.blockleaf-grid-picker')).toEqual([]);
	});

	// The menu is a scroll container, so axe wants it reachable by keyboard
	// rather than merely focusable in script — otherwise a keyboard user can
	// reach the items but never scroll to the ones below the fold.
	test('the block menu has no violations', async ({ page }) => {
		await openEditor(page);
		await page.keyboard.type('A block to act on');
		await page.keyboard.press('Shift+F10');
		await expect(
			page.getByRole('menu', { name: 'Block actions' })
		).toBeVisible();

		expect(await violations(page, '.blockleaf-block-menu')).toEqual([]);
	});

	test('the drag handle has no violations', async ({ page }) => {
		await openEditor(page);
		await page.keyboard.type('Hover me');
		await page.locator(`${EDITOR} p`).first().hover();
		await expect(page.locator('.blockleaf-block-handle')).toBeVisible();

		expect(
			await violations(page, '.blockleaf-block-handle-anchor')
		).toEqual([]);
	});

	test('the table and its controls have no violations', async ({ page }) => {
		await openEditor(page);
		await page.keyboard.type('||| ');
		await expect(page.locator(`${EDITOR} table`)).toBeVisible();

		// The header cells are filled first on purpose. An empty `th` is a real
		// axe finding, but it is also a brand-new table's honest state, and the
		// header semantics that answer it belong to HD-07.
		await page.keyboard.type('Name');
		await page.keyboard.press('Tab');
		await page.keyboard.type('Role');
		await page.keyboard.press('Tab');
		await page.keyboard.type('Since');

		expect(await violations(page, '.blockleaf-table-controls')).toEqual([]);
		expect(await violations(page, `${EDITOR} table`)).toEqual([]);
	});

	test('the row menu has no violations', async ({ page }) => {
		await openEditor(page);
		await page.keyboard.type('||| ');
		await expect(page.locator(`${EDITOR} table`)).toBeVisible();
		await page.keyboard.press('Control+Alt+r');
		await expect(
			page.getByRole('menu', { name: 'Row actions' })
		).toBeVisible();

		expect(await violations(page, '.blockleaf-table-menu')).toEqual([]);
	});

	test('the callout has no violations', async ({ page }) => {
		await openEditor(page);
		await page.keyboard.type('/callout');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Worth knowing');
		await expect(page.locator('.blockleaf-callout')).toBeVisible();

		expect(await violations(page, '.blockleaf-callout')).toEqual([]);
	});

	test("a failed upload's placeholder has no violations", async ({
		page
	}) => {
		await openEditor(page);
		await dropFile(page, 'fail.png');
		await expect(
			page.locator('.blockleaf-upload[data-state="error"]')
		).toBeVisible();

		expect(await violations(page, '.blockleaf-upload')).toEqual([]);
	});

	// A missing `alt` is the one critical finding an uploaded image can carry:
	// a screen reader falls back to announcing the URL.
	test('an uploaded image carries alt text', async ({ page }) => {
		await openEditor(page);
		await dropFile(page, 'red-balloon.png');

		const image = page.locator(`${EDITOR} img`);
		await expect(image).toBeVisible();
		await expect(image).toHaveAttribute('alt', 'red balloon');

		expect(await violations(page, `${EDITOR} img`)).toEqual([]);
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
