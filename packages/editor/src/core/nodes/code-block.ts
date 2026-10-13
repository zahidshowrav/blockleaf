import {
	CodeBlockLowlight,
	type CodeBlockLowlightOptions
} from '@tiptap/extension-code-block-lowlight';
import { type LanguageFn } from 'highlight.js';
import bash from 'highlight.js/lib/languages/bash';
import css from 'highlight.js/lib/languages/css';
import javascript from 'highlight.js/lib/languages/javascript';
import json from 'highlight.js/lib/languages/json';
import python from 'highlight.js/lib/languages/python';
import typescript from 'highlight.js/lib/languages/typescript';
import xml from 'highlight.js/lib/languages/xml';
import { createLowlight } from 'lowlight';

/**
 * The grammars that ship by default.
 *
 * Seven, not `common`'s thirty-seven. `common` costs 39.27 kB against 16.69 kB
 * curated, and a syntax highlighter is not worth more of the budget than the
 * rest of the editor. Hosts that need Rust or Kotlin register them; hosts that
 * need neither do not pay for them. See F10 and F14.
 *
 * `xml` covers HTML — highlight.js has no separate HTML grammar.
 */
export const CURATED_LANGUAGES = {
	bash,
	css,
	javascript,
	json,
	python,
	typescript,
	xml
} satisfies Record<string, LanguageFn>;

/** Language names the default grammar set highlights, for a picker. */
export const CURATED_LANGUAGE_NAMES: string[] =
	/* @__PURE__ */ Object.keys(CURATED_LANGUAGES).sort();

export interface CodeBlockOptions {
	/** Replaces the curated set entirely. */
	languages?: Record<string, LanguageFn>;
	/** Registered on top of the curated set. */
	additionalLanguages?: Record<string, LanguageFn>;
	/** Applied to a code block with no language set. */
	defaultLanguage?: string | null;
}

/**
 * The bare extension, with no React in sight.
 *
 * `src/core` cannot import React, so the language picker is assembled one
 * layer up — see `createCodeBlock` in the subpath entry. This is also what a
 * non-React consumer uses.
 */
type Lowlight = ReturnType<typeof createLowlight>;

/**
 * Makes `highlight` safe to call with a language nobody registered.
 *
 * `lowlight.highlight` throws `Unknown language` for an unregistered name,
 * and `@tiptap/extension-code-block-lowlight` guards that with
 * `highlight.js`'s *module-level* registry rather than the instance's — two
 * different registries, so the guard can pass while the instance has never
 * heard of the language. The throw happens while the plugin builds its
 * initial decorations, which means editor construction, which means a blank
 * screen.
 *
 * That matters because the language is stored. A document saved with
 * `language: "rust"` by a host that registered Rust must still open for a
 * host that did not — showing the code unhighlighted, which is a degradation,
 * rather than crashing, which is data the user cannot reach. Stripping the
 * attribute instead would "fix" it by quietly destroying the author's choice
 * on the next save.
 */
const tolerant = (lowlight: Lowlight): Lowlight => ({
	...lowlight,
	highlight: (name, value, options) =>
		lowlight.registered(name)
			? lowlight.highlight(name, value, options)
			: {
					type: 'root',
					children: value ? [{ type: 'text', value }] : [],
					data: { relevance: 0 }
				}
});

export const createCodeBlockExtension = ({
	languages = CURATED_LANGUAGES,
	additionalLanguages,
	defaultLanguage = null
}: CodeBlockOptions = {}) => {
	const lowlight = createLowlight();
	lowlight.register({ ...languages, ...additionalLanguages });

	const names = Object.keys(lowlight.listLanguages()).length
		? lowlight.listLanguages().sort()
		: CURATED_LANGUAGE_NAMES;

	return CodeBlockLowlight.configure({
		lowlight: tolerant(lowlight),
		defaultLanguage,
		HTMLAttributes: { class: 'blockleaf-code-block' }
	}).extend<CodeBlockLowlightOptions & { languageNames: string[] }>({
		addOptions() {
			return {
				...(this.parent?.() as CodeBlockLowlightOptions),
				// Carried on the extension so the picker can list exactly
				// what is registered, rather than guessing or re-deriving it.
				languageNames: names
			};
		}
	});
};
