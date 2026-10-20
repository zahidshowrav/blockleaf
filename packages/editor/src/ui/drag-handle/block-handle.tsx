import type { Editor } from '@tiptap/core';
import { NodeSelection } from '@tiptap/pm/state';
import { useCallback, useState, type DragEvent } from 'react';

import { BlockMenu } from './block-menu.js';
import { GripIcon, PlusIcon } from './icons.js';
import type { BlockHandleProps } from './types.js';
import { defaultLabels } from '../../core/labels.js';

/**
 * Hands the drag to ProseMirror rather than implementing one.
 *
 * Kept outside the component because it mutates `view.dragging`, which is how
 * ProseMirror is told a drag is in flight — a mutation the React Compiler
 * will not allow inside a component body.
 */
const startBlockDrag = (
	editor: Editor,
	pos: number,
	dataTransfer: DataTransfer
) => {
	const { view } = editor;
	const node = view.state.doc.nodeAt(pos);
	if (!node) return;

	view.dispatch(
		view.state.tr.setSelection(NodeSelection.create(view.state.doc, pos))
	);

	const slice = view.state.selection.content();
	const { dom, text } = view.serializeForClipboard(slice);

	dataTransfer.clearData();
	dataTransfer.setData('text/html', dom.innerHTML);
	dataTransfer.setData('text/plain', text);
	dataTransfer.effectAllowed = 'copyMove';

	const nodeDOM = view.nodeDOM(pos);
	if (nodeDOM instanceof HTMLElement) {
		dataTransfer.setDragImage(nodeDOM, 0, 0);
	}

	view.dragging = { slice, move: true };
};

export type BlockHandleComponentProps = BlockHandleProps & {
	/** Told when the menu opens, so the handle stops following the pointer. */
	onLockChange?: (locked: boolean) => void;
	/**
	 * Incremented by the extension's `Shift+F10` shortcut. A counter rather
	 * than a boolean so a second press reopens a dismissed menu.
	 */
	openMenuRequest?: number;
};

export const BlockHandle = ({
	editor,
	actions,
	labels = defaultLabels,
	insertButton,
	pos,
	onLockChange,
	openMenuRequest = 0
}: BlockHandleComponentProps) => {
	const [menuOpen, setMenuOpen] = useState(false);
	// A callback ref in state, not a `useRef`: the menu needs the element
	// during render to position itself, and reading a ref there is not
	// allowed.
	const [handleEl, setHandleEl] = useState<HTMLDivElement | null>(null);
	const [seenMenuRequest, setSeenMenuRequest] = useState(openMenuRequest);

	// Adjusting state from a changed prop during render rather than in an
	// effect: the effect version paints the handle once before the menu
	// appears, which loses the focus the shortcut just asked for.
	if (openMenuRequest !== seenMenuRequest) {
		setSeenMenuRequest(openMenuRequest);
		setMenuOpen(true);
	}

	const closeMenu = useCallback(() => {
		setMenuOpen(false);
		onLockChange?.(false);
		// The menu was opened from the document, so that is where focus goes
		// back to. Leaving it on a handle that is about to disappear strands
		// the keyboard user.
		editor.commands.focus();
	}, [onLockChange, editor]);

	const openMenu = useCallback(() => {
		setMenuOpen(true);
		onLockChange?.(true);
	}, [onLockChange]);

	const onDragStart = useCallback(
		(event: DragEvent<HTMLButtonElement>) => {
			if (pos === null || !event.dataTransfer) return;
			startBlockDrag(editor, pos, event.dataTransfer);
		},
		[editor, pos]
	);

	const insertBelow = useCallback(() => {
		if (pos === null) return;
		const node = editor.state.doc.nodeAt(pos);
		if (!node) return;

		const end = pos + node.nodeSize;
		editor
			.chain()
			.focus()
			.insertContentAt(end, { type: 'paragraph' })
			.setTextSelection(end + 1)
			.run();
	}, [editor, pos]);

	if (pos === null) {
		return null;
	}

	return (
		<div
			ref={setHandleEl}
			className="blockleaf-block-handle"
		>
			{insertButton && (
				<button
					type="button"
					className="blockleaf-block-handle__button"
					aria-label={labels.blockMenu.insert}
					title={labels.blockMenu.insert}
					onClick={insertBelow}
				>
					<PlusIcon aria-hidden="true" />
				</button>
			)}

			<button
				type="button"
				draggable
				className="blockleaf-block-handle__button"
				aria-label={labels.blockMenu.handle}
				aria-haspopup="menu"
				aria-expanded={menuOpen}
				title={labels.blockMenu.handleHint}
				onClick={() => (menuOpen ? closeMenu() : openMenu())}
				onDragStart={onDragStart}
			>
				<GripIcon aria-hidden="true" />
			</button>

			{menuOpen && (
				<BlockMenu
					editor={editor}
					actions={actions}
					labels={labels}
					pos={pos}
					onClose={closeMenu}
					anchor={handleEl}
				/>
			)}
		</div>
	);
};
