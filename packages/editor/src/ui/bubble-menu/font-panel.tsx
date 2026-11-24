import { useCallback, useMemo } from 'react';

import { TokenGroup, type TokenOption } from './token-group.js';
import type { BubbleMenuPanelProps } from './types.js';
import {
	FONT_FAMILIES,
	FONT_FAMILY_MARK,
	FONT_SIZE_MARK,
	FONT_SIZES
} from '../../core/constants.js';
import { defaultLabels } from '../../core/labels.js';

/**
 * The font panel: the family and the size, each a radio
 * group and each option shown as it would look. Picking applies it and
 * closes. A group whose mark is not loaded is left out.
 */
export const FontPanel = ({
	editor,
	labels = defaultLabels,
	onClose
}: BubbleMenuPanelProps) => {
	const hasFamily = FONT_FAMILY_MARK in editor.schema.marks;
	const hasSize = FONT_SIZE_MARK in editor.schema.marks;
	const currentFamily =
		(editor.getAttributes(FONT_FAMILY_MARK).family as string | undefined) ??
		null;
	const currentSize =
		(editor.getAttributes(FONT_SIZE_MARK).size as string | undefined) ??
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

	const sizeOptions = useMemo<TokenOption[]>(
		() => [
			{ value: null, name: labels.font.none, content: labels.font.none },
			...FONT_SIZES.map((size) => ({
				value: size,
				name: labels.font.sizes[size],
				content: (
					<span
						style={{ fontSize: `var(--bl-font-size-${size}, 1em)` }}
					>
						{labels.font.sizes[size]}
					</span>
				)
			}))
		],
		[labels]
	);

	const pickSize = useCallback(
		(size: string | null) => {
			const chain = editor.chain().focus();
			if (size) chain.setFontSize(size).run();
			else chain.unsetFontSize().run();
			onClose();
		},
		[editor, onClose]
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
			{hasSize ? (
				<TokenGroup
					label={labels.font.size}
					options={sizeOptions}
					current={currentSize}
					onPick={pickSize}
					onEscape={onClose}
					autoFocus={!hasFamily}
					className="blockleaf-font-panel__group"
				/>
			) : null}
		</div>
	);
};
