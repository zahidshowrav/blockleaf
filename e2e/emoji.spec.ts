import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * PA-03. The picker opens on a character typed into a real selection, and
 * its list is a chunk the browser fetches the first time — neither of which
 * jsdom has.
 */

const MENU = '.blockleaf-emoji-menu';

const open = async (page: Page) => {
	await page.goto('/?emoji');
	await page.locator(EDITOR).click();
	await expect(page.locator(EDITOR)).toBeFocused();
};

test.describe('emoji', () => {
	test('typing :tada and Enter inserts the emoji as plain text', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('Shipped :tada');
		const option = page.locator(`${MENU} [role="option"]`).first();
		await expect(option).toContainText('party popper');

		await page.keyboard.press('Enter');
		await expect(page.locator(MENU)).toHaveCount(0);
		await page.keyboard.type('!');

		await expect(page.locator(`${EDITOR} p`).first()).toHaveText(
			'Shipped 🎉!'
		);
		// Plain text: no node, no mark, nothing a renderer has to know.
		const json = page.locator('.sandbox__json');
		await expect(json).toContainText('"text": "Shipped 🎉!"');
	});

	test('one character after the colon is not enough to open it', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('Nice :)');
		await expect(page.locator(MENU)).toHaveCount(0);
		await page.keyboard.press('Enter');
		await expect(page.locator(`${EDITOR} p`).first()).toHaveText('Nice :)');

		await page.keyboard.type('Meet at 10:30');
		await expect(page.locator(MENU)).toHaveCount(0);
	});

	test('the arrow keys choose and a click picks', async ({ page }) => {
		await open(page);
		await page.keyboard.type(':heart');
		const options = page.locator(`${MENU} [role="option"]`);
		await expect(options.first()).toBeVisible();

		await page.keyboard.press('ArrowDown');
		await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');
		const emoji =
			(await options
				.nth(1)
				.locator('.blockleaf-emoji-menu__emoji')
				.textContent()) ?? '';
		expect(emoji).not.toBe('');

		await options.nth(1).click();
		await expect(page.locator(`${EDITOR} p`).first()).toHaveText(emoji);
		await expect(page.locator(EDITOR)).toBeFocused();
	});

	test('Escape closes it and keeps what was typed', async ({ page }) => {
		await open(page);
		await page.keyboard.type(':rocket');
		await expect(page.locator(MENU)).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(page.locator(MENU)).toHaveCount(0);
		await expect(page.locator(`${EDITOR} p`).first()).toHaveText(':rocket');
	});
});
