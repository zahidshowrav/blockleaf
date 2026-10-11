import { Editor } from '@tiptap/core';
import { describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';

describe('stable block ids (EC-05)', () => {
	it('assigns unique id to top-level blocks missing an id', async () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'First paragraph' }]
					},
					{
						type: 'heading',
						attrs: { level: 1 },
						content: [{ type: 'text', text: 'Heading' }]
					}
				]
			}
		});

		await new Promise((resolve) => setTimeout(resolve, 20));

		const json = editor.getJSON();
		const p = json.content?.[0];
		const h = json.content?.[1];

		expect(p?.attrs?.id).toBeDefined();
		expect(typeof p?.attrs?.id).toBe('string');
		expect(h?.attrs?.id).toBeDefined();
		expect(typeof h?.attrs?.id).toBe('string');
		expect(p?.attrs?.id).not.toBe(h?.attrs?.id);

		editor.destroy();
	});

	it('preserves existing block id across loads', () => {
		const existingId = 'stable-custom-uuid-1234';
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						attrs: { id: existingId },
						content: [{ type: 'text', text: 'Stable block' }]
					}
				]
			}
		});

		const json = editor.getJSON();
		expect(json.content?.[0]?.attrs?.id).toBe(existingId);

		editor.destroy();
	});

	it('assigns unique ids in minimal preset for paragraph blocks', async () => {
		const editor = new Editor({
			extensions: createExtensions('minimal'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						content: [{ type: 'text', text: 'Minimal block' }]
					}
				]
			}
		});

		await new Promise((resolve) => setTimeout(resolve, 20));

		const json = editor.getJSON();
		expect(json.content?.[0]?.attrs?.id).toBeDefined();
		expect(typeof json.content?.[0]?.attrs?.id).toBe('string');

		editor.destroy();
	});

	it('generates distinct id for split blocks', async () => {
		const editor = new Editor({
			extensions: createExtensions('standard'),
			content: {
				type: 'doc',
				content: [
					{
						type: 'paragraph',
						attrs: { id: 'original-block-id' },
						content: [{ type: 'text', text: 'Hello world' }]
					}
				]
			}
		});

		await new Promise((resolve) => setTimeout(resolve, 20));

		editor.commands.setTextSelection(6);
		editor.commands.splitBlock();

		const json = editor.getJSON();
		expect(json.content).toHaveLength(2);
		const id1 = json.content?.[0]?.attrs?.id;
		const id2 = json.content?.[1]?.attrs?.id;
		expect(id1).toBeDefined();
		expect(id2).toBeDefined();
		expect(id1).not.toBe(id2);

		editor.destroy();
	});
});
