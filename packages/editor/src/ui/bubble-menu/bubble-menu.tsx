import {
	useCallback,
	useMemo,
	useRef,
	useState,
	useSyncExternalStore,
	type KeyboardEvent as ReactKeyboardEvent
} from 'react';

import { LinkIcon } from './icons.js';
import { LinkEditor } from './link-editor.js';
import type {
	BubbleAction,
	BubbleMenuPanel,
	BubbleMenuProps
} from './types.js';

const renderIcon = (icon: BubbleAction['icon']) => {
	if (!icon) return null;
	if (typeof icon === 'function') {
		const IconComponent = icon;
		return <IconComponent />;
	}
	return icon;
};

/**
 * The link editor, expressed as a panel like any other.
 *
 * It is built in rather than passed because `Mod-K` is a built-in shortcut
 * and the extension needs to know which panel to open.
 */
const LINK_PANEL: BubbleMenuPanel = {
	id: 'link',
	label: (editor) => (editor.isActive('link') ? 'Edit link' : 'Add link'),
	icon: LinkIcon,
	shortcut: 'Mod+K',
	isActive: (editor) => editor.isActive('link'),
	component: LinkEditor
};

/**
 * Re-renders only when the active or available set actually changes, rather
 * than on every transaction. The toolbar is live while the user types, and a
 * re-render per keystroke is the easy way to make a long document feel slow.
 */
const useActionSignature = (
	editor: BubbleMenuProps['editor'],
	actions: BubbleAction[],
	panels: BubbleMenuPanel[]
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
				.join('|') +
			'|' +
			panels
				.map(
					(panel) =>
						`${panel.id}:${panel.isActive?.(editor) ? '1' : '0'}:${panel.label(
							editor
						)}`
				)
				.join('|'),
		[editor, actions, panels]
	);

	return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
};

export const BubbleMenu = ({
	editor,
	actions,
	link,
	panel,
	label = 'Text formatting',
	openLinkRequest = 0
}: BubbleMenuProps) => {
	const [openPanelId, setOpenPanelId] = useState<string | null>(null);
	const [focusedIndex, setFocusedIndex] = useState(0);
	const [seenLinkRequest, setSeenLinkRequest] = useState(openLinkRequest);
	const toolbarRef = useRef<HTMLDivElement>(null);
	const panelButtonRefs = useRef(new Map<string, HTMLButtonElement | null>());
	// Which panel button to focus once the toolbar comes back. A ref, not
	// state: the button does not exist while its panel is open, so the
	// focus has to be claimed when it mounts rather than when the panel
	// closes — and that needs no re-render of its own.
	const pendingFocusRef = useRef<string | null>(null);

	const panels = useMemo(() => {
		const resolved: BubbleMenuPanel[] = [];
		if (link) resolved.push(LINK_PANEL);
		if (panel) resolved.push(panel);
		return resolved;
	}, [link, panel]);

	// Subscribing re-runs this component whenever the marks under the
	// selection change, which is what keeps `aria-pressed` honest.
	useActionSignature(editor, actions, panels);

	const visibleActions = actions.filter(
		(action) => action.isAvailable?.(editor) !== false
	);
	const buttonCount = visibleActions.length + panels.length;
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

	const closePanel = useCallback(() => {
		pendingFocusRef.current = openPanelId;
		setOpenPanelId(null);
	}, [openPanelId]);

	// Adjusting state from a changed prop during render, rather than in an
	// effect — the effect version renders the toolbar once before swapping to
	// the link editor, which steals the focus the shortcut just placed.
	if (openLinkRequest !== seenLinkRequest) {
		setSeenLinkRequest(openLinkRequest);
		setOpenPanelId(LINK_PANEL.id);
	}

	const activePanel = panels.find((entry) => entry.id === openPanelId);
	if (activePanel) {
		const PanelComponent = activePanel.component;
		return (
			<div className="blockleaf-bubble-menu">
				<PanelComponent
					editor={editor}
					onClose={closePanel}
				/>
			</div>
		);
	}

	return (
		<div
			ref={toolbarRef}
			role="toolbar"
			aria-label={label}
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

			{panels.map((entry, offset) => {
				const index = visibleActions.length + offset;
				const entryLabel = entry.label(editor);
				return (
					<button
						key={entry.id}
						ref={(node) => {
							panelButtonRefs.current.set(entry.id, node);
							if (node && pendingFocusRef.current === entry.id) {
								pendingFocusRef.current = null;
								node.focus();
							}
						}}
						type="button"
						data-bubble-button=""
						data-action={entry.id}
						className="blockleaf-bubble-menu__button"
						aria-pressed={entry.isActive?.(editor) ?? false}
						aria-label={entryLabel}
						aria-haspopup="dialog"
						title={
							entry.shortcut
								? `${entryLabel} (${entry.shortcut})`
								: entryLabel
						}
						tabIndex={index === activeIndex ? 0 : -1}
						onFocus={() => setFocusedIndex(index)}
						onClick={() => setOpenPanelId(entry.id)}
					>
						<span aria-hidden="true">{renderIcon(entry.icon)}</span>
					</button>
				);
			})}
		</div>
	);
};
