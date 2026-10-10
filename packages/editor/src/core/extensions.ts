import type { Extensions } from '@tiptap/core';
import { StarterKit } from '@tiptap/starter-kit';

import { HEADING_LEVELS } from './constants.js';

export type PresetName = 'minimal' | 'standard';

/**
 * M0 ships `standard` only as StarterKit with the heading levels capped. The
 * full node/mark set, callouts, task lists and input rules land in M1 — see
 * PROJECT_PLAN §3.
 */
export const createExtensions = (
	preset: PresetName = 'standard'
): Extensions => {
	if (preset === 'minimal') {
		return [
			StarterKit.configure({
				heading: false,
				bulletList: false,
				orderedList: false,
				listItem: false,
				blockquote: false,
				codeBlock: false,
				horizontalRule: false
			})
		];
	}

	return [StarterKit.configure({ heading: { levels: [...HEADING_LEVELS] } })];
};

export const presets: Record<PresetName, () => Extensions> = {
	minimal: () => createExtensions('minimal'),
	standard: () => createExtensions('standard')
};
