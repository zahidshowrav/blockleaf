import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * Embeds. The slash menu's address field takes focus away from the editor,
 * and a frame swallows clicks unless the page stops it — both are things
 * only a browser shows.
 */

const PLAYER = 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ';

const open = async (page: Page) => {
	// The tests never reach the real provider: every frame gets an empty page.
	await page.route(/youtube-nocookie\.com|player\.vimeo\.com/, (route) =>
		route.fulfill({ contentType: 'text/html', body: '<html></html>' })
	);
	await page.goto('/?embeds');
	await page.locator(EDITOR).click();
};

const json = (page: Page) => page.locator('.sandbox__json');

const frame = (page: Page) => page.locator(`${EDITOR} iframe.blockleaf-embed`);

/** Pastes text the way the browser does, with a real `paste` event. */
const paste = (page: Page, text: string) =>
	page.locator(EDITOR).evaluate((element, value) => {
		const clipboardData = new DataTransfer();
		clipboardData.setData('text/plain', value);
		element.dispatchEvent(
			new ClipboardEvent('paste', {
				clipboardData,
				bubbles: true,
				cancelable: true
			})
		);
	}, text);

const insertFromSlashMenu = async (page: Page, url: string) => {
	await page.keyboard.type('/embed');
	await page.keyboard.press('Enter');
	const field = page.getByRole('textbox', { name: 'Embed address' });
	await expect(field).toBeFocused();
	await field.fill(url);
	await field.press('Enter');
};

test.describe('embeds', () => {
	test('the slash menu asks for an address and embeds the player', async ({
		page
	}) => {
		await open(page);
		await insertFromSlashMenu(
			page,
			'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
		);

		await expect(frame(page)).toHaveAttribute('src', PLAYER);
		await expect(frame(page)).toHaveAttribute('title', 'YouTube video');
		await expect(json(page)).toContainText('"type": "embed"');
		await expect(page.locator(EDITOR)).not.toContainText('/embed');
	});

	test('the address field says why it refused an address, and Escape goes back', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('/embed');
		await page.keyboard.press('Enter');
		const field = page.getByRole('textbox', { name: 'Embed address' });
		await field.fill('https://example.com/video');
		await field.press('Enter');

		await expect(page.getByRole('alert')).toContainText(
			'This link cannot be embedded'
		);
		await expect(field).toHaveAttribute('aria-invalid', 'true');
		await expect(frame(page)).toHaveCount(0);

		await field.press('Escape');
		await expect(field).toHaveCount(0);
		await expect(page.locator(EDITOR)).toBeFocused();
		await expect(page.locator(EDITOR)).toContainText('/embed');
	});

	test('a supported link pasted alone on an empty line becomes an embed', async ({
		page
	}) => {
		await open(page);
		await paste(page, 'https://vimeo.com/76979871');

		await expect(frame(page)).toHaveAttribute(
			'src',
			'https://player.vimeo.com/video/76979871'
		);
	});

	test('a click selects the embed rather than reaching the player, and the toolbar sizes it', async ({
		page
	}) => {
		await open(page);
		await insertFromSlashMenu(page, 'https://youtu.be/dQw4w9WgXcQ');
		await expect(frame(page)).toBeVisible();
		// A new embed is selected; move off it first.
		await page.keyboard.press('ArrowDown');
		await expect(frame(page)).not.toHaveClass(/ProseMirror-selectednode/);

		// The editor lies over an unselected frame, which is the point; the
		// click lands where the frame is drawn.
		await frame(page).click({ force: true });
		await expect(frame(page)).toHaveClass(/ProseMirror-selectednode/);
		const toolbar = page.getByRole('toolbar', { name: 'Media' });
		await expect(toolbar).toBeVisible();

		await toolbar.getByRole('button', { name: 'Full width' }).click();
		await expect(frame(page)).toHaveAttribute('data-width', 'full');
		await expect(page.locator('.blockleaf-resize')).toBeVisible();

		// Selected, the player takes the click.
		await frame(page).click();
		await expect
			.poll(() => page.evaluate(() => document.activeElement?.tagName))
			.toBe('IFRAME');
	});

	test('a link preview asks for an address, shows its host, then what the host fetched', async ({
		page
	}) => {
		await open(page);
		await page.keyboard.type('/preview');
		await page.keyboard.press('Enter');
		const field = page.getByRole('textbox', {
			name: 'Link preview address'
		});
		await expect(field).toBeFocused();
		await field.fill('http://example.com/a');
		await field.press('Enter');
		await expect(page.getByRole('alert')).toContainText('https://');

		await field.fill('https://example.com/notes');
		await field.press('Enter');
		const card = page.locator(`${EDITOR} a.blockleaf-link-preview`);
		await expect(card).toHaveAttribute('href', 'https://example.com/notes');
		await expect(card).toContainText('A page at /notes');
		await expect(json(page)).toContainText('"title": "A page at /notes"');

		// A click selects the card; it does not follow the link.
		const url = page.url();
		await page.keyboard.press('ArrowDown');
		await card.click();
		expect(page.url()).toBe(url);
		await expect(card).toHaveClass(/ProseMirror-selectednode/);
		await expect(
			page.getByRole('toolbar', { name: 'Media' })
		).toBeVisible();
	});
});
