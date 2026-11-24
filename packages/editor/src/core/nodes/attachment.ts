import { Node, mergeAttributes } from '@tiptap/core';
import { type Node as ProseMirrorNode } from '@tiptap/pm/model';

import { ATTACHMENT_NODE, CAPTIONABLE_GROUP } from '../constants.js';
import { defaultLabels, type ResolvedLabels } from '../labels.js';
import { sanitizeMediaSrc } from '../media-src.js';

export interface AttachmentAttributes {
	src: string;
	/** The file's name, as shown and as saved by the browser. */
	name: string;
	/** Bytes, if known. */
	size?: number | null;
	/** The MIME type, if known — `application/pdf`. */
	mime?: string | null;
}

export interface AttachmentOptions {
	HTMLAttributes: Record<string, unknown>;
	labels: ResolvedLabels;
}

declare module '@tiptap/core' {
	interface Commands<ReturnType> {
		attachment: {
			/** Inserts a file at the selection. False for an unsafe `src` or no name. */
			setAttachment: (attrs: AttachmentAttributes) => ReturnType;
		};
	}
}

const CLASS_NAME = 'blockleaf-attachment';

const parseSize = (value: string | null): number | null => {
	if (value === null) return null;
	const parsed = Number(value);
	return Number.isInteger(parsed) && parsed >= 0 ? parsed : null;
};

/** The name, falling back to the last part of the address. */
const nameOf = (element: HTMLElement): string => {
	const stored =
		element.getAttribute('download') ??
		element.querySelector(`.${CLASS_NAME}__name`)?.textContent ??
		'';
	if (stored.trim()) return stored.trim();
	const href = element.getAttribute('href') ?? '';
	return (
		decodeURIComponent(href.split(/[?#]/)[0]?.split('/').pop() ?? '') ||
		href
	);
};

/** The anchor's attributes, name and size text, for `renderHTML` and the node view alike. */
const anchorOf = (
	node: ProseMirrorNode,
	options: AttachmentOptions,
	HTMLAttributes: Record<string, unknown>
) => {
	const { labels } = options;
	const src =
		typeof node.attrs.src === 'string'
			? sanitizeMediaSrc(node.attrs.src)
			: null;
	const name = typeof node.attrs.name === 'string' ? node.attrs.name : '';
	const size =
		typeof node.attrs.size === 'number'
			? labels.media.fileSize(node.attrs.size)
			: '';
	return {
		name,
		size,
		attributes: mergeAttributes(options.HTMLAttributes, HTMLAttributes, {
			'data-type': ATTACHMENT_NODE,
			class: CLASS_NAME,
			...(src ? { href: src } : {}),
			download: name,
			'aria-label': labels.media.file(name, size)
		})
	};
};

/**
 * A file to download (`PA-14`, `F29`): a link to the file, with its name and
 * size. It stores the name, the size and the MIME type the upload had, so
 * the block can say what it is before anyone fetches it. Captionable.
 *
 * In the editor a click selects the block rather than opening the file: the
 * page is for writing, and a stray click must not navigate away from it.
 */
export const Attachment = /* @__PURE__ */ Node.create<AttachmentOptions>({
	name: ATTACHMENT_NODE,
	group: `block ${CAPTIONABLE_GROUP}`,
	atom: true,
	draggable: true,

	addOptions() {
		return {
			HTMLAttributes: {},
			labels: defaultLabels
		};
	},

	addAttributes() {
		return {
			src: {
				default: null,
				parseHTML: (element) => {
					const src = element.getAttribute('href');
					return src ? sanitizeMediaSrc(src) : null;
				},
				// Written by `renderHTML` below, as `href`.
				renderHTML: () => ({})
			},
			name: {
				default: '',
				parseHTML: nameOf,
				renderHTML: () => ({})
			},
			size: {
				default: null,
				parseHTML: (element) =>
					parseSize(element.getAttribute('data-size')),
				renderHTML: (attributes) =>
					typeof attributes.size === 'number'
						? { 'data-size': String(attributes.size) }
						: {}
			},
			mime: {
				default: null,
				parseHTML: (element) => element.getAttribute('data-mime'),
				renderHTML: (attributes) =>
					typeof attributes.mime === 'string' && attributes.mime
						? { 'data-mime': attributes.mime }
						: {}
			}
		};
	},

	parseHTML() {
		return [
			{
				tag: `a[data-type="${ATTACHMENT_NODE}"]`,
				// Above the default 50: ProseMirror tries mark rules first,
				// and the link mark's `a[href]` would read the block as a link.
				priority: 60,
				getAttrs: (element) => {
					const href = element.getAttribute('href');
					return href !== null && sanitizeMediaSrc(href) !== null
						? null
						: false;
				}
			}
		];
	},

	renderHTML({ node, HTMLAttributes }) {
		const { attributes, name, size } = anchorOf(
			node,
			this.options,
			HTMLAttributes
		);
		return [
			'a',
			attributes,
			['span', { class: `${CLASS_NAME}__name` }, name],
			['span', { class: `${CLASS_NAME}__size` }, size]
		];
	},

	renderText({ node }) {
		return typeof node.attrs.name === 'string' ? node.attrs.name : '';
	},

	addNodeView() {
		return ({ node, HTMLAttributes }) => {
			const { attributes, name, size } = anchorOf(
				node,
				this.options,
				HTMLAttributes
			);
			// Built by hand rather than through `DOMSerializer`, to keep that
			// import out of the bundle for one anchor and two spans.
			const document_ = globalThis.document;
			const dom = document_.createElement('a');
			for (const [key, value] of Object.entries(attributes)) {
				if (value !== undefined && value !== null) {
					dom.setAttribute(key, String(value));
				}
			}
			const nameElement = document_.createElement('span');
			nameElement.className = `${CLASS_NAME}__name`;
			nameElement.textContent = name;
			const sizeElement = document_.createElement('span');
			sizeElement.className = `${CLASS_NAME}__size`;
			sizeElement.textContent = size;
			dom.append(nameElement, sizeElement);
			dom.addEventListener('click', (event) => event.preventDefault());
			return { dom };
		};
	},

	addCommands() {
		return {
			setAttachment:
				(attrs) =>
				({ commands }) => {
					if (sanitizeMediaSrc(attrs.src) === null) return false;
					if (!attrs.name.trim()) return false;
					return commands.insertContent({ type: this.name, attrs });
				}
		};
	}
});
