import { useCallback, useMemo } from 'react';

import { TokenGroup, type TokenOption } from './token-group.js';
import type { BubbleMenuPanelProps } from './types.js';
import {
	HIGHLIGHT_MARK,
	TEXT_COLOR_MARK,
	TEXT_COLORS
} from '../../core/constants.js';
import { defaultLabels } from '../../core/labels.js';

/**
 * The colour panel: text colour and background colour,
 * each "Default" and the nine built-in tokens, each its own radio group.
 * Picking applies the colour and closes. The background group is left out
 * where there is no highlight mark — the minimal preset.
 */
export const ColorPanel = ({
	editor,
	labels = defaultLabels,
	onClose
}: BubbleMenuPanelProps) => {
	const hasText = TEXT_COLOR_MARK in editor.schema.marks;
	const hasBackground = HIGHLIGHT_MARK in editor.schema.marks;
	const currentText =
		(editor.getAttributes(TEXT_COLOR_MARK).color as string | undefined) ??
		null;
	const currentBackground =
		(editor.getAttributes(HIGHLIGHT_MARK).color as string | undefined) ??
		null;

	const textOptions = useMemo<TokenOption[]>(
		() => [
			{ value: null, name: labels.textColor.none, content: 'A' },
			...TEXT_COLORS.map((color) => ({
				value: color,
				name: labels.textColor.colors[color],
				content: (
					<span
						aria-hidden="true"
						style={{
							color: `var(--bl-text-${color}, currentColor)`
						}}
					>
						A
					</span>
				)
			}))
		],
		[labels]
	);

	const backgroundOptions = useMemo<TokenOption[]>(
		() => [
			{ value: null, name: labels.textColor.none, content: 'A' },
			...TEXT_COLORS.map((color) => ({
				value: color,
				name: labels.textColor.colors[color],
				content: (
					<span
						aria-hidden="true"
						className="blockleaf-color-panel__background"
						style={{ background: `var(--bl-highlight-${color})` }}
					>
						A
					</span>
				)
			}))
		],
		[labels]
	);

	const pickText = useCallback(
		(color: string | null) => {
			const chain = editor.chain().focus();
			if (color) chain.setTextColor(color).run();
			else chain.unsetTextColor().run();
			onClose();
		},
		[editor, onClose]
	);

	const pickBackground = useCallback(
		(color: string | null) => {
			const chain = editor.chain().focus();
			if (color) chain.setHighlight({ color }).run();
			else chain.unsetHighlight().run();
			onClose();
		},
		[editor, onClose]
	);

	return (
		<div className="blockleaf-color-panel">
			{hasText ? (
				<TokenGroup
					label={labels.textColor.text}
					options={textOptions}
					current={currentText}
					onPick={pickText}
					onEscape={onClose}
					autoFocus
					className="blockleaf-color-panel__group"
				/>
			) : null}
			{hasBackground ? (
				<TokenGroup
					label={labels.textColor.background}
					options={backgroundOptions}
					current={currentBackground}
					onPick={pickBackground}
					onEscape={onClose}
					autoFocus={!hasText}
					className="blockleaf-color-panel__group"
				/>
			) : null}
		</div>
	);
};
