import { act, render, screen } from '@testing-library/react';
import type { SuggestionKeyDownProps } from '@tiptap/suggestion';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { EMOJI_DATA } from '../src/core/emoji/data.js';
import { createExtensions } from '../src/core/extensions.js';
import { defaultLabels, resolveLabels } from '../src/core/labels.js';
import {
	EMOJI_EXTENSION_NAME,
	EmojiMenu,
	createEmoji,
	parseEmojiData,
	searchEmoji,
	withEmoji,
	type EmojiItem,
	type EmojiMenuRef
} from '../src/emoji.js';

const all = parseEmojiData(EMOJI_DATA);
const first = (query: string) => searchEmoji(all, query)[0]?.emoji;

describe('emoji (PA-03)', () => {
	describe('the built-in list', () => {
		it('parses every line into an emoji, a name and keywords', () => {
			expect(all.length).toBeGreaterThan(1800);
			expect(all[0]).toEqual({
				emoji: '😀',
				name: 'grinning face',
				keywords: expect.arrayContaining(['smile']) as string[]
			});
			expect(all.every((item) => item.emoji && item.name)).toBe(true);
		});

		it('stops at Emoji 14.0, which current systems can draw', () => {
			const emoji = new Set(all.map((item) => item.emoji));

			expect(emoji.has('🫠')).toBe(true); // melting face, 14.0
			expect(emoji.has('🫨')).toBe(false); // shaking face, 15.0
		});
	});

	describe('search', () => {
		it('finds an emoji by its shortcode-style keyword', () => {
			expect(first('tada')).toBe('🎉');
			expect(first('+1')).toBe('👍');
			expect(first('rocket')).toBe('🚀');
		});

		it('reads an underscore as a space', () => {
			expect(first('thumbs_up')).toBe('👍');
		});

		it('ranks a name that starts with the query above one that contains it', () => {
			const names = searchEmoji(all, 'heart', 20).map(
				(item) => item.name
			);

			expect(names[0]?.startsWith('heart')).toBe(true);
		});

		it('returns at most `limit` matches, and none for nonsense', () => {
			expect(searchEmoji(all, 'face', 5)).toHaveLength(5);
			expect(searchEmoji(all, 'qqqzzz')).toEqual([]);
		});

		it('ignores case', () => {
			expect(first('TADA')).toBe('🎉');
		});
	});

	describe('withEmoji', () => {
		it('adds the picker once, replacing one already there', () => {
			const twice = withEmoji(withEmoji(createExtensions('standard')));

			expect(
				twice.filter(
					(extension) => extension.name === EMOJI_EXTENSION_NAME
				)
			).toHaveLength(1);
			expect(createEmoji()[0]?.name).toBe(EMOJI_EXTENSION_NAME);
		});
	});
});

describe('emoji picker (PA-03)', () => {
	const party: EmojiItem = {
		emoji: '🎉',
		name: 'party popper',
		keywords: []
	};
	const rocket: EmojiItem = { emoji: '🚀', name: 'rocket', keywords: [] };

	const renderMenu = (query: string, minQueryLength = 2) => {
		const ref = createRef<EmojiMenuRef>();
		const command = vi.fn();
		const items = vi.fn(() => [party, rocket]);
		render(
			<EmojiMenu
				ref={ref}
				query={query}
				items={items}
				command={command}
				labels={defaultLabels}
				minQueryLength={minQueryLength}
			/>
		);
		return { ref, command, items };
	};

	it('shows nothing, and asks for nothing, until enough is typed', async () => {
		const { ref, items } = renderMenu('p');
		await act(async () => undefined);

		expect(screen.queryByRole('listbox')).toBeNull();
		expect(screen.queryByRole('status')).toBeNull();
		expect(items).not.toHaveBeenCalled();
		expect(
			ref.current?.onKeyDown({
				event: new KeyboardEvent('keydown', { key: 'Enter' })
			} as SuggestionKeyDownProps)
		).toBe(false);
	});

	it('lists each emoji with its name, which is what is announced', async () => {
		renderMenu('pa');

		const option = await screen.findByRole('option', {
			name: 'party popper'
		});
		expect(option.textContent).toBe('🎉party popper');
		expect(screen.getByRole('listbox').getAttribute('aria-label')).toBe(
			defaultLabels.emoji.menu
		);
	});

	it('picks with the arrow keys and Enter', async () => {
		const { ref, command } = renderMenu('pa');
		await screen.findAllByRole('option');

		act(() => {
			ref.current?.onKeyDown({
				event: new KeyboardEvent('keydown', { key: 'ArrowDown' })
			} as SuggestionKeyDownProps);
		});
		act(() => {
			ref.current?.onKeyDown({
				event: new KeyboardEvent('keydown', { key: 'Enter' })
			} as SuggestionKeyDownProps);
		});

		expect(command).toHaveBeenCalledWith(rocket);
	});

	it('takes its strings from the label set', async () => {
		render(
			<EmojiMenu
				query="zz"
				items={() => []}
				command={vi.fn()}
				labels={resolveLabels({ emoji: { empty: 'Aucun emoji' } })}
			/>
		);

		expect(await screen.findByText('Aucun emoji')).toBeTruthy();
	});
});
