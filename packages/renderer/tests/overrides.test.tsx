import { describe, expect, it } from 'vitest';

import { docOf, paragraph, text } from './fixtures.js';
import { reactHTML } from './html.js';
import { imageAttributes, type NodeRenderer } from '../src/react.js';

/**
 * Overrides are a patch over the defaults, not a replacement mapping: a host
 * that wants its own image component should not have to re-implement
 * paragraphs to get one.
 */

describe('node overrides', () => {
	it('replaces one node type and leaves the rest alone', () => {
		const html = reactHTML(
			docOf(paragraph('kept'), {
				type: 'image',
				attrs: { id: 'i', src: 'https://example.com/a.png', alt: 'cat' }
			}),
			{
				components: {
					image: ({ node }) => {
						const attrs = imageAttributes(node);
						return attrs ? (
							<figure>
								<img
									src={attrs.src}
									alt={attrs.alt}
								/>
								<figcaption>{attrs.alt}</figcaption>
							</figure>
						) : null;
					}
				}
			}
		);

		expect(html).toContain('<p>kept</p>');
		expect(html).toContain('<figcaption>cat</figcaption>');
		expect(html).not.toContain('blockleaf-image');
	});

	it('gives an override the node and its rendered children', () => {
		const Callout: NodeRenderer = ({ node, children }) => (
			<aside data-tone={String(node.attrs?.tone)}>{children}</aside>
		);

		const html = reactHTML(
			docOf({
				type: 'callout',
				attrs: { tone: 'warn' },
				content: [paragraph('careful')]
			}),
			{ components: { callout: Callout } }
		);

		expect(html).toBe('<aside data-tone="warn"><p>careful</p></aside>');
	});

	it('can render a node type the defaults do not know', () => {
		const html = reactHTML(
			docOf({ type: 'embed', attrs: { url: 'https://example.com/v' } }),
			{
				components: {
					embed: ({ node }) => (
						<iframe src={String(node.attrs?.url)} />
					)
				}
			}
		);

		expect(html).toContain('<iframe src="https://example.com/v"');
	});

	it('lets an override take over the children it renders', () => {
		// A component that reorders its children needs `renderNode`, because
		// `children` arrives already assembled in document order.
		const Reversed: NodeRenderer = ({ node, renderNode, combine }) => (
			<ul>
				{combine(
					[...(node.content ?? [])]
						.reverse()
						.map((child) => renderNode(child, node))
				)}
			</ul>
		);

		const html = reactHTML(
			docOf({
				type: 'bulletList',
				content: [
					{ type: 'listItem', content: [paragraph('one')] },
					{ type: 'listItem', content: [paragraph('two')] }
				]
			}),
			{ components: { bulletList: Reversed } }
		);

		expect(html).toBe('<ul><li><p>two</p></li><li><p>one</p></li></ul>');
	});
});

describe('mark overrides', () => {
	it('replaces one mark type and leaves the rest alone', () => {
		const html = reactHTML(
			docOf({
				type: 'paragraph',
				content: [
					text('x', [{ type: 'bold' }]),
					text('y', [{ type: 'italic' }])
				]
			}),
			{
				marks: {
					bold: ({ children }) => <b className="loud">{children}</b>
				}
			}
		);

		expect(html).toBe('<p><b class="loud">x</b><em>y</em></p>');
	});

	it('keeps sanitisation when a link is overridden by choice', () => {
		// The override owns the decision — the helper is there so it does not
		// have to re-derive the rule, not so the rule is applied behind it.
		const html = reactHTML(
			docOf({
				type: 'paragraph',
				content: [
					text('go', [
						{
							type: 'link',
							attrs: { href: 'https://example.com' }
						}
					])
				]
			}),
			{
				marks: {
					link: ({ mark, children }) => (
						<a
							href={String(mark.attrs?.href)}
							data-tracked="true"
						>
							{children}
						</a>
					)
				}
			}
		);

		expect(html).toContain('data-tracked="true"');
	});
});

describe('without overrides', () => {
	it('renders exactly as it did before the prop existed', () => {
		const doc = docOf(paragraph('plain'));
		expect(reactHTML(doc)).toBe(reactHTML(doc, {}));
	});
});
