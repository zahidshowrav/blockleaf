import Image from 'next/image';

import { cn } from '@/lib/cn';

/**
 * Two cuts of the mark: the pale one reads on the dark plate, the saturated
 * one survives white. Neither works on both, which is why this component
 * exists.
 */
const sources = {
	light: '/logo/logo-icon-light.png',
	dark: '/logo/logo-icon-dark.png'
};

export interface BlockleafLogoProps {
	/** Rendered square, in px. */
	size?: number;
	className?: string;
	/**
	 * Preloads both cuts. Worth it for the navbar, which is above the fold
	 * on every page; everywhere else it is noise.
	 */
	priority?: boolean;
	/**
	 * Empty by default: every place the mark appears, it sits beside the
	 * word "Blockleaf" or a label that already names it, so announcing it
	 * again would just be a duplicate.
	 */
	alt?: string;
}

/**
 * The Blockleaf mark.
 *
 * Both cuts are rendered and swapped with CSS rather than picking a `src`
 * from the resolved theme. The theme is a class that next-themes puts on
 * `<html>` after hydration, so choosing in JavaScript either flashes the
 * wrong mark on first paint or mismatches what the server rendered. The
 * hidden one is `display: none`, so it costs no layout and screen readers
 * skip it.
 */
export const BlockleafLogo = ({
	size = 24,
	className,
	priority = false,
	alt = ''
}: BlockleafLogoProps) => {
	const shared = { width: size, height: size, alt, priority };

	return (
		<>
			<Image
				{...shared}
				src={sources.light}
				className={cn('shrink-0 dark:hidden', className)}
			/>
			<Image
				{...shared}
				src={sources.dark}
				className={cn('hidden shrink-0 dark:block', className)}
			/>
		</>
	);
};
