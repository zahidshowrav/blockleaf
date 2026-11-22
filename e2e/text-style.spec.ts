import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * PA-07. A shortcut and a bubble-menu button acting on a real selection.
 */

const open = async (page: Page, text: string) => {
	await page.goto('/?textstyle');
	await page.locator(EDITOR).click();
	await expect(page.locator(EDITOR)).toBeFocused();
	await page.keyboard.type(text);
};

/**
 * Selects the last `count` characters typed, and waits until the editor's
 * own selection — not just the browser's — covers them. A shortcut sent
 * before the editor has read the selection acts on the old, empty one.
 */
const selectBack = async (page: Page, count: number) => {
	for (let index = 0; index < count; index += 1) {
		await page.keyboard.press('Shift+ArrowLeft');
	}
	await page.waitForFunction((size) => {
		type Dom = HTMLElement & {
			editor?: { state: { selection: { from: number; to: number } } };
		};
		const selection = document.querySelector<Dom>('.tiptap.ProseMirror')
			?.editor?.state.selection;
		return (
			selection !== undefined && selection.to - selection.from === size
		);
	}, count);
};

test.describe('subscript and superscript', () => {
	test('Mod-, and Mod-. toggle them, never both at once', async ({
		page
	}) => {
		await open(page, 'H2');
		await selectBack(page, 1);

		await page.keyboard.press('ControlOrMeta+,');
		await expect(page.locator(`${EDITOR} sub`)).toHaveText('2');

		await page.keyboard.press('ControlOrMeta+.');
		await expect(page.locator(`${EDITOR} sup`)).toHaveText('2');
		await expect(page.locator(`${EDITOR} sub`)).toHaveCount(0);
		await expect(page.locator('.sandbox__json')).toContainText(
			'"type": "superscript"'
		);
	});

	test('the bubble menu offers them where the subpath is loaded', async ({
		page
	}) => {
		await open(page, 'x2');
		await selectBack(page, 1);

		await page.getByRole('button', { name: 'Superscript' }).click();
		await expect(page.locator(`${EDITOR} sup`)).toHaveText('2');
		await expect(
			page.getByRole('button', { name: 'Superscript' })
		).toHaveAttribute('aria-pressed', 'true');
	});

	test('the bubble menu does not offer them where it is not', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.keyboard.type('x2');
		await selectBack(page, 1);

		await expect(
			page.getByRole('toolbar', { name: 'Text formatting' })
		).toBeVisible();
		await expect(
			page.getByRole('button', { name: 'Superscript' })
		).toHaveCount(0);
	});
});
