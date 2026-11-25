import {
	type Editor,
	Node,
	combineTransactionSteps,
	findChildrenInRange,
	getChangedRanges,
	mergeAttributes
} from '@tiptap/core';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';

import { CAPTIONABLE_GROUP, LINK_PREVIEW_NODE } from '../constants.js';
import { sanitizeSrc } from './image.js';
import { sanitizeHref } from '../marks/link.js';

/** What a host's `fetchLinkPreview` hands back for an address. */
export interface LinkPreviewData {
	title?: string | null;
	description?: string | null;
	/** A picture for the card: `https:` or relative, held to the image rule. */
	image?: string | null;
	/** The site's own name, such as `The Guardian`. */
	siteName?: string | null;
}

export interface LinkPreviewAttributes extends LinkPreviewData {
	/** The page the card links to. `https:` only. */
	url: string;
}

/**
 * Fetches what a card shows for an address. Called once, when a card is
 * added without a title. The editor cannot read another site's page from the
 * browser, so this is the host's: usually a call to its own server, which
 * reads the page's `og:` tags.
 */
export type FetchLinkPreview = (
	url: string,
	options: { signal: AbortSignal }
) => Promise<LinkPreviewData | null>;

export interface LinkPreviewOptions {
	HTMLAttributes: Record<string, unknown>;
	fetchLinkPreview: FetchLinkPreview | null;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		linkPreview: {
			/**
			 * Adds a card for a page at the selection. False for an address
			 * that is not `https:`. Without a title, the host's
			 * `fetchLinkPreview` fills it in.
			 */
			setLinkPreview: (attrs: LinkPreviewAttributes) => ReturnType;
		};
	}
}

const CLASS_NAME = 'blockleaf-link-preview';

type LinkPreviewStorage = {
	/** Ids of the cards already fetched, so each is fetched once. */
	started: Set<unknown>;
	/** Aborts every fetch still running when the editor goes. */
	controller: AbortController;
};

/** The longest a stored text field may be; a page's metadata can be huge. */
const LIMITS = { title: 300, description: 500, siteName: 100 } as const;

/** A card's address: the link rule, and `https:` only. */
export const sanitizeLinkPreviewUrl = (url: string): string | null => {
	const trimmed = url.trim();
	return /^https:\/\//i.test(trimmed) ? sanitizeHref(trimmed) : null;
};

const text = (value: unknown, limit: number): string | null => {
	if (typeof value !== 'string') return null;
	const trimmed = value.trim().replace(/\s+/g, ' ');
	return trimmed ? trimmed.slice(0, limit) : null;
};

/** Data from anywhere — a host, a fetch, pasted HTML — made safe to store. */
const clean = (data: LinkPreviewData): Required<LinkPreviewData> => ({
	title: text(data.title, LIMITS.title),
	description: text(data.description, LIMITS.description),
	image:
		typeof data.image === 'string' ? sanitizeSrc(data.image.trim()) : null,
	siteName: text(data.siteName, LIMITS.siteName)
});

/** The host name, shown where a card has no title or site name. */
const hostOf = (url: string): string => {
	try {
		return new URL(url).hostname.replace(/^www\./, '');
	} catch {
		return url;
	}
};

type Child = [string, Record<string, string>, string];

/**
 * The card's parts, shared by `renderHTML` and the node view. A part that
 * shows a stand-in, the host name, says so, so reading the HTML back does
 * not store the host name as the title.
 */
const partsOf = (node: ProseMirrorNode) => {
	const url =
		typeof node.attrs.url === 'string'
			? sanitizeLinkPreviewUrl(node.attrs.url)
			: null;
	const data = clean(node.attrs as LinkPreviewData);
	const host = url ? hostOf(url) : '';
	const part = (name: string, value: string | null): Child =>
		value
			? ['span', { class: `${CLASS_NAME}__${name}` }, value]
			: [
					'span',
					{ class: `${CLASS_NAME}__${name}`, 'data-fallback': '' },
					host
				];
	const children: (Child | ['img', Record<string, string>])[] = [
		part('title', data.title),
		...(data.description
			? [
					[
						'span',
						{ class: `${CLASS_NAME}__description` },
						data.description
					] as Child
				]
			: []),
		part('site', data.siteName)
	];
	if (data.image) {
		children.push([
			'img',
			{
				class: `${CLASS_NAME}__image`,
				src: data.image,
				alt: '',
				loading: 'lazy'
			}
		]);
	}
	return { url, children };
};

/** The text of a part, unless it is the host name standing in. */
const read = (element: HTMLElement, name: string): string | null => {
	const part = element.querySelector(`.${CLASS_NAME}__${name}`);
	return part && !part.hasAttribute('data-fallback')
		? part.textContent
		: null;
};

/**
 * Fills in the card with this id, if it is still there and still has no
 * title. Not an undo step: undo removes the card, not its title.
 */
const fill = (editor: Editor, id: unknown, data: LinkPreviewData) => {
	const { state } = editor;
	let pos = -1;
	state.doc.descendants((child, at) => {
		if (pos === -1 && child.attrs.id === id) pos = at;
		return pos === -1;
	});
	const card = pos === -1 ? null : state.doc.nodeAt(pos);
	if (!card || card.attrs.title) return;
	editor.view.dispatch(
		state.tr
			.setNodeMarkup(pos, undefined, { ...card.attrs, ...clean(data) })
			.setMeta('addToHistory', false)
	);
};

/**
 * A link shown as a card: the page's title, a line of description, the
 * site's name and a picture. Stored with the text it shows, so a card never
 * needs a fetch to be drawn, by the editor or by the renderer.
 *
 * Captionable. In the editor a click selects it, as it does a file block;
 * published, it is an ordinary link.
 */
export const LinkPreview = /* @__PURE__ */ Node.create<LinkPreviewOptions>({
	name: LINK_PREVIEW_NODE,
	group: `block ${CAPTIONABLE_GROUP}`,
	atom: true,
	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {},
			fetchLinkPreview: null
		};
	},

	addAttributes() {
		return {
			url: {
				default: null,
				parseHTML: (element) => {
					const href = element.getAttribute('href');
					return href ? sanitizeLinkPreviewUrl(href) : null;
				},
				// Written by `renderHTML` below, as `href`.
				renderHTML: () => ({})
			},
			title: {
				default: null,
				parseHTML: (element) =>
					text(read(element, 'title'), LIMITS.title),
				renderHTML: () => ({})
			},
			description: {
				default: null,
				parseHTML: (element) =>
					text(read(element, 'description'), LIMITS.description),
				renderHTML: () => ({})
			},
			image: {
				default: null,
				parseHTML: (element) => {
					const src = element
						.querySelector('img')
						?.getAttribute('src');
					return src ? sanitizeSrc(src) : null;
				},
				renderHTML: () => ({})
			},
			siteName: {
				default: null,
				parseHTML: (element) =>
					text(read(element, 'site'), LIMITS.siteName),
				renderHTML: () => ({})
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: `a[data-type="${LINK_PREVIEW_NODE}"]`,
				// Above the default 50: ProseMirror tries mark rules first,
				// and the link mark's `a[href]` would read the card as a link.
				priority: 60,
				getAttrs: (element) => {
					const href = element.getAttribute('href');
					return href !== null &&
						sanitizeLinkPreviewUrl(href) !== null
						? null
						: false;
				}
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		const { url, children } = partsOf(node);
		return [
			'a',
			mergeAttributes(this.options.HTMLAttributes, HTMLAttributes, {
				'data-type': LINK_PREVIEW_NODE,
				class: CLASS_NAME,
				...(url ? { href: url } : {})
			}),
			...children
		];
	},

	renderText({ node }) {
		const title = text(node.attrs.title, LIMITS.title);
		const url = typeof node.attrs.url === 'string' ? node.attrs.url : '';
		return title ?? url;
	},

	addNodeView() {
		return ({ node, HTMLAttributes }) => {
			const { url, children } = partsOf(node);
			const document_ = globalThis.document;
			const dom = document_.createElement('a');
			const attributes = mergeAttributes(
				this.options.HTMLAttributes,
				HTMLAttributes,
				{ 'data-type': LINK_PREVIEW_NODE, class: CLASS_NAME }
			);
			for (const [key, value] of Object.entries(attributes)) {
				if (value !== undefined && value !== null) {
					dom.setAttribute(key, String(value));
				}
			}
			if (url) dom.setAttribute('href', url);
			for (const [tag, attrs, content] of children) {
				const child = document_.createElement(tag);
				for (const [key, value] of Object.entries(attrs)) {
					child.setAttribute(key, value);
				}
				if (content !== undefined) child.textContent = content;
				dom.append(child);
			}
			// The editor is for writing: a click selects the card.
			dom.addEventListener('click', (event) => event.preventDefault());
			return { dom };
		};
	},

	addCommands() {
		return {
			setLinkPreview:
				({ url, ...data }) =>
				({ commands }) => {
					const safe = sanitizeLinkPreviewUrl(url);
					if (safe === null) return false;
					return commands.insertContent({
						type: this.name,
						attrs: { url: safe, ...clean(data) }
					});
				}
		};
	},

	onTransaction({ transaction, appendedTransactions }) {
		const fetch = this.options.fetchLinkPreview;
		if (!fetch || !transaction.docChanged) return;
		const { editor } = this;
		const storage = this.storage as LinkPreviewStorage;
		// The id `UniqueID` gives a new card is added in an appended
		// transaction, so read the document after all of them, and only
		// where they changed it.
		const doc = editor.state.doc;
		const changes = combineTransactionSteps(transaction.before, [
			transaction,
			...appendedTransactions
		]);
		for (const { newRange } of getChangedRanges(changes)) {
			for (const { node } of findChildrenInRange(
				doc,
				newRange,
				(child) => child.type.name === this.name
			)) {
				const id: unknown = node.attrs.id;
				const url: unknown = node.attrs.url;
				if (
					id == null ||
					storage.started.has(id) ||
					node.attrs.title ||
					typeof url !== 'string'
				) {
					continue;
				}
				storage.started.add(id);
				void fetch(url, { signal: storage.controller.signal })
					.then((data) => {
						if (!data || editor.isDestroyed) return;
						fill(editor, id, data);
					})
					.catch(() => {
						// The card keeps its address and host name.
					});
			}
		}
	},

	addStorage(): LinkPreviewStorage {
		return { started: new Set(), controller: new AbortController() };
	},

	onDestroy() {
		(this.storage as LinkPreviewStorage).controller.abort();
	}
});
