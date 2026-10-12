import {
	useCallback,
	useEffect,
	useRef,
	useState,
	type FormEvent
} from 'react';

import { CheckIcon, ExternalLinkIcon, UnlinkIcon } from './icons.js';
import type { LinkEditorProps } from './types.js';
import { sanitizeHref } from '../../core/index.js';

/**
 * The link editor is a convenience, not a gate. `sanitizeHref` is called here
 * only to tell the user why an href will not stick — the schema rejects the
 * same hrefs whether or not this component ran. See `src/core/marks/link.ts`.
 */
export const LinkEditor = ({ editor, onClose }: LinkEditorProps) => {
	const existingHref = (editor.getAttributes('link').href as string) ?? '';
	const [value, setValue] = useState(existingHref);
	const [rejected, setRejected] = useState(false);
	const inputRef = useRef<HTMLInputElement>(null);

	const sanitized = value.trim() ? sanitizeHref(value) : null;
	const hasLink = Boolean(existingHref);

	const applyLink = useCallback(
		(event: FormEvent) => {
			event.preventDefault();
			const trimmed = value.trim();

			if (!trimmed) {
				editor.chain().focus().unsetLink().run();
				onClose();
				return;
			}

			const safe = sanitizeHref(trimmed);
			if (!safe) {
				setRejected(true);
				return;
			}

			editor.chain().focus().setLink({ href: safe }).run();
			onClose();
		},
		[editor, value, onClose]
	);

	const removeLink = useCallback(() => {
		editor.chain().focus().unsetLink().run();
		onClose();
	}, [editor, onClose]);

	const openLink = useCallback(() => {
		if (!sanitized) return;
		window.open(sanitized, '_blank', 'noopener,noreferrer');
	}, [sanitized]);

	useEffect(() => {
		// Focusing here is a race on two fronts: ProseMirror takes focus back
		// when the shortcut's transaction settles, and `Mod+K` pressed before
		// the toolbar has finished its update delay tries to focus an element
		// that is still hidden, where `focus()` silently does nothing.
		//
		// So retry on a timer until it sticks, with a bound. A timer rather
		// than `requestAnimationFrame` because a hidden subtree can have its
		// frames throttled, which is exactly the case being waited on.
		const deadline = Date.now() + 1200;

		const attempt = () => {
			const input = inputRef.current;
			if (!input) return true;

			input.focus();
			if (document.activeElement === input) {
				input.select();
				return true;
			}

			return Date.now() > deadline;
		};

		if (attempt()) return;

		const timer = setInterval(() => {
			if (attempt()) clearInterval(timer);
		}, 32);

		return () => clearInterval(timer);
	}, []);

	return (
		<form
			className="blockleaf-bubble-menu__link-editor"
			onSubmit={applyLink}
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
				inputMode="url"
				className="blockleaf-bubble-menu__link-input"
				placeholder="Paste or type a link"
				aria-label="Link address"
				aria-invalid={rejected}
				aria-describedby={rejected ? 'blockleaf-link-error' : undefined}
				value={value}
				onChange={(event) => {
					setValue(event.target.value);
					setRejected(false);
				}}
			/>

			<button
				type="submit"
				className="blockleaf-bubble-menu__button"
				title="Apply link"
				aria-label="Apply link"
			>
				<CheckIcon aria-hidden="true" />
			</button>

			{sanitized && (
				<button
					type="button"
					className="blockleaf-bubble-menu__button"
					title="Open link in a new tab"
					aria-label="Open link in a new tab"
					onClick={openLink}
				>
					<ExternalLinkIcon aria-hidden="true" />
				</button>
			)}

			{hasLink && (
				<button
					type="button"
					className="blockleaf-bubble-menu__button"
					title="Remove link"
					aria-label="Remove link"
					onClick={removeLink}
				>
					<UnlinkIcon aria-hidden="true" />
				</button>
			)}

			{rejected && (
				<p
					id="blockleaf-link-error"
					role="alert"
					className="blockleaf-bubble-menu__link-error"
				>
					Only https, mailto and relative links are allowed.
				</p>
			)}
		</form>
	);
};
