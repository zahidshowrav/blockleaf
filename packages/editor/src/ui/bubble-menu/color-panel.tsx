import { useCallback, useMemo } from 'react';

import { TokenGroup, type TokenOption } from './token-group.js';
import type { BubbleMenuPanelProps } from './types.js';
import { TEXT_COLOR_MARK, TEXT_COLORS } from '../../core/constants.js';
import { defaultLabels } from '../../core/labels.js';

/**
 * The text colour palette (`PA-05`): "Default" and the nine built-in tokens.
 * Picking applies the colour and closes.
 */
export const ColorPanel = ({
	editor,
	labels = defaultLabels,
	onClose
}: BubbleMenuPanelProps) => {
	const current =
		(editor.getAttributes(TEXT_COLOR_MARK).color as string | undefined) ??
		null;

	const options = useMemo<TokenOption[]>(
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

	const pick = useCallback(
		(color: string | null) => {
			const chain = editor.chain().focus();
			if (color) chain.setTextColor(color).run();
			else chain.unsetTextColor().run();
			onClose();
		},
		[editor, onClose]
	);

	return (
		<TokenGroup
			label={labels.textColor.button}
			options={options}
			current={current}
			onPick={pick}
			onEscape={onClose}
			autoFocus
			className="blockleaf-color-panel"
		/>
	);
};
