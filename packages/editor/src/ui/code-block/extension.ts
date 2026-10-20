import type { Extensions } from '@tiptap/core';
import { type CodeBlockLowlightOptions } from '@tiptap/extension-code-block-lowlight';
import { ReactNodeViewRenderer } from '@tiptap/react';

import { CodeBlockView } from './code-block-view.js';
import { defaultLabels, type ResolvedLabels } from '../../core/labels.js';
import {
	createCodeBlockExtension,
	type CodeBlockOptions
} from '../../core/nodes/code-block.js';

export interface CodeBlockUIOptions extends CodeBlockOptions {
	/** Set `false` for a highlighted code block with no language dropdown. */
	picker?: boolean;
	/** The resolved label set. Defaults to English. */
	labels?: ResolvedLabels;
}

/**
 * The code block with its language picker.
 *
 * Exported from `@blockleaf/editor/code-block` rather than the package root:
 * `lowlight` and its grammars cost 16.53 kB, which is more than the default
 * bundle has left. See F14.
 */
export const createCodeBlock = ({
	picker = true,
	labels = defaultLabels,
	...options
}: CodeBlockUIOptions = {}) => {
	const extension = createCodeBlockExtension(options);
	if (!picker) return extension;

	return extension.extend<
		CodeBlockLowlightOptions & {
			languageNames: string[];
			labels: ResolvedLabels;
		}
	>({
		addOptions() {
			// Carried on the extension because the node view is rendered by
			// ProseMirror, outside any React tree a provider could reach.
			return {
				...(this.parent?.() as CodeBlockLowlightOptions & {
					languageNames: string[];
				}),
				labels
			};
		},
		addNodeView() {
			return ReactNodeViewRenderer(CodeBlockView);
		}
	});
};

/**
 * Swaps StarterKit's plain code block for the highlighted one.
 *
 * Both are named `codeBlock`, and two extensions sharing a name is a Tiptap
 * warning and an undefined winner. Filtering first makes the replacement
 * explicit instead of hoping the right one loads last.
 *
 * ```ts
 * const extensions = withCodeBlock(createExtensions('standard'));
 * ```
 */
export const withCodeBlock = (
	extensions: Extensions,
	options: CodeBlockUIOptions = {}
): Extensions => [
	...extensions.filter((extension) => extension.name !== 'codeBlock'),
	createCodeBlock(options)
];
