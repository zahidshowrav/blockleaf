import AxeBuilder from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * A block's background colour, set from the block menu. The menu is
 * portalled out of the editor, so whether its swatches show the colours at
 * all — and whether the coloured block still reads — needs a browser.
 */

const open = async (page: Page, text: string) => {
	await page.goto('/');
	await page.locator(EDITOR).click();
	await page.keyboard.type(text);
};

const menu = (page: Page) => page.getByRole('menu', { name: 'Block actions' });

test.describe('block background colour', () => {
	test('the block menu colours the block it was opened on, and Default takes it off', async ({
		page
	}) => {
		await open(page, 'A note worth seeing');
		await page.keyboard.press('Shift+F10');
		await expect(menu(page)).toBeVisible();
		await expect(
			menu(page).getByRole('group', { name: 'Background' })
		).toBeVisible();

		await menu(page).getByRole('menuitem', { name: 'Yellow' }).click();
		const paragraph = page.locator(`${EDITOR} p`).first();
		await expect(paragraph).toHaveAttribute('data-background', 'yellow');
		await expect(paragraph).toHaveCSS(
			'background-color',
			'rgb(254, 240, 138)'
		);
		await expect(page.locator('.sandbox__json')).toContainText(
			'"backgroundColor": "yellow"'
		);

		await page.keyboard.press('Shift+F10');
		await expect(
			menu(page).getByRole('menuitem', { name: 'Yellow' })
		).toHaveAttribute('aria-current', 'true');
		await menu(page).getByRole('menuitem', { name: 'Default' }).click();
		await expect(paragraph).not.toHaveAttribute('data-background');
		await expect(page.locator('.sandbox__json')).not.toContainText(
			'backgroundColor'
		);
	});

	test("the menu's swatches show the palette, though the menu is outside the editor", async ({
		page
	}) => {
		await open(page, 'Swatches');
		await page.keyboard.press('Shift+F10');
		const swatch = menu(page)
			.getByRole('menuitem', { name: 'Blue' })
			.locator('.blockleaf-block-menu__swatch');
		await expect(swatch).toHaveCSS(
			'background-color',
			'rgb(219, 232, 254)'
		);
	});

	test('a coloured block and the menu have no accessibility violations', async ({
		page
	}) => {
		await open(page, 'Readable on every colour');
		for (const color of ['Gray', 'Red', 'Purple']) {
			await page.keyboard.press('Shift+F10');
			await menu(page)
				.getByRole('menuitem', { name: color, exact: true })
				.click();
			const results = await new AxeBuilder({ page })
				.include(EDITOR)
				.analyze();
			expect(results.violations).toEqual([]);
		}

		await page.keyboard.press('Shift+F10');
		const results = await new AxeBuilder({ page })
			.include('.blockleaf-block-menu')
			.analyze();
		expect(results.violations).toEqual([]);
	});
});
