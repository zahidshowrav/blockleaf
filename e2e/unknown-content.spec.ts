import { expect, test } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * FC-03. jsdom cannot see where the caret goes around an atom, and that is
 * where a placeholder would trap or swallow it.
 */
test.describe('unknown content placeholders', () => {
	test('the caret moves past a placeholder, and the payload is saved back', async ({
		page
	}) => {
		await page.goto('/?unknown');

		const editor = page.locator(EDITOR);
		const block = editor.locator('[data-unknown-type="poll"]');
		await expect(block).toHaveText('Unsupported block: poll');
		await expect(
			editor.locator('[data-unknown-type="mention"]')
		).toBeVisible();
		await expect(editor).toHaveAttribute('contenteditable', 'true');

		// Click the placeholder: it is selected as a whole, not entered.
		await block.click();
		await expect(block).toHaveClass(/ProseMirror-selectednode/);

		// Down from the placeholder lands in the paragraph after it, where
		// typing goes into that paragraph rather than replacing the block.
		await page.keyboard.press('ArrowDown');
		await page.keyboard.press('End');
		await page.keyboard.type(' edited');
		await expect(editor.locator('p').last()).toHaveText('After edited');
		await expect(block).toBeVisible();

		const json = page.locator('.sandbox__json');
		await expect(json).toContainText('After edited');
		await expect(json).toContainText('"type": "poll"');
		await expect(json).toContainText('"question": "Lunch?"');
		await expect(json).toContainText('"type": "mention"');
		await expect(json).toContainText('"thread": "c1"');
		await expect(json).not.toContainText('blockleafUnknown');
	});

	test('a selected placeholder is deleted by Backspace, like any block', async ({
		page
	}) => {
		await page.goto('/?unknown');

		const editor = page.locator(EDITOR);
		const block = editor.locator('[data-unknown-type="poll"]');
		await block.click();
		await page.keyboard.press('Backspace');

		await expect(block).toHaveCount(0);
		await expect(page.locator('.sandbox__json')).not.toContainText(
			'"type": "poll"'
		);
	});
});
