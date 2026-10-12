import { useEffect, useRef, useState } from 'react';

import type { BlockAction, BlockMenuProps } from './types.js';

const renderIcon = (icon: BlockAction['icon']) => {
	if (!icon) return null;
	if (typeof icon === 'function') {
		const IconComponent = icon;
		return <IconComponent />;
	}
	return icon;
};

export const BlockMenu = ({
	editor,
	actions,
	pos,
	onClose
}: BlockMenuProps) => {
	const [activeIndex, setActiveIndex] = useState(0);
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

	useEffect(() => {
		menuRef.current?.focus();
	}, []);

	const active = visible[activeIndex];

	return (
		<div
			ref={menuRef}
			role="menu"
			aria-label="Block actions"
			aria-activedescendant={
				active ? `blockleaf-block-action-${active.id}` : undefined
			}
			tabIndex={-1}
			className="blockleaf-block-menu"
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
};
