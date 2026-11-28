import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * Columns from `@blockleaf/editor/layout`. Laying out, dragging a divider,
 * dropping a block beside another and stacking on a phone are all
 * pointer and layout behaviour, which only a browser shows.
 */

const open = async (page: Page) => {
	await page.goto('/?layout');
	await page.locator(EDITOR).click();
};

const json = (page: Page) => page.locator('.sandbox__json');
const row = (page: Page) =>
	page.locator(`${EDITOR} .blockleaf-columns`).first();
const columns = (page: Page) => row(page).locator('.blockleaf-column');

const insert = async (page: Page, command: string) => {
	await page.keyboard.type(command);
	await page.keyboard.press('Enter');
};

test.describe('columns', () => {
	test('`/columns` makes two side by side, with the caret in the first', async ({
		page
	}) => {
		await open(page);
		await insert(page, '/columns');

		await expect(columns(page)).toHaveCount(2);
		await page.keyboard.type('Left');
		await expect(columns(page).first()).toContainText('Left');
		await expect(json(page)).toContainText('"type": "columns"');

		const [a, b] = await Promise.all([
			columns(page).nth(0).boundingBox(),
			columns(page).nth(1).boundingBox()
		]);
		// Side by side, the same width.
		expect(b!.x).toBeGreaterThan(a!.x + a!.width);
		expect(Math.abs(a!.width - b!.width)).toBeLessThan(2);
		await expect(page.locator(EDITOR)).not.toContainText('/columns');
	});

	test('`/3col` makes three', async ({ page }) => {
		await open(page);
		await insert(page, '/3col');
		await expect(columns(page)).toHaveCount(3);
	});

	test('dragging the divider stores widths, and a double click sets them back', async ({
		page
	}) => {
		await open(page);
		await insert(page, '/columns');
		await page.keyboard.type('Left');

		const first = columns(page).first();
		await first.hover();
		const divider = first.locator('.blockleaf-column__resize');
		const box = await divider.boundingBox();
		const before = (await first.boundingBox())!.width;
		await page.mouse.move(box!.x + box!.width / 2, box!.y + 10);
		await page.mouse.down();
		await page.mouse.move(box!.x + box!.width / 2 + 120, box!.y + 10, {
			steps: 5
		});
		await page.mouse.up();

		expect((await first.boundingBox())!.width).toBeGreaterThan(before + 80);
		await expect(json(page)).toContainText(/"width": \d+(\.\d)?/);
		// One drag is one undo step.
		await page.locator(EDITOR).focus();
		await page.keyboard.press('ControlOrMeta+z');
		await expect(json(page)).not.toContainText(/"width": \d/);
		await page.keyboard.press('ControlOrMeta+Shift+z');
		await expect(json(page)).toContainText(/"width": \d/);

		await divider.dblclick();
		await expect(json(page)).not.toContainText(/"width": \d/);
		await expect
			.poll(async () => (await first.boundingBox())!.width)
			.toBeCloseTo(before, -1);
	});

	test('Backspace in an empty column removes it, and the last one leaves its blocks', async ({
		page
	}) => {
		await open(page);
		await insert(page, '/columns');
		await page.keyboard.type('Kept');
		// Into the empty second column.
		await columns(page).nth(1).click();
		await page.keyboard.press('Backspace');

		await expect(page.locator(`${EDITOR} .blockleaf-columns`)).toHaveCount(
			0
		);
		await expect(json(page)).not.toContainText('"type": "columns"');
		await expect(page.locator(EDITOR)).toContainText('Kept');
	});

	test('dropping a block on the right edge of another puts them side by side', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('First');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Second');

		const paragraphs = page.locator(`${EDITOR} > p`);
		await paragraphs.nth(1).hover();
		const handle = page.locator(
			'.blockleaf-block-handle [draggable="true"]'
		);
		await expect(handle).toBeVisible();
		const from = (await handle.boundingBox())!;
		const target = (await paragraphs.nth(0).boundingBox())!;

		await page.mouse.move(
			from.x + from.width / 2,
			from.y + from.height / 2
		);
		await page.mouse.down();
		await page.mouse.move(target.x + target.width / 2, target.y + 4, {
			steps: 5
		});
		await page.mouse.move(target.x + target.width - 8, target.y + 6, {
			steps: 5
		});
		await expect(page.locator('.blockleaf-columns-drop')).toBeVisible();
		await page.mouse.up();

		await expect(columns(page)).toHaveCount(2);
		await expect(columns(page).nth(0)).toContainText('First');
		await expect(columns(page).nth(1)).toContainText('Second');
		await expect(page.locator('.blockleaf-columns-drop')).toHaveCount(0);
	});

	test('a phone stacks the columns, in order', async ({ page }) => {
		await page.setViewportSize({ width: 390, height: 800 });
		await open(page);
		await insert(page, '/columns');
		await page.keyboard.type('Top');

		const [a, b] = await Promise.all([
			columns(page).nth(0).boundingBox(),
			columns(page).nth(1).boundingBox()
		]);
		expect(b!.y).toBeGreaterThan(a!.y + a!.height - 1);
		expect(Math.abs(a!.width - b!.width)).toBeLessThan(2);
		await expect(
			columns(page).first().locator('.blockleaf-column__resize')
		).toBeHidden();
	});

	test('a row has no accessibility violations', async ({ page }) => {
		await open(page);
		await insert(page, '/columns');
		await page.keyboard.type('Left');
		const results = await new AxeBuilder({ page })
			.include(EDITOR)
			.analyze();
		expect(results.violations).toEqual([]);
	});
});
