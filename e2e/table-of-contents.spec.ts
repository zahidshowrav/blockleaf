import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * PA-08. The block lists headings as they are typed, and a click on an entry
 * moves the caret to its heading — selection and focus, which jsdom does not
 * have.
 */

const TOC = `${EDITOR} nav.blockleaf-toc`;

/** Two headings, then a table of contents inserted from the slash menu. */
const open = async (page: Page) => {
	await page.goto('/?toc');
	await page.locator(EDITOR).click();
	await expect(page.locator(EDITOR)).toBeFocused();
	await page.keyboard.type('# Intro');
	await page.keyboard.press('Enter');
	await page.keyboard.type('## Details');
	await page.keyboard.press('Enter');
	await page.keyboard.type('/contents');
	const option = page.getByRole('option', { name: /Table of contents/ });
	await expect(option).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page.locator(TOC)).toBeVisible();
};

test.describe('table of contents', () => {
	test('the slash menu inserts one that lists the headings', async ({
		page
	}) => {
		await open(page);
		const links = page.locator(`${TOC} a`);

		await expect(links).toHaveText(['Intro', 'Details']);
		await expect(links.nth(1).locator('xpath=..')).toHaveAttribute(
			'data-depth',
			'2'
		);
		await expect(page.locator('.sandbox__json')).toContainText(
			'"type": "tableOfContents"'
		);
	});

	test('clicking an entry puts the caret in its heading', async ({
		page
	}) => {
		await open(page);

		await page.locator(`${TOC} a`, { hasText: 'Intro' }).click();
		await expect(page.locator(EDITOR)).toBeFocused();
		await page.keyboard.type('New ');

		await expect(page.locator(`${EDITOR} h1`)).toHaveText('New Intro');
		await expect(page.locator(`${TOC} a`).first()).toHaveText('New Intro');
	});

	test('a new heading shows up as it is typed', async ({ page }) => {
		await open(page);
		await page.locator(`${EDITOR} h2`).click();
		await page.keyboard.press('End');
		await page.keyboard.press('Enter');
		await page.keyboard.type('### Later');

		await expect(page.locator(`${TOC} a`)).toHaveText([
			'Intro',
			'Details',
			'Later'
		]);
	});
});

/**
 * PA-09. The footer follows typing and the selection — a real selection made
 * with the keyboard, which jsdom cannot make.
 */
test.describe('word count', () => {
	test('counts what is typed, and the selection out of the total', async ({
		page
	}) => {
		await page.goto('/?toc');
		await page.locator(EDITOR).click();
		const footer = page.getByLabel('Word count');
		await expect(footer).toHaveText('0 words · 0 characters');

		await page.keyboard.type('one two three');
		await expect(footer).toHaveText('3 words · 13 characters');

		await page.keyboard.press('Shift+Home');
		await expect(footer).toHaveText('3 of 3 words · 13 of 13 characters');

		await page.keyboard.press('End');
		for (let index = 0; index < 5; index += 1) {
			await page.keyboard.press('Shift+ArrowLeft');
		}
		await expect(footer).toHaveText('1 of 3 words · 5 of 13 characters');
	});
});
