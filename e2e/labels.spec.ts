import { expect, test } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * HD-02, in a browser.
 *
 * The sandbox applies a deliberately partial French set at `?fr`, because the
 * claim worth testing is not that a label can be replaced — it is that
 * replacing one leaves the rest alone.
 */
test.describe('A translated chrome', () => {
	test('names the slash menu and its items from the label set', async ({
		page
	}) => {
		await page.goto('/?fr');
		await page.locator(EDITOR).click();
		await page.keyboard.type('/');

		const menu = page.getByRole('listbox', { name: 'Commandes' });
		await expect(menu).toBeVisible();
		await expect(menu.getByText('Titre 1')).toBeVisible();
		await expect(menu.getByText('Titres')).toBeVisible();
	});

	test('leaves everything the set left out in English', async ({ page }) => {
		await page.goto('/?fr');
		await page.locator(EDITOR).click();
		await page.keyboard.type('/');

		const menu = page.getByRole('listbox', { name: 'Commandes' });
		await expect(menu.getByText('Bullet list')).toBeVisible();
		await expect(menu.getByText('Lists')).toBeVisible();
	});

	test('names the block menu from the label set', async ({ page }) => {
		await page.goto('/?fr');
		await page.locator(EDITOR).click();
		await page.keyboard.type('A block to act on');
		await page.keyboard.press('Shift+F10');

		const menu = page.getByRole('menu', { name: 'Actions du bloc' });
		await expect(menu).toBeVisible();
		// From `blockTypes`, which the slash menu reads too.
		await expect(menu.getByText('Titre 1')).toBeVisible();
		await expect(menu.getByText('Duplicate')).toBeVisible();
	});

	test('names the link editor field from the label set', async ({ page }) => {
		await page.goto('/?fr');
		await page.locator(EDITOR).click();
		await page.keyboard.type('Link this text');
		await page.keyboard.press('Shift+Home');
		await expect(page.locator('.blockleaf-bubble-menu')).toBeVisible();
		await page.keyboard.press('Control+k');

		await expect(page.getByLabel('Adresse du lien')).toBeFocused();
	});

	test('is English again without the flag', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('/');

		await expect(
			page.getByRole('listbox', { name: 'Slash commands' })
		).toBeVisible();
	});
});
