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
	/** Accessible name of a video player. */
	video: string;
	/** Accessible name of an audio player with no title. */
	audio: string;
	/** A file's size as shown on its block, from a byte count. */
	fileSize: (bytes: number) => string;
	/** Accessible name of a file block: its name and size, if known. */
	file: (name: string, size: string) => string;
}

/**
 * A file size as people read it: `812 B`, `14 KB`, `1.5 MB`. The editor's
 * rule, so the two write the same text for the same file.
 */
const fileSize = (bytes: number): string => {
	const units = ['B', 'KB', 'MB', 'GB', 'TB'];
	let value = bytes;
	let unit = 0;
	while (value >= 1024 && unit < 4) {
		value /= 1024;
		unit += 1;
	}
	return `${unit === 0 || value >= 10 ? Math.round(value) : Math.round(value * 10) / 10} ${units[unit]}`;
};

export const defaultRendererLabels: RendererLabels = {
	tableScrollRegion: 'Table, scrollable',
	tableOfContents: 'Table of contents',
	video: 'Video',
	audio: 'Audio',
	fileSize,
	file: (name, size) => (size ? `${name}, ${size}` : name)
};

export const resolveRendererLabels = (
	labels?: Partial<RendererLabels>
): RendererLabels => ({ ...defaultRendererLabels, ...labels });
