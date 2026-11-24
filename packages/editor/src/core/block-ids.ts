import {
	combineTransactionSteps,
	Extension,
	findChildrenInRange,
	getChangedRanges
} from '@tiptap/core';
import { UniqueID as TiptapUniqueID } from '@tiptap/extension-unique-id';
import {
	Fragment,
	type Node as ProseMirrorNode,
	type Schema,
	Slice
} from '@tiptap/pm/model';
import {
	type EditorState,
	Plugin,
	PluginKey,
	type Transaction
} from '@tiptap/pm/state';
import { CellSelection } from '@tiptap/pm/tables';

import { UNIQUE_ID_EXTENSION_NAME } from './constants.js';

interface ResolvedIdOptions {
	attributeName: string;
	generateID: (context: { node: ProseMirrorNode; pos: number }) => unknown;
	types: ReadonlySet<string>;
}

interface ExtensionLike {
	name: string;
	options: unknown;
}

/**
 * Reads what `UniqueID` was configured with, so ids made here look exactly
 * like the ones it makes. `null` when the editor has no `UniqueID`.
 */
const readUniqueIdOptions = (
	extensions: readonly ExtensionLike[],
	schema: Schema
): ResolvedIdOptions | null => {
	const uniqueId = extensions.find(
		(extension) => extension.name === UNIQUE_ID_EXTENSION_NAME
	);
	if (!uniqueId) return null;

	const options = uniqueId.options as {
		attributeName?: string;
		generateID?: ResolvedIdOptions['generateID'];
		types?: readonly string[] | 'all';
	};
	if (typeof options.generateID !== 'function') return null;

	const types =
		options.types === 'all'
			? Object.keys(schema.nodes).filter(
					(name) => name !== 'doc' && name !== 'text'
				)
			: (options.types ?? []);

	return {
		attributeName: options.attributeName ?? 'id',
		generateID: options.generateID,
		types: new Set(types)
	};
};

const stampFragment = (
	fragment: Fragment,
	options: ResolvedIdOptions
): Fragment => {
	const children: ProseMirrorNode[] = [];
	fragment.forEach((node) => {
		if (node.isText || node.isLeaf) {
			children.push(stampNode(node, node.content, options));
			return;
		}
		children.push(
			stampNode(node, stampFragment(node.content, options), options)
		);
	});
	return Fragment.from(children);
};

const stampNode = (
	node: ProseMirrorNode,
	content: Fragment,
	options: ResolvedIdOptions
): ProseMirrorNode => {
	const { attributeName, generateID, types } = options;
	const needsId =
		types.has(node.type.name) && node.attrs[attributeName] == null;
	if (!needsId) {
		return content === node.content ? node : node.copy(content);
	}
	return node.type.create(
		{ ...node.attrs, [attributeName]: generateID({ node, pos: -1 }) },
		content,
		node.marks
	);
};

/**
 * Gives every block in a pasted slice its id before the slice reaches the
 * document. `UniqueID`'s `transformPasted` has already cleared the copied
 * ids, which is right: a copy must not share an id with its original.
 *
 * The blocks are built with `create`, which does not check their content.
 * A step used to, so a slice that another plugin left invalid now lands
 * instead of failing the paste. Blockleaf's own plugins never build one.
 */
export const stampPastedSlice = (
	slice: Slice,
	options: ResolvedIdOptions | null
): Slice =>
	options
		? new Slice(
				stampFragment(slice.content, options),
				slice.openStart,
				slice.openEnd
			)
		: slice;

/**
 * A transaction ProseMirror made from a paste or a drop.
 *
 * Blockleaf's `UniqueID` skips these by default (its `filterTransaction`),
 * and `PastedBlockIds` settles their ids instead. Pass it on if you give
 * `UniqueID` a `filterTransaction` of your own.
 */
export const isPasteTransaction = (tr: Transaction): boolean => {
	const uiEvent: unknown = tr.getMeta('uiEvent');
	return (
		tr.getMeta('paste') === true ||
		uiEvent === 'paste' ||
		uiEvent === 'drop'
	);
};

/**
 * Settles ids after a paste, in one pass.
 *
 * Same rules as `UniqueID`'s `appendTransaction`, over the same changed
 * ranges: a block with no id gets one, and where two blocks share an id, the
 * one the paste created gets a new one. That is how a block split by a paste
 * in its middle ends up with two ids, not one twice.
 *
 * The difference is cost. `UniqueID` recounts every id in the range once per
 * block, so a paste of ten thousand blocks counts a hundred million times.
 * Here they are counted once.
 */
const settlePastedIds = (
	transactions: readonly Transaction[],
	oldState: EditorState,
	newState: EditorState,
	options: ResolvedIdOptions
): Transaction | null => {
	if (!transactions.some(isPasteTransaction)) return null;
	if (!transactions.some((transaction) => transaction.docChanged))
		return null;

	const { attributeName, generateID, types } = options;
	const transform = combineTransactionSteps(oldState.doc, [...transactions]);
	const inverted = transform.mapping.invert();
	const tr = newState.tr;

	for (const { newRange } of getChangedRanges(transform)) {
		const blocks = findChildrenInRange(newState.doc, newRange, (node) =>
			types.has(node.type.name)
		);

		const counts = new Map<unknown, number>();
		for (const { node } of blocks) {
			const id: unknown = node.attrs[attributeName];
			if (id != null) counts.set(id, (counts.get(id) ?? 0) + 1);
		}

		for (const { node, pos } of blocks) {
			const id: unknown = node.attrs[attributeName];
			const duplicated = id != null && (counts.get(id) ?? 0) > 1;
			if (id != null && !(duplicated && inverted.mapResult(pos).deleted))
				continue;
			// An attribute step leaves every position where it was, so the
			// positions read from `newState` stay valid on `tr`.
			tr.setNodeAttribute(pos, attributeName, generateID({ node, pos }));
		}
	}

	if (!tr.steps.length) return null;
	tr.setStoredMarks(newState.storedMarks);
	tr.setMeta('__uniqueIDTransaction', true);
	return tr;
};

/**
 * Gives pasted blocks their ids without the quadratic path.
 *
 * `UniqueID` adds ids after a paste one `setNodeMarkup` step per block, each
 * applied to the document the one before it produced, and checks for
 * duplicates by recounting the range once per block. Both are quadratic —
 * the same problem `withBlockIds` took out of loading. A
 * ten-thousand-block paste spent most of a minute there.
 *
 * Two parts, both linear:
 *
 * - `transformPasted` stamps ids onto the slice itself, so the paste lands
 *   with its ids and no steps are needed to add them.
 * - `appendTransaction` does the duplicate check `UniqueID` would have done,
 *   counting once. Blockleaf's `UniqueID` skips paste transactions by
 *   default, through Tiptap's own `filterTransaction` option.
 *
 * Its plugin must come after `UniqueID`'s, whose `transformPasted` is what
 * clears the copied ids. `UniqueID` sets priority 10000, so the default
 * priority here already orders it after.
 */
export const PastedBlockIds = /* @__PURE__ */ Extension.create({
	name: 'pastedBlockIds',

	addProseMirrorPlugins() {
		const options = readUniqueIdOptions(
			this.editor.extensionManager.extensions,
			this.editor.schema
		);
		if (!options) return [];

		return [
			new Plugin({
				key: new PluginKey('pastedBlockIds'),
				props: {
					// Pasting into selected table cells repeats the pasted cells
					// to fill the selection, ids included. Left without ids, the
					// slice gets them in `appendTransaction`, one per copy.
					transformPasted: (slice, view) =>
						view.state.selection instanceof CellSelection
							? slice
							: stampPastedSlice(slice, options)
				},
				appendTransaction: (transactions, oldState, newState) =>
					settlePastedIds(transactions, oldState, newState, options)
			})
		];
	}
});

/**
 * Tiptap's `UniqueID`, with one default changed: it leaves paste and drop
 * transactions to `PastedBlockIds`.
 *
 * The default rather than a setting in `createExtensions`, so the documented
 * way to give a block type of your own an id —
 * `UniqueID.configure({ types: [...] })` — keeps it. Everything else is
 * Tiptap's, including the name, so filtering a preset by `'uniqueID'` still
 * finds it.
 */
export const UniqueID = /* @__PURE__ */ TiptapUniqueID.extend({
	addOptions() {
		return {
			...this.parent?.(),
			filterTransaction: (tr: Transaction) => !isPasteTransaction(tr)
		};
	}
});
