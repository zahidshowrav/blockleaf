import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * PA-19. A print stylesheet is only visible to a real browser's print media,
 * which jsdom does not have.
 */

type Dom = HTMLElement & {
	editor?: { commands: { setContent: (content: unknown) => boolean } };
};

const content = {
	type: 'doc',
	content: [
		{
			type: 'paragraph',
			content: [
				{
					type: 'text',
					text: 'Blockleaf',
					marks: [
						{
							type: 'link',
							attrs: { href: 'https://blockleaf.dev' }
						}
					]
				}
			]
		},
		{
			type: 'codeBlock',
			attrs: { language: null },
			content: [{ type: 'text', text: 'const x = 1;' }]
		}
	]
};

const openWithContent = async (page: Page) => {
	await page.goto('/');
	await page.locator(EDITOR).click();
	await page.evaluate((doc) => {
		document
			.querySelector<Dom>('.tiptap.ProseMirror')
			?.editor?.commands.setContent(doc);
	}, content);
	await expect(page.locator(`${EDITOR} pre`)).toBeVisible();
};

const background = (page: Page) =>
	page
		.locator('.blockleaf-editor')
		.evaluate((element) =>
			getComputedStyle(element).getPropertyValue('--bl-color-bg').trim()
		);

test.describe('printing', () => {
	test('the chrome does not print', async ({ page }) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('/');
		const menu = page.locator('.blockleaf-slash-menu');
		await expect(menu).toBeVisible();

		await page.emulateMedia({ media: 'print' });
		await expect(menu).toBeHidden();
	});

	test('a dark system theme prints light', async ({ page }) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await openWithContent(page);
		expect(await background(page)).toBe('#0d1117');

		await page.emulateMedia({ media: 'print', colorScheme: 'dark' });
		expect(await background(page)).toBe('#ffffff');
	});

	test('a forced dark theme prints light', async ({ page }) => {
		await openWithContent(page);
		await page
			.locator('.blockleaf-editor')
			.evaluate((element) => element.setAttribute('data-theme', 'dark'));
		expect(await background(page)).toBe('#0d1117');

		await page.emulateMedia({ media: 'print' });
		expect(await background(page)).toBe('#ffffff');
	});

	test('a link prints its address and code wraps', async ({ page }) => {
		await openWithContent(page);
		await page.emulateMedia({ media: 'print' });

		const after = await page
			.locator(`${EDITOR} a`)
			.evaluate((link) => getComputedStyle(link, '::after').content);
		expect(after).toContain('https://blockleaf.dev');

		const whiteSpace = await page
			.locator(`${EDITOR} pre`)
			.evaluate((pre) => getComputedStyle(pre).whiteSpace);
		expect(whiteSpace).toBe('pre-wrap');
	});
});
