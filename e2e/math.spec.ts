import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * Maths from `@blockleaf/math`. The `$…$` rule, the field a formula opens
 * into and where the caret goes when it closes are input and focus
 * behaviour, which only a browser shows. So is MathML drawing at all.
 */

const open = async (page: Page, query = '?math') => {
	await page.goto(`/${query}`);
	await page.locator(EDITOR).click();
};

const json = (page: Page) => page.locator('.sandbox__json');
const field = (page: Page) => page.getByRole('textbox', { name: 'LaTeX' });
const inline = (page: Page) =>
	page.locator(`${EDITOR} span.blockleaf-math`).first();
const block = (page: Page) =>
	page.locator(`${EDITOR} div.blockleaf-math`).first();

test.describe('math', () => {
	test('`$…$` in a line becomes a formula, drawn as MathML', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('Area is $\\pi r^2$ exactly');

		await expect(inline(page).locator('math')).toBeVisible();
		await expect(json(page)).toContainText('"type": "mathInline"');
		await expect(json(page)).toContainText('"latex": "\\\\pi r^2"');
		// The caret stayed in the line, after the formula.
		await expect(page.locator(`${EDITOR} p`).first()).toContainText(
			'exactly'
		);
	});

	test('dollar amounts stay text', async ({ page }) => {
		await open(page);
		await page.keyboard.type('It costs $5 and $10 today');
		await expect(page.locator(`${EDITOR} .blockleaf-math`)).toHaveCount(0);
		await expect(json(page)).not.toContainText('mathInline');
	});

	test('the slash menu inserts a block whose field is ready to type in', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('/math');
		await page.keyboard.press('Enter');

		await expect(field(page)).toBeFocused();
		await page.keyboard.type('\\frac{a}{b}');
		// The formula above the field is the preview, redrawn as you type.
		await expect(block(page).locator('math mfrac')).toBeVisible();

		await page.keyboard.press('Enter');
		await expect(field(page)).toHaveCount(0);
		await expect(json(page)).toContainText('"type": "mathBlock"');
		await expect(json(page)).toContainText('"latex": "\\\\frac{a}{b}"');
		await expect(page.locator(EDITOR)).toBeFocused();
		await expect(page.locator(EDITOR)).not.toContainText('/math');
	});

	test('`$$` then Enter on an empty line makes a block, and Escape on an empty one removes it', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('$$');
		await page.keyboard.press('Enter');
		await expect(field(page)).toBeFocused();
		await expect(block(page)).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(block(page)).toHaveCount(0);
		await expect(json(page)).not.toContainText('mathBlock');
		await expect(page.locator(EDITOR)).not.toContainText('$$');
	});

	test('a click opens a formula with its source, and Escape puts it back unchanged', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('Say $x+1$ ');
		await inline(page).click();

		await expect(field(page)).toBeFocused();
		await expect(field(page)).toHaveValue('x+1');
		await page.keyboard.type('0');
		await expect(inline(page)).toContainText('0');

		await page.keyboard.press('Escape');
		await expect(field(page)).toHaveCount(0);
		await expect(json(page)).toContainText('"latex": "x+1"');
		await expect(inline(page)).not.toContainText('0');
	});

	test('Enter on a selected formula opens it', async ({ page }) => {
		await open(page);
		await page.keyboard.type('$$');
		await page.keyboard.press('Enter');
		await page.keyboard.type('y=mx+c');
		await page.keyboard.press('Enter');

		await block(page).click();
		await page.keyboard.press('Escape');
		await expect(field(page)).toHaveCount(0);
		await expect(block(page)).toHaveClass(/ProseMirror-selectednode/);

		await page.keyboard.press('Enter');
		await expect(field(page)).toBeFocused();
		await expect(field(page)).toHaveValue('y=mx+c');
	});

	test('bad LaTeX is stored as typed and shown as its source', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('Broken $\\frac{a}{$ here');

		await expect(inline(page)).toHaveAttribute('data-invalid', '');
		await expect(inline(page)).toContainText('\\frac{a}{');
		await expect(json(page)).toContainText('"latex": "\\\\frac{a}{"');
	});

	test('a formula and its open field have no accessibility violations', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('Mass $m$ and ');
		await page.keyboard.type('$\\frac{1}{$');
		let results = await new AxeBuilder({ page }).include(EDITOR).analyze();
		expect(results.violations).toEqual([]);

		await inline(page).click();
		await expect(field(page)).toBeFocused();
		results = await new AxeBuilder({ page }).include(EDITOR).analyze();
		expect(results.violations).toEqual([]);
	});

	test("`output: 'html'` draws with KaTeX's own layout and fonts", async ({
		page
	}) => {
		await open(page, '?math=html');
		await page.keyboard.type('Then $x^2$ ');

		const layout = inline(page).locator('.katex-html');
		await expect(layout).toBeVisible();
		await expect(inline(page).locator('.katex')).toHaveCSS(
			'font-family',
			/KaTeX_Main/
		);
	});
});
