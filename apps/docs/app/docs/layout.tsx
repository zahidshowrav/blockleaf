import { DocsLayout } from 'fumadocs-ui/layouts/docs';

import { baseOptions } from '@/lib/layout.shared';
import { source } from '@/lib/source';

/**
 * Pins the layout to the left edge of the window.
 *
 * The layout is a five-column grid — gutter, sidebar, main, toc, gutter — and
 * the two `1fr` gutters centre it once the window is wider than
 * `--fd-layout-width` (97rem). The sidebar card spans the left gutter and
 * right-aligns its contents inside it, so on a wide screen the links sit a
 * couple of hundred pixels in from the window edge with nothing beside them.
 *
 * Collapsing the left gutter to zero and letting the right one take the slack
 * puts the sidebar against the edge and leaves the measure of the prose alone.
 * This is the columns longhand only: it is applied after the layout's own
 * `grid-template` shorthand, so the rows and the named areas stay theirs.
 */
const gridTemplateColumns = [
	'0',
	'var(--fd-sidebar-col)',
	'minmax(0, calc(var(--fd-layout-width, 97rem) - var(--fd-sidebar-width) - var(--fd-toc-width)))',
	'var(--fd-toc-width)',
	'minmax(min-content, 1fr)'
].join(' ');

const Layout = ({ children }: LayoutProps<'/docs'>) => (
	<DocsLayout
		tree={source.getPageTree()}
		containerProps={{ style: { gridTemplateColumns } }}
		{...baseOptions()}
	>
		{children}
	</DocsLayout>
);

export default Layout;
