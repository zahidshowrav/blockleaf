/**
 * The shapes this package renders.
 *
 * These are deliberately structural rather than imported from
 * `@blockleaf/editor`. The renderer exists so a server can turn stored JSON
 * into output without the editor in the dependency graph, and a type import
 * would be a dependency on the thing it is avoiding. `BlockleafDocument`
 * satisfies `RenderableDocument` structurally, so a host passes one straight
 * in; a test in this package proves that and fails if either side drifts.
 */

export interface RenderableMark {
	type: string;
	attrs?: Record<string, unknown>;
}

export interface RenderableNode {
	type?: string;
	attrs?: Record<string, unknown>;
	content?: RenderableNode[];
	marks?: RenderableMark[];
	text?: string;
}

export interface RenderableDocument extends RenderableNode {
	content?: RenderableNode[];
}

/** Heading levels the schema allows. Anything else is clamped into range. */
export type HeadingLevel = 1 | 2 | 3;

export type ImageAlign = 'left' | 'center' | 'right';
