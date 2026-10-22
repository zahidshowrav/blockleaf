/**
 * The strings the renderer puts into its output.
 *
 * There is only one so far, and it exists because a table wider than its
 * column has to scroll inside a box somebody can reach from a keyboard, and
 * an unnamed `region` is announced by nothing. The editor has had a full
 * label set since HD-02; a renderer that hard-coded English while the editor
 * did not would be the odd one out.
 */
export interface RendererLabels {
	/** Accessible name of the box a wide table scrolls inside. */
	tableScrollRegion: string;
}

export const defaultRendererLabels: RendererLabels = {
	tableScrollRegion: 'Table, scrollable'
};

export const resolveRendererLabels = (
	labels?: Partial<RendererLabels>
): RendererLabels => ({ ...defaultRendererLabels, ...labels });
