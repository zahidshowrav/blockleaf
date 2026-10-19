import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState
} from 'react';
import { createPortal } from 'react-dom';

import type { BlockAction, BlockMenuProps } from './types.js';

const renderIcon = (icon: BlockAction['icon']) => {
	if (!icon) return null;
	if (typeof icon === 'function') {
		const IconComponent = icon;
		return <IconComponent />;
	}
	return icon;
};

/** Space between the handle and the menu, in px. */
const MENU_GAP = 4;

/** Keeps the menu off the very edge of the window, in px. */
const VIEWPORT_MARGIN = 8;

export const BlockMenu = ({
	editor,
	actions,
	pos,
	onClose,
	anchor
}: BlockMenuProps) => {
	const [activeIndex, setActiveIndex] = useState(0);
	const [placement, setPlacement] = useState<{
		top: number;
		left: number;
	} | null>(null);
	const menuRef = useRef<HTMLDivElement>(null);

	const visible = actions.filter(
		(action) => action.isAvailable?.(editor, pos) !== false
	);

	const groups = visible.reduce<
		Array<{
			group: string;
			items: Array<{ action: BlockAction; index: number }>;
		}>
	>((accumulated, action, index) => {
		const existing = accumulated.find(
			(entry) => entry.group === action.group
		);
		if (existing) {
			existing.items.push({ action, index });
		} else {
			accumulated.push({
				group: action.group,
				items: [{ action, index }]
			});
		}
		return accumulated;
	}, []);

	// Left unmemoised on purpose: `visible` and `groups` are derived during
	// render, so a `useCallback` over them is memoisation the React Compiler
	// cannot preserve — and it bails out of optimising the whole component
	// rather than keeping it.
	const runAction = (index: number) => {
		const action = visible[index];
		if (!action) return;
		action.run(editor, pos);
		onClose();
	};

	const onKeyDown = (event: React.KeyboardEvent<HTMLDivElement>) => {
		if (visible.length === 0) return;

		switch (event.key) {
			case 'ArrowDown':
				event.preventDefault();
				setActiveIndex((current) => (current + 1) % visible.length);
				break;
			case 'ArrowUp':
				event.preventDefault();
				setActiveIndex(
					(current) => (current - 1 + visible.length) % visible.length
				);
				break;
			case 'Home':
				event.preventDefault();
				setActiveIndex(0);
				break;
			case 'End':
				event.preventDefault();
				setActiveIndex(visible.length - 1);
				break;
			case 'Enter':
				event.preventDefault();
				runAction(activeIndex);
				break;
			case 'Escape':
				event.preventDefault();
				onClose();
				break;
			default:
				break;
		}
	};

	/**
	 * Positions the menu against the handle's rect in viewport coordinates.
	 *
	 * It is portalled to `document.body` rather than rendered inside the
	 * handle because the editor is routinely given a box with
	 * `overflow: auto`, which clipped the menu — and, since an absolutely
	 * positioned descendant still counts towards a scroll container's
	 * `scrollHeight`, opening it grew the scrollbar.
	 */
	const place = useCallback(() => {
		const menu = menuRef.current;
		if (!anchor || !menu) return;

		const rect = anchor.getBoundingClientRect();
		const { offsetHeight, offsetWidth } = menu;
		const below = rect.bottom + MENU_GAP;
		const flip =
			below + offsetHeight > window.innerHeight - VIEWPORT_MARGIN;

		setPlacement({
			top: flip
				? Math.max(VIEWPORT_MARGIN, rect.top - MENU_GAP - offsetHeight)
				: below,
			left: Math.max(
				VIEWPORT_MARGIN,
				Math.min(
					rect.left,
					window.innerWidth - offsetWidth - VIEWPORT_MARGIN
				)
			)
		});
	}, [anchor]);

	// Grouped together per project conventions.
	useLayoutEffect(() => {
		place();
	}, [place]);

	useEffect(() => {
		menuRef.current?.focus();
	}, []);

	useEffect(() => {
		const reposition = () => place();
		// Capturing, so a scroll inside the editor's own box is seen too.
		window.addEventListener('scroll', reposition, true);
		window.addEventListener('resize', reposition);
		return () => {
			window.removeEventListener('scroll', reposition, true);
			window.removeEventListener('resize', reposition);
		};
	}, [place]);

	useEffect(() => {
		const onPointerDown = (event: PointerEvent) => {
			const target = event.target as Node | null;
			if (!target) return;
			if (menuRef.current?.contains(target)) return;
			if (anchor?.contains(target)) return;
			onClose();
		};

		document.addEventListener('pointerdown', onPointerDown, true);
		return () =>
			document.removeEventListener('pointerdown', onPointerDown, true);
	}, [anchor, onClose]);

	const active = visible[activeIndex];

	if (typeof document === 'undefined') return null;

	// Mounted on the body, so the editor's `data-theme` has to be carried
	// over — the same thing the slash menu does for the same reason.
	const theme = anchor
		?.closest('.blockleaf-editor')
		?.getAttribute('data-theme');

	const menu = (
		<div
			ref={menuRef}
			role="menu"
			aria-label="Block actions"
			aria-activedescendant={
				active ? `blockleaf-block-action-${active.id}` : undefined
			}
			// In the tab order, not merely focusable in script: the menu is a
			// scroll container, and a keyboard user who cannot reach it cannot
			// scroll it. `aria-activedescendant` still drives what is announced.
			tabIndex={0}
			className="blockleaf-block-menu"
			data-theme={theme ?? undefined}
			// `useLayoutEffect` sets these before the browser paints, so the
			// menu never shows at the fallback origin. It is not hidden until
			// then, because that would take it out of the accessibility tree.
			style={{ top: placement?.top ?? 0, left: placement?.left ?? 0 }}
			onKeyDown={onKeyDown}
		>
			{groups.map(({ group, items }) => (
				<div
					key={group}
					role="group"
					aria-label={group}
					className="blockleaf-block-menu__group"
				>
					<div
						className="blockleaf-block-menu__group-title"
						role="presentation"
					>
						{group}
					</div>
					{items.map(({ action, index }) => (
						<button
							key={action.id}
							id={`blockleaf-block-action-${action.id}`}
							type="button"
							role="menuitem"
							data-index={index}
							data-active={index === activeIndex}
							data-danger={action.danger ? '' : undefined}
							aria-current={
								action.isActive?.(editor, pos)
									? 'true'
									: undefined
							}
							tabIndex={-1}
							className="blockleaf-block-menu__item"
							onClick={() => runAction(index)}
							onMouseEnter={() => setActiveIndex(index)}
						>
							{action.icon && (
								<span
									className="blockleaf-block-menu__icon"
									aria-hidden="true"
								>
									{renderIcon(action.icon)}
								</span>
							)}
							<span className="blockleaf-block-menu__title">
								{action.title}
							</span>
						</button>
					))}
				</div>
			))}
		</div>
	);

	return createPortal(menu, document.body);
};
