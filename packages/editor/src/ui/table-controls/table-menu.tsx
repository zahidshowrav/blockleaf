import { useEffect, useRef, useState } from 'react';

import { actionsForAxis } from './actions.js';
import type { TableAction, TableMenuProps } from './types.js';

const renderIcon = (icon: TableAction['icon']) => {
	if (!icon) return null;
	if (typeof icon === 'function') {
		const IconComponent = icon;
		return <IconComponent />;
	}
	return icon;
};

export const TableMenu = ({
	editor,
	actions,
	axis,
	onClose
}: TableMenuProps) => {
	const [activeIndex, setActiveIndex] = useState(0);
	const menuRef = useRef<HTMLDivElement>(null);

	const visible = actionsForAxis(actions, axis).filter(
		(action) => action.isAvailable?.(editor) !== false
	);

	const runAction = (index: number) => {
		const action = visible[index];
		if (!action) return;
		action.run(editor);
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
			aria-label={axis === 'row' ? 'Row actions' : 'Column actions'}
			aria-activedescendant={
				active ? `blockleaf-table-action-${active.id}` : undefined
			}
			tabIndex={-1}
			className="blockleaf-table-menu"
			onKeyDown={onKeyDown}
		>
			{visible.map((action, index) => (
				<button
					key={action.id}
					id={`blockleaf-table-action-${action.id}`}
					type="button"
					role="menuitem"
					data-active={index === activeIndex}
					data-danger={action.danger ? '' : undefined}
					tabIndex={-1}
					className="blockleaf-table-menu__item"
					onClick={() => runAction(index)}
					onMouseEnter={() => setActiveIndex(index)}
				>
					{action.icon && (
						<span
							className="blockleaf-table-menu__icon"
							aria-hidden="true"
						>
							{renderIcon(action.icon)}
						</span>
					)}
					<span>{action.title}</span>
				</button>
			))}
		</div>
	);
};
