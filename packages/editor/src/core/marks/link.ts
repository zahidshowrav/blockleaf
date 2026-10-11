import { InputRule } from '@tiptap/core';
import { Link as TiptapLink } from '@tiptap/extension-link';

/**
 * Sanitises link hrefs at the schema level.
 *
 * Allowed protocols/patterns:
 * - `https:`
 * - `mailto:`
 * - Site-relative paths and hash anchors (`/docs`, `#section`)
 *
 * Everything else — `javascript:` above all, plus `data:`, `vbscript:`, etc. —
 * is rejected and returns `null`.
 */
export const sanitizeHref = (href: string): string | null => {
	const trimmed = href.trim();
	if (!trimmed) return null;

	// Reject protocol-relative URLs that can bypass protocol filters
	if (trimmed.startsWith('//')) return null;

	// Site-relative paths and hash anchors
	if (trimmed.startsWith('/') || trimmed.startsWith('#')) {
		return trimmed;
	}

	try {
		const parsed = new URL(trimmed);
		if (parsed.protocol === 'https:' || parsed.protocol === 'mailto:') {
			return trimmed;
		}
		return null;
	} catch {
		// Relative path without leading slash (e.g. "docs/getting-started").
		// Reject if it contains a URI scheme before the first slash.
		if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) {
			return null;
		}
		return trimmed;
	}
};

export const Link = TiptapLink.extend({
	addAttributes() {
		return {
			...this.parent?.(),
			href: {
				default: null,
				parseHTML: (element) => {
					const href = element.getAttribute('href');
					return href ? sanitizeHref(href) : null;
				},
				renderHTML: (attributes) => {
					const sanitized = attributes.href
						? sanitizeHref(attributes.href as string)
						: null;
					if (!sanitized) {
						return {};
					}
					return { href: sanitized };
				}
			}
		};
	},

	addInputRules() {
		return [
			new InputRule({
				find: /(?:^|\s)\[([^\]]+)\]\(([^)]+)\)$/,
				handler: ({ state, range, match }) => {
					const [, text, href] = match;
					if (!text || !href) return null;
					const sanitized = sanitizeHref(href);
					if (!sanitized) return null;
					const { tr } = state;
					const start = range.from + match[0].indexOf('[');
					const end = range.to;
					tr.replaceWith(
						start,
						end,
						this.type.schema.text(text, [
							this.type.create({ href: sanitized })
						])
					);
				}
			})
		];
	}
}).configure({
	openOnClick: false,
	autolink: true,
	isAllowedUri: (url) => sanitizeHref(url) !== null,
	validate: (url) => sanitizeHref(url) !== null
});
