import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * PA-06 and PA-07. Shortcuts, a bubble-menu button and a block-menu entry
 * acting on a real selection.
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

test.describe('text alignment', () => {
	test('Mod-Shift-E centres a paragraph, and again takes it off', async ({
		page
	}) => {
		await open(page, 'Centred');
		const paragraph = page.locator(`${EDITOR} p`).first();

		await page.keyboard.press('ControlOrMeta+Shift+e');
		await expect(paragraph).toHaveCSS('text-align', 'center');
		await expect(page.locator('.sandbox__json')).toContainText(
			'"textAlign": "center"'
		);

		await page.keyboard.press('ControlOrMeta+Shift+e');
		await expect(paragraph).not.toHaveAttribute('style', /text-align/);
		await expect(page.locator('.sandbox__json')).not.toContainText(
			'textAlign'
		);
	});

	test('the block menu aligns the block it was opened on', async ({
		page
	}) => {
		await open(page, 'Right');
		await page.keyboard.press('Shift+F10');
		const menu = page.getByRole('menu', { name: 'Block actions' });
		await expect(menu).toBeVisible();

		await menu.getByRole('menuitem', { name: 'Right' }).click();
		await expect(page.locator(`${EDITOR} p`).first()).toHaveCSS(
			'text-align',
			'right'
		);
	});

	test('an editor without the subpath shows a stored alignment and offers no menu entry', async ({
		page
	}) => {
		await page.goto('/');
		await page.locator(EDITOR).click();
		await page.evaluate(() => {
			type Dom = HTMLElement & {
				editor?: {
					commands: { setContent: (content: unknown) => boolean };
				};
			};
			document
				.querySelector<Dom>('.tiptap.ProseMirror')
				?.editor?.commands.setContent({
					type: 'doc',
					content: [
						{
							type: 'paragraph',
							attrs: { textAlign: 'center' },
							content: [{ type: 'text', text: 'Kept' }]
						}
					]
				});
		});
		const paragraph = page.locator(`${EDITOR} p`, { hasText: 'Kept' });
		await expect(paragraph).toHaveCSS('text-align', 'center');

		await paragraph.click();
		await page.keyboard.press('Shift+F10');
		const menu = page.getByRole('menu', { name: 'Block actions' });
		await expect(menu).toBeVisible();
		await expect(
			menu.getByRole('menuitem', { name: 'Center' })
		).toHaveCount(0);
	});
});
