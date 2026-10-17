'use client';

import { Check, Copy } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

export interface CopyButtonProps {
	value: string;
	/** Named for the screen reader, e.g. `install command`. */
	label: string;
	className?: string;
}

/** Copies `value`, then says so for two seconds. */
export const CopyButton = ({ value, label, className }: CopyButtonProps) => {
	const [copied, setCopied] = useState(false);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	useEffect(() => () => clearTimeout(timer.current), []);

	const onClick = async () => {
		await navigator.clipboard.writeText(value);
		setCopied(true);
		clearTimeout(timer.current);
		timer.current = setTimeout(() => setCopied(false), 2000);
	};

	const Icon = copied ? Check : Copy;

	return (
		<button
			type="button"
			onClick={onClick}
			aria-label={copied ? `Copied ${label}` : `Copy ${label}`}
			className={`text-fd-muted-foreground hover:text-fd-primary shrink-0 transition-colors ${className ?? ''}`}
		>
			<Icon
				className={`size-3.5 ${copied ? 'text-fd-primary' : ''}`}
				aria-hidden="true"
			/>
		</button>
	);
};
