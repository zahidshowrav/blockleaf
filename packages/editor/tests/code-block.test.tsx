import { fireEvent, render, waitFor } from '@testing-library/react';
import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import {
	CURATED_LANGUAGES,
	CURATED_LANGUAGE_NAMES,
	createCodeBlock,
	createCodeBlockExtension,
	withCodeBlock
} from '../src/code-block.js';
import { createExtensions } from '../src/core/extensions.js';
import {
	createEmptyDocument,
	type BlockleafDocument
} from '../src/core/schema.js';
import { BlockleafEditor } from '../src/react/editor.js';

const editors: Editor[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
	while (containers.length) containers.pop()?.remove();
});

const mount = (
	extension: ReturnType<typeof createCodeBlock>,
	content = '<pre><code class="language-javascript">const x = 1;</code></pre>'
) => {
	const container = document.createElement('div');
	document.body.append(container);
	containers.push(container);

	const editor = new Editor({
		element: container,
		extensions: withCodeBlock(createExtensions('standard')).map((entry) =>
			entry.name === 'codeBlock' ? extension : entry
		),
		content
	});
	editors.push(editor);
	return { editor, container };
};

describe('curated grammar set (MC-05, F14)', () => {
	it('ships seven languages, not lowlight common', () => {
		expect(CURATED_LANGUAGE_NAMES).toEqual([
			'bash',
			'css',
			'javascript',
			'json',
			'python',
			'typescript',
			'xml'
		]);
	});

	it('exposes the grammars so a host can build on them', () => {
		expect(Object.keys(CURATED_LANGUAGES)).toHaveLength(7);
		expect(typeof CURATED_LANGUAGES.javascript).toBe('function');
	});
});

describe('the code block extension (MC-05)', () => {
	it('replaces the plain code block from StarterKit', () => {
		const { editor } = mount(createCodeBlock());
		expect(editor.schema.nodes.codeBlock).toBeDefined();
	});

	it('highlights a registered language', () => {
		const { container } = mount(createCodeBlock({ picker: false }));
		expect(
			container.querySelectorAll('.hljs-keyword').length
		).toBeGreaterThan(0);
	});

	// An unregistered grammar must degrade to plain text, not throw. The
	// throw happens while the plugin builds its first decorations, so it
	// takes editor construction down with it.
	it('leaves an unregistered language unhighlighted', () => {
		const { container, editor } = mount(
			createCodeBlock({ picker: false }),
			'<pre><code class="language-brainfuck">++++.</code></pre>'
		);
		expect(container.querySelectorAll('.hljs-keyword')).toHaveLength(0);
		expect(editor.getHTML()).toContain('++++.');
	});

	it('opens a document whose language another host registered', () => {
		expect(() =>
			mount(
				createCodeBlock({ picker: false }),
				'<pre><code class="language-rust">fn main() {}</code></pre>'
			)
		).not.toThrow();
	});

	// The language is stored, so dropping it would destroy the author's
	// choice on the next save just because this host lacks the grammar.
	it('keeps an unregistered language rather than stripping it', () => {
		const { editor } = mount(
			createCodeBlock({ picker: false }),
			'<pre><code class="language-rust">fn main() {}</code></pre>'
		);
		const block = editor
			.getJSON()
			.content?.find((node) => node.type === 'codeBlock');

		expect(block?.attrs?.language).toBe('rust');
		expect(editor.getHTML()).toContain('language-rust');
	});

	it('round-trips the language attribute', () => {
		const { editor } = mount(createCodeBlock({ picker: false }));
		const block = editor
			.getJSON()
			.content?.find((node) => node.type === 'codeBlock');

		expect(block?.attrs?.language).toBe('javascript');
		expect(editor.getHTML()).toContain('language-javascript');
	});

	it('takes extra grammars without losing the curated ones', () => {
		const extension = createCodeBlockExtension({
			additionalLanguages: { plaintext: CURATED_LANGUAGES.javascript }
		});
		const options = extension.options as { languageNames?: string[] };

		expect(options.languageNames).toContain('javascript');
		expect(options.languageNames).toContain('plaintext');
	});

	it('takes a replacement set', () => {
		const extension = createCodeBlockExtension({
			languages: { javascript: CURATED_LANGUAGES.javascript }
		});
		const options = extension.options as { languageNames?: string[] };

		expect(options.languageNames).toEqual(['javascript']);
	});
});

describe('the language picker (MC-05)', () => {
	// Rendered through React, not `new Editor({ element })`:
	// `ReactNodeViewRenderer` mounts the view as a portal into the editor's
	// own React tree, and a hand-built editor has no such tree to mount into.
	const renderWithCode = (
		extension: ReturnType<typeof createCodeBlock>,
		language: string | null = 'javascript',
		editable = true
	) => {
		const doc: BlockleafDocument = {
			...createEmptyDocument(),
			content: [
				{
					type: 'codeBlock',
					attrs: { language },
					content: [{ type: 'text', text: 'const x = 1;' }]
				}
			]
		};

		return render(
			<BlockleafEditor
				defaultValue={doc}
				editable={editable}
				extensions={withCodeBlock(createExtensions('standard')).map(
					(entry) => (entry.name === 'codeBlock' ? extension : entry)
				)}
			/>
		);
	};

	const pickerIn = (container: HTMLElement) =>
		container.querySelector<HTMLSelectElement>(
			'.blockleaf-code-block__language'
		);

	it('lists exactly the registered grammars, plus plain text', async () => {
		const { container } = renderWithCode(createCodeBlock());
		await waitFor(() => expect(pickerIn(container)).not.toBeNull());

		const values = Array.from(pickerIn(container)?.options ?? []).map(
			(option) => option.value
		);
		expect(values).toEqual(['', ...CURATED_LANGUAGE_NAMES]);
	});

	it('shows the language the block already has', async () => {
		const { container } = renderWithCode(createCodeBlock());
		await waitFor(() => expect(pickerIn(container)).not.toBeNull());

		expect(pickerIn(container)?.value).toBe('javascript');
	});

	it('falls back to plain text when no language is set', async () => {
		const { container } = renderWithCode(createCodeBlock(), null);
		await waitFor(() => expect(pickerIn(container)).not.toBeNull());

		expect(pickerIn(container)?.value).toBe('');
	});

	// The assertion is on the stored document, not on a class in the DOM: a
	// node view renders the element itself, so `renderHTML` never runs.
	it('writes the chosen language onto the stored node', async () => {
		let latest: BlockleafDocument | null = null;
		const doc: BlockleafDocument = {
			...createEmptyDocument(),
			content: [
				{
					type: 'codeBlock',
					attrs: { language: 'javascript' },
					content: [{ type: 'text', text: 'const x = 1;' }]
				}
			]
		};

		const { container } = render(
			<BlockleafEditor
				defaultValue={doc}
				onChangeImmediate={(next) => {
					latest = next;
				}}
				extensions={withCodeBlock(createExtensions('standard'))}
			/>
		);
		await waitFor(() => expect(pickerIn(container)).not.toBeNull());

		fireEvent.change(pickerIn(container) as HTMLSelectElement, {
			target: { value: 'python' }
		});

		await waitFor(() => expect(pickerIn(container)?.value).toBe('python'));

		const block = (latest as BlockleafDocument | null)?.content?.[0];
		expect(block?.type).toBe('codeBlock');
		expect(
			(block as { attrs?: { language?: string } } | undefined)?.attrs
				?.language
		).toBe('python');
	});

	it('is labelled for a screen reader', async () => {
		const { container } = renderWithCode(createCodeBlock());
		await waitFor(() => expect(pickerIn(container)).not.toBeNull());

		expect(pickerIn(container)?.getAttribute('aria-label')).toBe(
			'Code language'
		);
	});

	it('is disabled in a read-only document', async () => {
		const { container } = renderWithCode(
			createCodeBlock(),
			'javascript',
			false
		);
		await waitFor(() => expect(pickerIn(container)).not.toBeNull());

		expect(pickerIn(container)?.disabled).toBe(true);
	});

	it('is absent when the picker is turned off', async () => {
		const { container } = renderWithCode(
			createCodeBlock({ picker: false })
		);
		await waitFor(() =>
			expect(
				container.querySelector('.blockleaf-editor__content')
			).not.toBeNull()
		);

		expect(pickerIn(container)).toBeNull();
	});
});
