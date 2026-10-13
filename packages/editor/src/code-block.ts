/**
 * Syntax-highlighted code blocks, as an opt-in subpath.
 *
 * Not part of `@blockleaf/editor` itself: `lowlight` and its grammars cost
 * 16.53 kB, which is more than the default bundle has left, and most
 * documents contain no code at all. Importing from here is what adds the
 * weight. See F14 in `docs/open-flags.md`.
 *
 * ```ts
 * import { createExtensions } from '@blockleaf/editor/extensions';
 * import { withCodeBlock } from '@blockleaf/editor/code-block';
 *
 * const extensions = withCodeBlock(createExtensions('standard'));
 * ```
 */
export {
	CURATED_LANGUAGES,
	CURATED_LANGUAGE_NAMES,
	createCodeBlockExtension,
	type CodeBlockOptions
} from './core/nodes/code-block.js';
export {
	CodeBlockView,
	createCodeBlock,
	withCodeBlock,
	type CodeBlockUIOptions
} from './ui/code-block/index.js';
