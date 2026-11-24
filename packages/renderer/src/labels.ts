/**
 * The strings the renderer puts into its output.
 *
 * There are two. The first exists because a table wider than its column has
 * to scroll inside a box somebody can reach from a keyboard, and an unnamed
 * `region` is announced by nothing; the second names a table of contents. The editor has had a full
 * label set since HD-02; a renderer that hard-coded English while the editor
 * did not would be the odd one out.
 */
export interface RendererLabels {
	/** Accessible name of the box a wide table scrolls inside. */
	tableScrollRegion: string;
	/** Accessible name of a table of contents (`PA-08`). */
	tableOfContents: string;
}

export const defaultRendererLabels: RendererLabels = {
	tableScrollRegion: 'Table, scrollable',
	tableOfContents: 'Table of contents'
};

export const resolveRendererLabels = (
	labels?: Partial<RendererLabels>
): RendererLabels => ({ ...defaultRendererLabels, ...labels });
