import {
	useCallback,
	useRef,
	useState,
	useSyncExternalStore,
	type KeyboardEvent as ReactKeyboardEvent
} from 'react';

import { LinkIcon } from './icons.js';
import { LinkEditor } from './link-editor.js';
import type { BubbleAction, BubbleMenuProps } from './types.js';

const renderIcon = (icon: BubbleAction['icon']) => {
	if (!icon) return null;
	if (typeof icon === 'function') {
		const IconComponent = icon;
		return <IconComponent />;
	}
	return icon;
};

/**
 * Re-renders only when the active or available set actually changes, rather
 * than on every transaction. The toolbar is live while the user types, and a
 * re-render per keystroke is the easy way to make a long document feel slow.
 */
const useActionSignature = (
	editor: BubbleMenuProps['editor'],
	actions: BubbleAction[]
): string => {
	const subscribe = useCallback(
		(onChange: () => void) => {
			editor.on('transaction', onChange);
			return () => {
				editor.off('transaction', onChange);
			};
		},
		[editor]
	);

	const getSnapshot = useCallback(
		() =>
			actions
				.map(
					(action) =>
						`${action.id}:${action.isActive(editor) ? '1' : '0'}:${
							action.isAvailable?.(editor) === false ? '0' : '1'
						}`
				)
				.join('|') + `|link:${editor.isActive('link') ? '1' : '0'}`,
		[editor, actions]
	);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

export const BubbleMenu = ({
	editor,
	actions,
	link,
	openLinkRequest = 0
}: BubbleMenuProps) => {
	const [isEditingLink, setIsEditingLink] = useState(false);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [seenLinkRequest, setSeenLinkRequest] = useState(openLinkRequest);
	const toolbarRef = useRef<HTMLDivElement>(null);
	const linkButtonRef = useRef<HTMLButtonElement>(null);

	// Subscribing re-runs this component whenever the marks under the
	// selection change, which is what keeps `aria-pressed` honest.
	useActionSignature(editor, actions);

	const visibleActions = actions.filter(
		(action) => action.isAvailable?.(editor) !== false
	);
	const isLinkActive = editor.isActive('link');
	const buttonCount = visibleActions.length + (link ? 1 : 0);
	// Clamped during render rather than corrected in an effect: an action can
	// disappear mid-selection, and a cascading re-render to fix the index
	// would be a frame of focus pointing at nothing.
	const activeIndex = Math.min(focusedIndex, Math.max(buttonCount - 1, 0));

	const focusButton = useCallback((index: number) => {
		const buttons = toolbarRef.current?.querySelectorAll<HTMLButtonElement>(
			'[data-bubble-button]'
		);
		buttons?.[index]?.focus();
	}, []);

	const moveFocus = useCallback(
		(next: number) => {
			setFocusedIndex(next);
			focusButton(next);
		},
		[focusButton]
	);

	const onToolbarKeyDown = useCallback(
		(event: ReactKeyboardEvent<HTMLDivElement>) => {
			if (buttonCount === 0) return;

			switch (event.key) {
				case 'ArrowRight':
					event.preventDefault();
					moveFocus((activeIndex + 1) % buttonCount);
					break;
				case 'ArrowLeft':
					event.preventDefault();
					moveFocus((activeIndex - 1 + buttonCount) % buttonCount);
					break;
				case 'Home':
					event.preventDefault();
					moveFocus(0);
					break;
				case 'End':
					event.preventDefault();
					moveFocus(buttonCount - 1);
					break;
				case 'Escape':
					event.preventDefault();
					editor.commands.focus();
					break;
				default:
					break;
			}
		},
		[buttonCount, activeIndex, moveFocus, editor]
	);

	const closeLinkEditor = useCallback(() => {
		setIsEditingLink(false);
		linkButtonRef.current?.focus();
	}, []);

	// Adjusting state from a changed prop during render, rather than in an
	// effect — the effect version renders the toolbar once before swapping to
	// the link editor, which steals the focus the shortcut just placed.
	if (openLinkRequest !== seenLinkRequest) {
		setSeenLinkRequest(openLinkRequest);
		setIsEditingLink(true);
	}

	if (isEditingLink && link) {
		return (
			<div className="blockleaf-bubble-menu">
				<LinkEditor
					editor={editor}
					onClose={closeLinkEditor}
				/>
			</div>
		);
	}

	return (
		<div
			ref={toolbarRef}
			role="toolbar"
			aria-label="Text formatting"
			aria-orientation="horizontal"
			className="blockleaf-bubble-menu"
			onKeyDown={onToolbarKeyDown}
		>
			{visibleActions.map((action, index) => (
				<button
					key={action.id}
					type="button"
					data-bubble-button=""
					data-action={action.id}
					className="blockleaf-bubble-menu__button"
					aria-pressed={action.isActive(editor)}
					aria-label={action.title}
					title={
						action.shortcut
							? `${action.title} (${action.shortcut})`
							: action.title
					}
					tabIndex={index === activeIndex ? 0 : -1}
					onFocus={() => setFocusedIndex(index)}
					onClick={() => action.run(editor)}
				>
					<span aria-hidden="true">{renderIcon(action.icon)}</span>
				</button>
			))}

			{link && (
				<button
					ref={linkButtonRef}
					type="button"
					data-bubble-button=""
					data-action="link"
					className="blockleaf-bubble-menu__button"
					aria-pressed={isLinkActive}
					aria-label={isLinkActive ? 'Edit link' : 'Add link'}
					aria-haspopup="dialog"
					title={
						isLinkActive ? 'Edit link (Mod+K)' : 'Add link (Mod+K)'
					}
					tabIndex={visibleActions.length === activeIndex ? 0 : -1}
					onFocus={() => setFocusedIndex(visibleActions.length)}
					onClick={() => setIsEditingLink(true)}
				>
					<span aria-hidden="true">
						<LinkIcon />
					</span>
				</button>
			)}
		</div>
	);
};
