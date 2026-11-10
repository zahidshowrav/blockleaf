import { Extension, Mark, Node } from '@tiptap/core';
import type { Schema } from '@tiptap/pm/model';

import {
	UNKNOWN_BLOCK_NODE,
	UNKNOWN_CONTENT_EXTENSION_NAME,
	UNKNOWN_INLINE_NODE,
	UNKNOWN_MARK
} from './constants.js';
import { defaultLabels, type ResolvedLabels } from './labels.js';

/**
 * FC-03. Nodes and marks this editor does not know, kept intact.
 *
 * ProseMirror has no hook for an unknown type: a schema is a lookup by name,
 * and `nodeFromJSON` throws before any extension runs. So the work happens
 * on plain JSON, either side of the editor. `wrapUnknownContent` swaps every
 * unrecognised node and mark for a placeholder that carries the original
 * JSON as an attribute; `unwrapUnknownContent` splices that JSON back in on
 * the way out. Nothing inside a placeholder is ever parsed, so it comes back
 * exactly as it went in, children and all.
 *
 * The placeholders have no `parseHTML`. A payload only ever comes from the
 * stored document; one read from pasted HTML could carry any node at all —
 * a known type with an unsanitised attribute — past the schema and into
 * storage. The cost is that cut and paste drops a placeholder. Dragging it
 * moves the node itself and keeps it.
 */

type JsonMark = { type?: unknown; attrs?: Record<string, unknown> };

type JsonNode = {
	type?: unknown;
	attrs?: Record<string, unknown>;
	content?: JsonNode[];
	marks?: JsonMark[];
	[key: string]: unknown;
};

/** What an unknown mark's placeholder carries: the mark, and where it sat. */
type MarkPayload = { mark: JsonMark; index: number };

export type UnknownContentOptions = {
	labels: ResolvedLabels;
};

const typeName = (payload: unknown): string => {
	const type = (payload as { type?: unknown } | null)?.type;
	return typeof type === 'string' ? type : '?';
};

/** The original JSON, kept as is and never written to the DOM. */
const payloadAttribute = {
	payload: { default: null, rendered: false, keepOnSplit: false }
};

export const UnknownBlock = Node.create<UnknownContentOptions>({
	name: UNKNOWN_BLOCK_NODE,
	group: 'block',
	atom: true,
	selectable: true,
	draggable: true,

	addOptions() {
		return { labels: defaultLabels };
	},

	addAttributes() {
		return payloadAttribute;
	},

	parseHTML() {
		return [];
	},

	renderHTML({ node }) {
		const type = typeName(node.attrs.payload);
		return [
			'div',
			{
				class: 'blockleaf-unknown',
				'data-type': 'unknown',
				'data-unknown-type': type,
				contenteditable: 'false'
			},
			this.options.labels.unknown.block(type)
		];
	}
});

export const UnknownInline = Node.create<UnknownContentOptions>({
	name: UNKNOWN_INLINE_NODE,
	group: 'inline',
	inline: true,
	atom: true,
	selectable: true,

	addOptions() {
		return { labels: defaultLabels };
	},

	addAttributes() {
		return payloadAttribute;
	},

	parseHTML() {
		return [];
	},

	renderHTML({ node }) {
		const type = typeName(node.attrs.payload);
		return [
			'span',
			{
				class: 'blockleaf-unknown blockleaf-unknown--inline',
				'data-type': 'unknown',
				'data-unknown-type': type,
				contenteditable: 'false'
			},
			this.options.labels.unknown.inline(type)
		];
	}
});

export const UnknownMark = Mark.create({
	name: UNKNOWN_MARK,
	// Several unknown marks can sit on the same text.
	excludes: '',
	// Typing at the edge of one does not extend it: the editor does not know
	// what it means, so it does not guess that new text belongs to it.
	inclusive: false,

	addAttributes() {
		return payloadAttribute;
	},

	parseHTML() {
		return [];
	},

	renderHTML() {
		return ['span', { 'data-type': 'unknown-mark' }, 0];
	}
});

/**
 * Adds the three placeholders. In both presets, and added by the editor hook
 * to any `extensions` array that lacks it, so a host never has to know.
 */
export const UnknownContent = Extension.create<UnknownContentOptions>({
	name: UNKNOWN_CONTENT_EXTENSION_NAME,

	addOptions() {
		return { labels: defaultLabels };
	},

	addExtensions() {
		const { labels } = this.options;
		return [
			UnknownBlock.configure({ labels }),
			UnknownInline.configure({ labels }),
			UnknownMark
		];
	}
});

const wrapMarks = (
	marks: JsonMark[] | undefined,
	schema: Schema
): JsonMark[] | undefined => {
	if (!marks?.some((mark) => !isKnown(mark.type, schema.marks))) return marks;
	return marks.map((mark, index) =>
		isKnown(mark.type, schema.marks)
			? mark
			: {
					type: UNKNOWN_MARK,
					attrs: { payload: { mark, index } satisfies MarkPayload }
				}
	);
};

const isKnown = (type: unknown, types: Record<string, unknown>): boolean =>
	typeof type === 'string' && Object.hasOwn(types, type);

const wrapNode = (
	node: JsonNode,
	schema: Schema,
	inline: boolean
): JsonNode => {
	// A missing or non-string type is not an unknown block; it is broken
	// JSON, and the content check is what should catch it.
	if (typeof node.type === 'string' && !isKnown(node.type, schema.nodes)) {
		return {
			type: inline ? UNKNOWN_INLINE_NODE : UNKNOWN_BLOCK_NODE,
			attrs: { payload: node }
		};
	}

	const marks = wrapMarks(node.marks, schema);
	const childrenInline =
		typeof node.type === 'string' &&
		(schema.nodes[node.type]?.inlineContent ?? false);
	const content = node.content?.map((child) =>
		wrapNode(child, schema, childrenInline)
	);
	const contentChanged =
		content?.some((child, index) => child !== node.content?.[index]) ??
		false;

	if (marks === node.marks && !contentChanged) return node;
	return {
		...node,
		...(marks === node.marks ? {} : { marks }),
		...(contentChanged ? { content } : {})
	};
};

/**
 * Swaps every node and mark `schema` does not know for a placeholder that
 * carries it. Returns the document unchanged, not copied, when there is
 * nothing to swap — or when `schema` has no placeholders to swap them for, in
 * which case the content check refuses the document as before.
 *
 * Run it before `withBlockIds`: ids are stamped on known blocks only, and a
 * known block inside an unknown one belongs to the payload, untouched.
 */
export const wrapUnknownContent = <T>(doc: T, schema: Schema): T => {
	if (
		!isKnown(UNKNOWN_BLOCK_NODE, schema.nodes) ||
		!isKnown(UNKNOWN_INLINE_NODE, schema.nodes) ||
		!isKnown(UNKNOWN_MARK, schema.marks)
	) {
		return doc;
	}
	if (typeof doc !== 'object' || doc === null) return doc;
	return wrapNode(doc as JsonNode, schema, false) as T;
};

const isMarkPayload = (value: unknown): value is MarkPayload =>
	typeof value === 'object' &&
	value !== null &&
	typeof (value as MarkPayload).mark === 'object' &&
	typeof (value as MarkPayload).index === 'number';

const unwrapMarks = (marks: JsonMark[] | undefined): JsonMark[] | undefined => {
	if (!marks?.some((mark) => mark.type === UNKNOWN_MARK)) return marks;

	const known = marks.filter((mark) => mark.type !== UNKNOWN_MARK);
	const unknown = marks
		.map((mark) => mark.attrs?.payload)
		.filter(isMarkPayload)
		.sort((a, b) => a.index - b.index);

	// ProseMirror orders marks by schema rank, which put every placeholder
	// after the known marks. Each goes back to the index it came from.
	const restored = [...known];
	for (const { mark, index } of unknown) {
		restored.splice(Math.min(index, restored.length), 0, mark);
	}
	return restored;
};

const unwrapNode = (node: JsonNode): JsonNode => {
	if (node.type === UNKNOWN_BLOCK_NODE || node.type === UNKNOWN_INLINE_NODE) {
		const payload = node.attrs?.payload;
		return typeof payload === 'object' && payload !== null
			? (payload as JsonNode)
			: node;
	}

	const marks = unwrapMarks(node.marks);
	const content = node.content?.map(unwrapNode);
	const contentChanged =
		content?.some((child, index) => child !== node.content?.[index]) ??
		false;

	if (marks === node.marks && !contentChanged) return node;
	return {
		...node,
		...(marks === node.marks ? {} : { marks }),
		...(contentChanged ? { content } : {})
	};
};

/**
 * Puts every node and mark `wrapUnknownContent` swapped out back where it
 * was, exactly as it came in. Run on what `editor.getJSON()` returns before
 * it is stored; the editor's own `onChange` already does.
 */
export const unwrapUnknownContent = <T>(doc: T): T => {
	if (typeof doc !== 'object' || doc === null) return doc;
	return unwrapNode(doc as JsonNode) as T;
};
