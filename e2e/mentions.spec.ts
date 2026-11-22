import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * PA-02. The picker opens on a character typed into a real selection and is
 * positioned against the caret, neither of which jsdom has.
 */

const MENU = '.blockleaf-mention-menu';
const MENTION = `${EDITOR} .blockleaf-mention`;

const open = async (page: Page) => {
	await page.goto('/?mentions');
	await page.locator(EDITOR).click();
	await expect(page.locator(EDITOR)).toBeFocused();
};

test.describe('mentions', () => {
	test('typing @ and a name, then Enter, inserts a mention and a space', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('Hi @gr');
		const option = page.locator(`${MENU} [role="option"]`);
		await expect(option).toHaveCount(1);
		await expect(option).toContainText('Grace Hopper');

		await page.keyboard.press('Enter');
		await expect(page.locator(MENU)).toHaveCount(0);
		await page.keyboard.type('there');

		await expect(page.locator(MENTION)).toHaveText('@Grace Hopper');
		await expect(page.locator(`${EDITOR} p`).first()).toHaveText(
			'Hi @Grace Hopper there'
		);
		const json = page.locator('.sandbox__json');
		await expect(json).toContainText('"type": "mention"');
		await expect(json).toContainText('"id": "u_2"');
		await expect(json).toContainText('"kind": "user"');
	});

	test('the arrow keys choose, and a click picks', async ({ page }) => {
		await open(page);
		await page.keyboard.type('@a');
		const options = page.locator(`${MENU} [role="option"]`);
		await expect(options).toHaveCount(3);

		await page.keyboard.press('ArrowDown');
		await expect(options.nth(1)).toHaveAttribute('aria-selected', 'true');

		await options.nth(2).click();
		await expect(page.locator(MENTION)).toHaveText('@Alan Turing');
		await expect(page.locator(EDITOR)).toBeFocused();
	});

	test('Escape closes the picker and keeps what was typed', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('@gr');
		await expect(page.locator(MENU)).toBeVisible();

		await page.keyboard.press('Escape');
		await expect(page.locator(MENU)).toHaveCount(0);
		await expect(page.locator(`${EDITOR} p`).first()).toHaveText('@gr');
		await expect(page.locator(MENTION)).toHaveCount(0);
	});

	test('an @ inside a word or inside code is only an @', async ({ page }) => {
		await open(page);
		await page.keyboard.type('ada@example');
		await expect(page.locator(MENU)).toHaveCount(0);

		await page.keyboard.press('Enter');
		await page.keyboard.type('``` ');
		await page.keyboard.type('@gr');
		await expect(page.locator(`${EDITOR} pre`)).toContainText('@gr');
		await expect(page.locator(MENU)).toHaveCount(0);
	});

	test('an @ under inline code is only an @', async ({ page }) => {
		await open(page);
		await page.keyboard.type('Run ');
		await page.keyboard.press('ControlOrMeta+e');
		await page.keyboard.type('@gr');

		await expect(page.locator(`${EDITOR} code`)).toHaveText('@gr');
		await expect(page.locator(MENU)).toHaveCount(0);
	});

	test('Backspace after a mention removes all of it', async ({ page }) => {
		await open(page);
		await page.keyboard.type('@ada');
		await expect(page.locator(`${MENU} [role="option"]`)).toHaveCount(1);
		await page.keyboard.press('Enter');
		await expect(page.locator(MENTION)).toHaveCount(1);

		// The space after it, then the mention itself.
		await page.keyboard.press('Backspace');
		await page.keyboard.press('Backspace');

		await expect(page.locator(MENTION)).toHaveCount(0);
		await expect(page.locator(`${EDITOR} p`).first()).toHaveText('');
	});
});
