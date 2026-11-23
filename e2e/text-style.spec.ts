import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * PA-05, PA-06, PA-07, PA-10, PA-11 and PA-22. Shortcuts, bubble-menu buttons, a palette and a
 * block-menu entry acting on a real selection — and the colour a token
 * actually resolves to, which only a browser computes.
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

test.describe('text color', () => {
	test('the palette colours the selection with a token', async ({ page }) => {
		await open(page, 'Warning');
		await selectBack(page, 7);

		await page.getByRole('button', { name: 'Color', exact: true }).click();
		const palette = page.getByRole('radiogroup', {
			name: 'Text',
			exact: true
		});
		await expect(palette).toBeVisible();
		await palette.getByRole('radio', { name: 'Red' }).click();

		const span = page.locator(`${EDITOR} span[data-color="red"]`);
		await expect(span).toHaveText('Warning');
		await expect(span).toHaveCSS('color', 'rgb(185, 28, 28)');
		await expect(page.locator('.sandbox__json')).toContainText(
			'"color": "red"'
		);
	});

	test('the same token is a lighter red on the dark theme', async ({
		page
	}) => {
		await page.emulateMedia({ colorScheme: 'dark' });
		await open(page, 'Warning');
		await selectBack(page, 7);
		await page.getByRole('button', { name: 'Color', exact: true }).click();
		await page
			.getByRole('radiogroup', { name: 'Text', exact: true })
			.getByRole('radio', { name: 'Red' })
			.click();

		await expect(
			page.locator(`${EDITOR} span[data-color="red"]`)
		).toHaveCSS('color', 'rgb(248, 113, 113)');
	});

	test('the palette works from the keyboard', async ({ page }) => {
		await open(page, 'Note');
		await selectBack(page, 4);
		const button = page.getByRole('button', { name: 'Color', exact: true });
		await expect(button).toBeVisible();
		await button.focus();
		await page.keyboard.press('Enter');

		// Focus lands on the text group's "Default"; two steps right is Brown.
		const text = page.getByRole('radiogroup', {
			name: 'Text',
			exact: true
		});
		await expect(
			text.getByRole('radio', { name: 'Default' })
		).toBeFocused();
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowRight');
		await expect(text.getByRole('radio', { name: 'Brown' })).toBeFocused();
		await page.keyboard.press('Enter');

		await expect(
			page.locator(`${EDITOR} span[data-color="brown"]`)
		).toHaveText('Note');
	});
});

test.describe('font family', () => {
	test('the font panel sets the selection in a family token', async ({
		page
	}) => {
		await open(page, 'Quote');
		await selectBack(page, 5);

		await page.getByRole('button', { name: 'Font' }).click();
		const group = page.getByRole('radiogroup', { name: 'Typeface' });
		await expect(group).toBeVisible();
		await expect(
			group.getByRole('radio', { name: 'Default' })
		).toBeFocused();
		await group.getByRole('radio', { name: 'Serif', exact: true }).click();

		const span = page.locator(`${EDITOR} span[data-font-family="serif"]`);
		await expect(span).toHaveText('Quote');
		await expect(span).toHaveCSS('font-family', /serif/);
		await expect(page.locator('.sandbox__json')).toContainText(
			'"family": "serif"'
		);
	});
});

test.describe('font size', () => {
	test('Tab reaches the size group, and Large is 1.25 times the text', async ({
		page
	}) => {
		await open(page, 'Big');
		await selectBack(page, 3);
		await page.getByRole('button', { name: 'Font' }).click();
		await expect(
			page
				.getByRole('radiogroup', { name: 'Typeface' })
				.getByRole('radio', {
					name: 'Default'
				})
		).toBeFocused();

		await page.keyboard.press('Tab');
		const size = page.getByRole('radiogroup', { name: 'Size' });
		await expect(
			size.getByRole('radio', { name: 'Default' })
		).toBeFocused();
		await page.keyboard.press('ArrowRight');
		await page.keyboard.press('ArrowRight');
		await expect(
			size.getByRole('radio', { name: 'Large', exact: true })
		).toBeFocused();
		await page.keyboard.press('Enter');

		const span = page.locator(`${EDITOR} span[data-font-size="lg"]`);
		await expect(span).toHaveText('Big');
		const [inner, outer] = await span.evaluate((element) => [
			Number.parseFloat(getComputedStyle(element).fontSize),
			Number.parseFloat(getComputedStyle(element.parentElement!).fontSize)
		]);
		expect(inner).toBeCloseTo(outer * 1.25, 1);
	});
});

test.describe('background colour', () => {
	test('the colour panel sets a background token on the highlight', async ({
		page
	}) => {
		await open(page, 'Shaded');
		await selectBack(page, 6);
		await page.getByRole('button', { name: 'Color', exact: true }).click();

		await page
			.getByRole('radiogroup', { name: 'Background' })
			.getByRole('radio', { name: 'Blue' })
			.click();

		const mark = page.locator(`${EDITOR} mark[data-color="blue"]`);
		await expect(mark).toHaveText('Shaded');
		await expect(mark).toHaveCSS('background-color', 'rgb(219, 232, 254)');
		await expect(page.locator('.sandbox__json')).toContainText(
			'"type": "highlight"'
		);
	});
});
