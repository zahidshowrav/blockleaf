import { expect, test, type Page } from '@playwright/test';

import { EDITOR } from './helpers.js';

/**
 * PA-01. A toggle hides its body with `display: none`, so where the caret
 * goes around it is decided by the browser — which jsdom cannot show.
 */

const TOGGLE = `${EDITOR} .blockleaf-details`;
const BUTTON = `${TOGGLE} > .blockleaf-details__toggle`;

/** An open toggle titled "Title" with one body line, "Body". */
const toggleWithBody = async (page: Page) => {
	await page.goto('/');
	await page.locator(EDITOR).click();
	await page.keyboard.type('/toggle');
	await expect(page.locator('.blockleaf-slash-menu')).toBeVisible();
	await page.keyboard.press('Enter');
	await expect(page.locator(TOGGLE)).toBeVisible();

	await page.keyboard.type('Title');
	await page.keyboard.press('Enter');
	await page.keyboard.type('Body');
};

/**
 * Waits until the editor's own selection — not just the browser's — is in
 * the block that reads `text`, at `offset` if given.
 *
 * A key sent straight after a click or a Home can reach the editor before it
 * has read the new selection, and then acts on the old one. No person types
 * that fast, but a test does.
 */
const caretIn = (page: Page, text: string, offset?: number) =>
	page.waitForFunction(
		([expected, at]) => {
			type Dom = HTMLElement & {
				editor?: {
					state: {
						selection: {
							$from: {
								parent: { textContent: string };
								parentOffset: number;
							};
						};
					};
				};
			};
			const dom = document.querySelector<Dom>('.tiptap.ProseMirror');
			const $from = dom?.editor?.state.selection.$from;
			return (
				$from?.parent.textContent === expected &&
				(at === null || $from.parentOffset === at)
			);
		},
		[text, offset ?? null] as const
	);

const body = (page: Page) =>
	page.locator(`${TOGGLE} .blockleaf-details__content > p`, {
		hasText: 'Body'
	});

test.describe('toggle block', () => {
	test('the slash menu inserts an open toggle, and its button closes it', async ({
		page
	}) => {
		await toggleWithBody(page);
		const button = page.locator(BUTTON);
		await expect(button).toHaveAttribute('aria-expanded', 'true');
		await expect(body(page)).toBeVisible();

		await button.click();
		await expect(button).toHaveAttribute('aria-expanded', 'false');
		await expect(body(page)).toBeHidden();
		await expect(page.locator('.sandbox__json')).toContainText(
			'"open": false'
		);

		await button.click();
		await expect(body(page)).toBeVisible();
	});

	test('closing it from the body leaves the caret in the title', async ({
		page
	}) => {
		await toggleWithBody(page);
		await page.locator(BUTTON).click();
		await expect(body(page)).toBeHidden();

		await page.keyboard.type('!');
		await expect(
			page.locator(`${TOGGLE} .blockleaf-details__content > p`).first()
		).toHaveText('Title!');
	});

	test('Enter at the end of a closed title starts a block after the toggle', async ({
		page
	}) => {
		await toggleWithBody(page);
		await page.locator(BUTTON).click();
		await page.keyboard.press('End');
		await caretIn(page, 'Title', 'Title'.length);

		await page.keyboard.press('Enter');
		await page.keyboard.type('After');

		await expect(
			page.locator(`${EDITOR} > p`, { hasText: 'After' })
		).toBeVisible();
		await expect(body(page)).toBeHidden();
	});

	test('the arrow keys go round a closed body', async ({ page }) => {
		await toggleWithBody(page);
		// A block after the toggle to arrow down into.
		await page.keyboard.press('Enter');
		await page.keyboard.press('Enter');
		await page.keyboard.type('After');
		await page
			.locator(`${TOGGLE} .blockleaf-details__content > p`)
			.first()
			.click();
		await caretIn(page, 'Title');
		await page.keyboard.press('ControlOrMeta+Enter');
		await expect(body(page)).toBeHidden();

		await page.keyboard.press('ArrowDown');
		await page.keyboard.type('>');

		await expect(body(page)).toBeHidden();
		await expect(body(page)).toHaveText('Body');
		await expect(
			page.locator(`${EDITOR} > p`, { hasText: 'After' })
		).toContainText('>');
	});

	test('Mod-Enter opens and closes it from the keyboard', async ({
		page
	}) => {
		await toggleWithBody(page);
		const button = page.locator(BUTTON);

		await page.keyboard.press('ControlOrMeta+Enter');
		await expect(button).toHaveAttribute('aria-expanded', 'false');

		await page.keyboard.press('ControlOrMeta+Enter');
		await expect(button).toHaveAttribute('aria-expanded', 'true');
	});

	test('Backspace at the start of the title turns it back into blocks', async ({
		page
	}) => {
		await toggleWithBody(page);
		await page
			.locator(`${TOGGLE} .blockleaf-details__content > p`)
			.first()
			.click();
		await caretIn(page, 'Title');
		await page.keyboard.press('Home');
		await caretIn(page, 'Title', 0);
		await page.keyboard.press('Backspace');

		await expect(page.locator(TOGGLE)).toHaveCount(0);
		await expect(page.locator(`${EDITOR} > p`).first()).toHaveText('Title');
	});
});
