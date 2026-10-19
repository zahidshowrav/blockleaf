import { type Page } from '@playwright/test';

export const EDITOR = '.tiptap.ProseMirror';

/**
 * Drops a real `File` onto the editor.
 *
 * Coordinates are not optional. prosemirror-view resolves the drop position
 * with `posAtCoords` *before* it consults `handleDrop`, so an event defaulting
 * to 0,0 resolves to nothing and returns early — the plugin never sees it.
 */
export const dropFile = async (
	page: Page,
	name: string,
	where: 'start' | 'end' = 'start'
) => {
	const editor = page.locator(EDITOR);

	const dataTransfer = await page.evaluateHandle((fileName: string) => {
		const transfer = new DataTransfer();
		transfer.items.add(
			new File([new Uint8Array([137, 80, 78, 71])], fileName, {
				type: 'image/png'
			})
		);
		return transfer;
	}, name);

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
