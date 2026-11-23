import { useCallback, useMemo } from 'react';

import { TokenGroup, type TokenOption } from './token-group.js';
import type { BubbleMenuPanelProps } from './types.js';
import { FONT_FAMILIES, FONT_FAMILY_MARK } from '../../core/constants.js';
import { defaultLabels } from '../../core/labels.js';

/**
 * The font panel (`PA-10`): the family as a radio group, each option shown
 * in its own face. Picking applies it and closes.
 */
export const FontPanel = ({
	editor,
	labels = defaultLabels,
	onClose
}: BubbleMenuPanelProps) => {
	const hasFamily = FONT_FAMILY_MARK in editor.schema.marks;
	const currentFamily =
		(editor.getAttributes(FONT_FAMILY_MARK).family as string | undefined) ??
		null;

	const familyOptions = useMemo<TokenOption[]>(
		() => [
			{ value: null, name: labels.font.none, content: labels.font.none },
			...FONT_FAMILIES.map((family) => ({
				value: family,
				name: labels.font.families[family],
				content: (
					<span
						style={{
							fontFamily: `var(--bl-font-${family}, inherit)`
						}}
					>
						{labels.font.families[family]}
					</span>
				)
			}))
		],
		[labels]
	);

	const pickFamily = useCallback(
		(family: string | null) => {
			const chain = editor.chain().focus();
			if (family) chain.setFontFamily(family).run();
			else chain.unsetFontFamily().run();
			onClose();
		},
		[editor, onClose]
	);

	return (
		<div className="blockleaf-font-panel">
			{hasFamily ? (
				<TokenGroup
					label={labels.font.family}
					options={familyOptions}
					current={currentFamily}
					onPick={pickFamily}
					onEscape={onClose}
					autoFocus
					className="blockleaf-font-panel__group"
				/>
			) : null}
		</div>
	);
};
