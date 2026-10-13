import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type FormEvent
} from 'react';

import { CheckIcon } from '../bubble-menu/icons.js';
import type { BubbleMenuPanelProps } from '../bubble-menu/types.js';

/**
 * Alt text for the selected image.
 *
 * Submitting an empty field is not a no-op: it sets `alt` to the empty
 * string, which is how HTML marks an image decorative so a screen reader
 * skips it. That is a real answer, and the only way to give it deliberately.
 */
export const AltEditor = ({ editor, onClose }: BubbleMenuPanelProps) => {
	const existing = editor.getAttributes('image').alt;
	const [value, setValue] = useState(
		typeof existing === 'string' ? existing : ''
	);
	const inputRef = useRef<HTMLInputElement>(null);

	const applyAlt = useCallback(
		(event: FormEvent) => {
			event.preventDefault();
			editor.chain().focus().updateImage({ alt: value.trim() }).run();
			onClose();
		},
		[editor, value, onClose]
	);

	useEffect(() => {
		// The panel opens from a click on an already-visible toolbar, so
		// there is no race with the positioner here — unlike the link editor,
		// which can be opened by a shortcut before the toolbar exists.
		inputRef.current?.focus();
		inputRef.current?.select();
	}, []);

	return (
		<form
			className="blockleaf-bubble-menu__panel"
			onSubmit={applyAlt}
			onKeyDown={(event) => {
				if (event.key === 'Escape') {
					event.preventDefault();
					event.stopPropagation();
					onClose();
				}
			}}
		>
			<input
				ref={inputRef}
				type="text"
				className="blockleaf-bubble-menu__panel-input"
				placeholder="Describe this image"
				aria-label="Alt text"
				aria-describedby="blockleaf-alt-hint"
				value={value}
				onChange={(event) => setValue(event.target.value)}
			/>

			<button
				type="submit"
				className="blockleaf-bubble-menu__button"
				title="Apply alt text"
				aria-label="Apply alt text"
			>
				<CheckIcon aria-hidden="true" />
			</button>

			<p
				id="blockleaf-alt-hint"
				className="blockleaf-bubble-menu__panel-hint"
			>
				Leave empty if the image is decorative.
			</p>
		</form>
	);
};
