import { expect, test, type Page } from '@playwright/test';

import { EDITOR, dropFile } from './helpers.js';

/**
 * PA-12, PA-13. Video and audio arrive the way images do — dropped,
 * pasted or picked — and become their own blocks. Which block a file becomes,
 * and how a click on a player behaves inside the editor, is
 * browser behaviour jsdom cannot show.
 */

const open = async (page: Page, path = '/?media') => {
	await page.goto(path);
	await page.locator(EDITOR).click();
};

const json = (page: Page) => page.locator('.sandbox__json');

test.describe('media blocks', () => {
	test('a dropped video becomes a video block with controls', async ({
		page
	}) => {
		await open(page);
		await dropFile(page, 'launch.mp4', 'start', 'video/mp4');

		const video = page.locator(`${EDITOR} video.blockleaf-video`);
		await expect(video).toBeVisible({ timeout: 10000 });
		await expect(video).toHaveAttribute('controls', '');
		await expect(video).toHaveAttribute('src', '/media/launch.mp4');
		await expect(json(page)).toContainText('"type": "video"');
	});

	test('a dropped sound becomes audio, named after the file', async ({
		page
	}) => {
		await open(page);
		await dropFile(page, 'voice_memo.m4a', 'start', 'audio/mp4');

		const audio = page.locator(`${EDITOR} audio.blockleaf-audio`);
		await expect(audio).toBeAttached({ timeout: 10000 });
		await expect(audio).toHaveAttribute('aria-label', 'voice memo');
		await expect(json(page)).toContainText('"type": "audio"');
	});

	test('a selected video can be aligned and captioned from its toolbar', async ({
		page
	}) => {
		await open(page);
		await dropFile(page, 'launch.mp4', 'start', 'video/mp4');
		const video = page.locator(`${EDITOR} video`);
		await expect(video).toBeVisible({ timeout: 10000 });

		// Near the top middle: the controls are along the bottom, and the
		// drag handle sits over the top-left corner when there is no gutter.
		await video.click({ position: { x: 150, y: 16 } });
		const toolbar = page.getByRole('toolbar', { name: 'Media' });
		await expect(toolbar).toBeVisible();

		await toolbar.getByRole('button', { name: 'Align centre' }).click();
		await expect(video).toHaveAttribute('data-align', 'center');

		await toolbar.getByRole('button', { name: 'Toggle caption' }).click();
		await expect(page.locator(EDITOR)).toBeFocused();
		await page.keyboard.type('Launch day');
		await expect(page.locator(`${EDITOR} figure > figcaption`)).toHaveText(
			'Launch day'
		);
		// Unaligned, the caption follows the video into the middle.
		await expect(page.locator(`${EDITOR} figcaption`)).toHaveCSS(
			'text-align',
			'center'
		);
	});

	test('the slash menu offers video and audio', async ({ page }) => {
		await open(page);
		await page.keyboard.type('/');
		const menu = page.getByRole('listbox');
		for (const name of ['Video', 'Audio']) {
			await expect(menu.getByRole('option', { name })).toBeVisible();
		}
	});

	test('without the media subpath a video is refused and only images upload', async ({
		page
	}) => {
		await open(page, '/');
		await dropFile(page, 'launch.mp4', 'start', 'video/mp4');
		await expect(page.locator('.sandbox__upload-error')).toBeVisible();
		await expect(page.locator(`${EDITOR} video`)).toHaveCount(0);
	});
});
