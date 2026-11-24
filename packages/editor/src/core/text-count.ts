import {
	getTextBetween,
	getTextSerializersFromSchema,
	type TextSerializer
} from '@tiptap/core';
import { type Node as ProseMirrorNode, type Schema } from '@tiptap/pm/model';

import { MENTION_NODE, MENTION_PREFIX } from './constants.js';
import { type BlockleafDocument } from './schema.js';

/** How much text there is. */
export interface TextCounts {
	/** Words, as the language's own rules split them: `don't` is one, and so is each Chinese word. */
	words: number;
	/** Characters as a reader sees them, spaces included: `👍🏽` is one. Line breaks are not counted. */
	characters: number;
}

export const emptyTextCount: TextCounts = { words: 0, characters: 0 };

type Granularity = 'word' | 'grapheme';

const segmenters = new Map<Granularity, Intl.Segmenter | null>();

/** `null` where `Intl.Segmenter` is missing, and the count falls back. */
const segmenter = (granularity: Granularity): Intl.Segmenter | null => {
	if (!segmenters.has(granularity)) {
		segmenters.set(
			granularity,
			typeof Intl.Segmenter === 'function'
				? new Intl.Segmenter(undefined, { granularity })
				: null
		);
	}
	return segmenters.get(granularity) ?? null;
};

const countWords = (text: string): number => {
	const words = segmenter('word');
	if (!words) return text.split(/\s+/).filter(Boolean).length;
	let count = 0;
	for (const segment of words.segment(text)) {
		if (segment.isWordLike) count += 1;
	}
	return count;
};

const countCharacters = (text: string): number => {
	const graphemes = segmenter('grapheme');
	if (!graphemes) return Array.from(text).length;
	return Array.from(graphemes.segment(text)).length;
};

/** Counts a piece of plain text. Line breaks separate words and are not characters. */
export const countPlainText = (text: string): TextCounts => {
	const lines = text.replace(/\r?\n/g, '');
	return {
		words: countWords(text),
		characters: countCharacters(lines)
	};
};

const add = (a: TextCounts, b: TextCounts): TextCounts => ({
	words: a.words + b.words,
	characters: a.characters + b.characters
});

type JsonNode = {
	type?: string;
	text?: string;
	attrs?: Record<string, unknown>;
	content?: JsonNode[];
};

/** The text of stored inline content. A mention reads as `@label`. */
const inlineText = (node: JsonNode): string =>
	(node.content ?? [])
		.map((child) => {
			if (child.type === 'text') return child.text ?? '';
			if (child.type === 'hardBreak') return '\n';
			if (child.type === MENTION_NODE) {
				const label = child.attrs?.label;
				return `${MENTION_PREFIX}${typeof label === 'string' ? label : ''}`;
			}
			return inlineText(child);
		})
		.join('');

const TEXTBLOCKS: ReadonlySet<string> = new Set([
	'paragraph',
	'heading',
	'codeBlock',
	'caption'
]);

/**
 * Counts a stored document's words and characters, with no
 * editor. Code blocks and captions count; image alt text does not.
 *
 * ```ts
 * countText(document); // { words: 412, characters: 2380 }
 * ```
 */
export const countText = (document_: BlockleafDocument): TextCounts => {
	const visit = (node: JsonNode): TextCounts => {
		if (node.type && TEXTBLOCKS.has(node.type)) {
			return countPlainText(inlineText(node));
		}
		return (node.content ?? []).map(visit).reduce(add, emptyTextCount);
	};
	return visit(document_ as JsonNode);
};

const serializers = new WeakMap<Schema, Record<string, TextSerializer>>();

const serializersFor = (schema: Schema): Record<string, TextSerializer> => {
	let found = serializers.get(schema);
	if (!found) {
		found = getTextSerializersFromSchema(schema);
		serializers.set(schema, found);
	}
	return found;
};

// A block the edit did not touch is the same object in the next document,
// so its count is looked up rather than worked out again. That keeps a
// keystroke in a long document to one block's worth of counting.
const blockCounts = new WeakMap<ProseMirrorNode, TextCounts>();

const textOf = (node: ProseMirrorNode, from: number, to: number): string =>
	getTextBetween(
		node,
		{ from, to },
		{
			blockSeparator: '\n',
			textSerializers: serializersFor(node.type.schema)
		}
	);

const countBlock = (node: ProseMirrorNode): TextCounts => {
	let count = blockCounts.get(node);
	if (!count) {
		count = countPlainText(textOf(node, 0, node.content.size));
		blockCounts.set(node, count);
	}
	return count;
};

/** Counts an open editor's document. */
export const textCountOf = (doc: ProseMirrorNode): TextCounts => {
	let total = emptyTextCount;
	doc.descendants((node) => {
		if (!node.isTextblock) return true;
		total = add(total, countBlock(node));
		return false;
	});
	return total;
};

/** Counts the text between two positions of an open editor's document. */
export const textCountBetween = (
	doc: ProseMirrorNode,
	from: number,
	to: number
): TextCounts => countPlainText(textOf(doc, from, to));
