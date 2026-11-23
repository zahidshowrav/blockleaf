import { type Editor } from '@tiptap/core';
import { memo } from 'react';

import { defaultLabels, type TextCountLabels } from '../../core/labels.js';
import { useTextCount } from '../../react/use-text-count.js';

export interface TextCountProps {
	/** The editor to count. Inside `BlockleafEditor`, leave it out. */
	editor?: Editor | null;
	/** Overrides for the footer's strings. */
	labels?: Partial<TextCountLabels>;
	className?: string;
}

/**
 * A footer with the word and character counts (`PA-09`). Put it inside
 * `BlockleafEditor` and it counts that editor:
 *
 * ```tsx
 * <BlockleafEditor extensions={extensions}>
 * 	<TextCount />
 * </BlockleafEditor>
 * ```
 *
 * While text is selected it shows the selection's counts out of the total.
 */
export const TextCount = /* @__PURE__ */ memo(function TextCount({
	editor,
	labels,
	className
}: TextCountProps) {
	const strings = { ...defaultLabels.textCount, ...labels };
	const { words, characters, selection } = useTextCount(editor);

	const wordText = strings.words(words);
	const characterText = strings.characters(characters);
	const parts = selection
		? [
				strings.selected(selection.words, wordText),
				strings.selected(selection.characters, characterText)
			]
		: [wordText, characterText];

	return (
		<p
			className={
				className
					? `blockleaf-text-count ${className}`
					: 'blockleaf-text-count'
			}
			aria-label={strings.label}
		>
			<span>{parts[0]}</span>
			<span aria-hidden="true"> · </span>
			<span>{parts[1]}</span>
		</p>
	);
});
