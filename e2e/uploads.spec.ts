import { test, expect, type Page } from '@playwright/test';

/**
 * The MC exit condition, in a browser: dropping an image works, shows
 * progress, survives a mid-upload navigation, and a failed upload is
 * retryable. jsdom can assert the plugin state; only a browser can assert
 * that a real `drop` event with real files reaches it.
 */

const dropFile = async (
	page: Page,
	name: string,
	where: 'start' | 'end' = 'start'
) => {
	const editor = page.locator('.tiptap.ProseMirror');

	const dataTransfer = await page.evaluateHandle((fileName: string) => {
		const transfer = new DataTransfer();
		transfer.items.add(
			new File([new Uint8Array([137, 80, 78, 71])], fileName, {
				type: 'image/png'
			})
		);
		return transfer;
	}, name);

	// Coordinates are not optional. prosemirror-view resolves the drop
	// position with `posAtCoords` *before* it consults `handleDrop`, so an
	// event defaulting to 0,0 resolves to nothing and returns early — the
	// plugin never sees it.
	const box = await editor.boundingBox();
	if (!box) throw new Error('the editor has no box to drop onto');

	await editor.dispatchEvent('drop', {
		dataTransfer,
		clientX: Math.round(box.x + box.width / 2),
		clientY: Math.round(
			where === 'start' ? box.y + 12 : box.y + box.height - 12
		)
	});
};

test.describe('Uploads in a real browser', () => {
	test('a dropped image uploads, shows progress, and lands in the document', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page.locator('.tiptap.ProseMirror')).toBeVisible();

		await dropFile(page, 'photo.png');

		const placeholder = page.locator('.blockleaf-upload');
		await expect(placeholder).toBeVisible();
		await expect(placeholder).toContainText('photo.png');
		await expect(placeholder.locator('[role="progressbar"]')).toBeVisible();

		const image = page.locator('.tiptap.ProseMirror img.blockleaf-image');
		await expect(image).toBeVisible({ timeout: 10000 });
		await expect(placeholder).toHaveCount(0);

		// The stored document is the product: the image has to be in it.
		await expect(page.locator('.sandbox__json')).toContainText('"image"');
	});

	test('progress reaches a real percentage, not just a spinner', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page.locator('.tiptap.ProseMirror')).toBeVisible();

		await dropFile(page, 'slow.png');

		const bar = page.locator('.blockleaf-upload [role="progressbar"]');
		await expect(bar).toHaveAttribute('aria-valuenow', /\d+/, {
			timeout: 5000
		});
	});

	test('cancelling removes the placeholder and reports no error', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page.locator('.tiptap.ProseMirror')).toBeVisible();

		await dropFile(page, 'cancel-me.png');

		const placeholder = page.locator('.blockleaf-upload');
		await expect(placeholder).toBeVisible();
		await placeholder.locator('[data-action="cancel"]').click();

		await expect(placeholder).toHaveCount(0);
		await expect(page.locator('.sandbox__upload-error')).toHaveCount(0);
		await expect(
			page.locator('.tiptap.ProseMirror img.blockleaf-image')
		).toHaveCount(0);
	});

	test('a failed upload stays on screen and succeeds on retry', async ({
		page
	}) => {
		await page.goto('/');
		await expect(page.locator('.tiptap.ProseMirror')).toBeVisible();

		await dropFile(page, 'fail-once.png');

		const placeholder = page.locator('.blockleaf-upload');
		await expect(placeholder).toHaveAttribute('data-state', 'error', {
			timeout: 10000
		});
		await expect(page.locator('.sandbox__upload-error')).toBeVisible();

		await placeholder.locator('[data-action="retry"]').click();

		await expect(
			page.locator('.tiptap.ProseMirror img.blockleaf-image')
		).toBeVisible({ timeout: 10000 });
		await expect(placeholder).toHaveCount(0);
	});

	test('editing above a failed upload does not break its retry', async ({
		page
	}) => {
		await page.goto('/');
		const editor = page.locator('.tiptap.ProseMirror');
		await expect(editor).toBeVisible();

		await editor.click();
		await page.keyboard.type('First line');
		await page.keyboard.press('Enter');
		await page.keyboard.type('Second line');

		// Dropped at the end, so the paragraph edited below stays free of
		// the placeholder widget.
		await dropFile(page, 'fail-then-move.png', 'end');
		const placeholder = page.locator('.blockleaf-upload');
		await expect(placeholder).toHaveAttribute('data-state', 'error', {
			timeout: 10000
		});

		// Edit above the failed upload. Its position is a mapped decoration,
		// so it has to follow the text rather than go stale.
		const firstParagraph = editor.locator('p').first();
		await firstParagraph.click();
		await page.keyboard.press('Home');
		await page.keyboard.type('Prefix ');
		await expect(firstParagraph).toHaveText('Prefix First line');

		await placeholder.locator('[data-action="retry"]').click();

		await expect(
			page.locator('.tiptap.ProseMirror img.blockleaf-image')
		).toBeVisible({ timeout: 10000 });
		await expect(placeholder).toHaveCount(0);
		await expect(firstParagraph).toHaveText('Prefix First line');
	});

	test('navigating away mid-upload does not raise an error', async ({
		page
	}) => {
		const failures: string[] = [];
		page.on('pageerror', (error) => failures.push(error.message));

		await page.goto('/');
		await expect(page.locator('.tiptap.ProseMirror')).toBeVisible();

		await dropFile(page, 'abandoned.png');
		await expect(page.locator('.blockleaf-upload')).toBeVisible();

		// The editor unmounts with a request still in flight.
		await page.reload();
		await expect(page.locator('.tiptap.ProseMirror')).toBeVisible();

		expect(failures).toEqual([]);
	});
});
