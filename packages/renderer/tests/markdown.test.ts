import { marked } from 'marked';
import { describe, expect, it } from 'vitest';

import { docOf, paragraph, text } from './fixtures.js';
import { renderToMarkdown } from '../src/markdown.js';
import { type RenderableNode } from '../src/types.js';

/**
 * The Markdown target. Most tests read the output back with a real
 * Markdown parser, because the point is what a reader makes of it, and a
 * stray `*` only shows up there.
 */

const md = (...blocks: RenderableNode[]) => renderToMarkdown(docOf(...blocks));

/** The Markdown read back as HTML, the GitHub kind. */
const read = (markdown: string) =>
	(marked.parse(markdown, { gfm: true, async: false }) as string).trim();

const p = (...content: RenderableNode[]): RenderableNode => ({
	type: 'paragraph',
	content
});
const bold = { type: 'bold' };
const italic = { type: 'italic' };
const code = { type: 'code' };
const linkTo = (href: string) => ({ type: 'link', attrs: { href } });

const list = (
	type: string,
	items: RenderableNode[][],
	attrs?: Record<string, unknown>
): RenderableNode => ({
	type,
	...(attrs ? { attrs } : {}),
	content: items.map((content) => ({
		type: type === 'taskList' ? 'taskItem' : 'listItem',
		content
	}))
});

describe('blocks', () => {
	it('writes headings, paragraphs and a rule, a blank line apart', () => {
		expect(
			md(
				{
					type: 'heading',
					attrs: { level: 2 },
					content: [text('Title')]
				},
				paragraph('Hello'),
				{ type: 'horizontalRule' },
				paragraph('Bye')
			)
		).toBe('## Title\n\nHello\n\n---\n\nBye\n');
	});

	it('leaves empty paragraphs out, and an empty document is empty', () => {
		expect(
			md({ type: 'paragraph' }, paragraph('a'), { type: 'paragraph' })
		).toBe('a\n');
		expect(md()).toBe('');
	});

	it('writes a quote, and a callout as a quote with its emoji', () => {
		expect(
			md({
				type: 'blockquote',
				content: [paragraph('a'), paragraph('b')]
			})
		).toBe('> a\n>\n> b\n');
		expect(
			md({
				type: 'callout',
				attrs: { emoji: '💡', tone: 'info' },
				content: [paragraph('Tip')]
			})
		).toBe('> 💡 Tip\n');
	});

	it('fences code with its language, longer than any backticks inside', () => {
		expect(
			md({
				type: 'codeBlock',
				attrs: { language: 'ts' },
				content: [text('const a = 1;\n```')]
			})
		).toBe('````ts\nconst a = 1;\n```\n````\n');
		expect(
			read(md({ type: 'codeBlock', content: [text('<b>*x*</b>')] }))
		).toBe('<pre><code>&lt;b&gt;*x*&lt;/b&gt;\n</code></pre>');
	});

	it('writes a toggle as <details>, with its first block as the title', () => {
		expect(
			md({
				type: 'details',
				attrs: { open: true },
				content: [paragraph('More <info>'), paragraph('Body')]
			})
		).toBe(
			'<details open>\n<summary>More &lt;info&gt;</summary>\n\nBody\n\n</details>\n'
		);
	});

	it('leaves the table of contents out', () => {
		expect(md({ type: 'tableOfContents' }, paragraph('a'))).toBe('a\n');
	});

	it('renders an unknown node as nothing, or through `unknown`', () => {
		const doc = docOf({ type: 'mystery' }, paragraph('a'));
		expect(renderToMarkdown(doc)).toBe('a\n');
		expect(
			renderToMarkdown(doc, { unknown: ({ node }) => `[${node.type}]` })
		).toBe('[mystery]\n\na\n');
	});
});

describe('lists', () => {
	it('writes a tight list, with nested lists lined up under the text', () => {
		const markdown = md(
			list('bulletList', [
				[
					paragraph('a'),
					list('orderedList', [
						[paragraph('one')],
						[paragraph('two')]
					])
				],
				[paragraph('b')]
			])
		);
		expect(markdown).toBe('- a\n  1. one\n  2. two\n- b\n');
		expect(read(markdown)).toBe(
			'<ul>\n<li>a<ol>\n<li>one</li>\n<li>two</li>\n</ol>\n</li>\n<li>b</li>\n</ul>'
		);
	});

	it('numbers from the stored start, and indents under wider numbers', () => {
		const items = Array.from({ length: 2 }, (_, at) => [
			paragraph(`n${at}`),
			{ type: 'paragraph', content: [text('more')] }
		]);
		expect(md(list('orderedList', items, { start: 9 }))).toBe(
			'9. n0\n\n   more\n\n10. n1\n\n    more\n'
		);
	});

	it('writes task items with their boxes', () => {
		const markdown = md({
			type: 'taskList',
			content: [
				{
					type: 'taskItem',
					attrs: { checked: true },
					content: [paragraph('done')]
				},
				{
					type: 'taskItem',
					attrs: { checked: false },
					content: [paragraph('todo')]
				}
			]
		});
		expect(markdown).toBe('- [x] done\n- [ ] todo\n');
		expect(read(markdown)).toContain(
			'checked="" disabled="" type="checkbox"'
		);
	});

	it('keeps two lists in a row apart by switching the marker', () => {
		const markdown = md(
			list('bulletList', [[paragraph('a')]]),
			list('bulletList', [[paragraph('b')]]),
			list('orderedList', [[paragraph('c')]]),
			list('orderedList', [[paragraph('d')]])
		);
		expect(markdown).toBe('- a\n\n* b\n\n1. c\n\n1) d\n');
		expect(read(markdown).match(/<[ou]l>/g)).toHaveLength(4);
	});
});

describe('marks', () => {
	it('writes the marks Markdown has', () => {
		expect(
			md(
				p(
					text('b', [bold]),
					text(' i', [italic]),
					text(' s', [{ type: 'strike' }]),
					text(' '),
					text('c', [code])
				)
			)
		).toBe('**b** *i* ~~s~~ `c`\n');
	});

	it('writes a mark once around the text that shares it', () => {
		const markdown = md(
			p(text('a ', [bold]), text('b', [bold, italic]), text(' c'))
		);
		expect(markdown).toBe('**a *b*** c\n');
		expect(read(markdown)).toBe('<p><strong>a <em>b</em></strong> c</p>');
	});

	it('puts the mark that runs longer outside', () => {
		const markdown = md(p(text('a', [bold, italic]), text('b', [italic])));
		expect(read(markdown)).toBe('<p><em><strong>a</strong>b</em></p>');
	});

	it('moves spaces at the edge of a mark outside it', () => {
		const markdown = md(p(text('a'), text(' bold ', [bold]), text('b')));
		expect(markdown).toBe('a **bold** b\n');
	});

	it('drops what Markdown cannot say and keeps the text', () => {
		expect(
			md(
				p(
					text('u', [{ type: 'underline' }]),
					text('c', [{ type: 'textColor', attrs: { color: 'red' } }]),
					text('h', [{ type: 'highlight' }])
				)
			)
		).toBe('uch\n');
	});

	it('writes code raw, with enough backticks', () => {
		expect(md(p(text('a`b *c*', [code])))).toBe('``a`b *c*``\n');
		expect(md(p(text('`x', [code])))).toBe('`` `x ``\n');
	});

	it('writes a link, around its other marks, and drops an unsafe one', () => {
		const markdown = md(
			p(
				text('see '),
				text('the ', [linkTo('https://example.com/a b(1)')]),
				text('docs', [linkTo('https://example.com/a b(1)'), bold])
			)
		);
		expect(markdown).toBe(
			'see [the **docs**](https://example.com/a%20b%281%29)\n'
		);
		expect(read(markdown)).toBe(
			'<p>see <a href="https://example.com/a%20b%281%29">the <strong>docs</strong></a></p>'
		);
		expect(md(p(text('x', [linkTo('javascript:alert(1)')])))).toBe('x\n');
	});

	it('writes a line break as a backslash, and drops one at the end', () => {
		const markdown = md(
			p(text('a'), { type: 'hardBreak' }, text('b'), {
				type: 'hardBreak'
			})
		);
		expect(markdown).toBe('a\\\nb\n');
		expect(read(markdown)).toBe('<p>a<br>b</p>');
	});

	it('takes mark overrides', () => {
		expect(
			renderToMarkdown(docOf(p(text('u', [{ type: 'underline' }]))), {
				marks: { underline: ({ children }) => `<ins>${children}</ins>` }
			})
		).toBe('<ins>u</ins>\n');
	});
});

describe('escaping', () => {
	it('keeps text that looks like Markdown as text', () => {
		const tricky = [
			'*not em* _nor this_ `nor code` [no](link) <b>no html</b>',
			'~~no~~ $no maths$ \\ backslash &amp; entity',
			'# not a heading',
			'> not a quote',
			'- not a list',
			'+ nor this',
			'1. nor this',
			'---',
			'    not code'
		];
		for (const value of tricky) {
			const markdown = md(paragraph(value));
			const html = read(markdown);
			const unescaped = html
				.replace(/^<p>|<\/p>$/g, '')
				.replace(/&lt;/g, '<')
				.replace(/&gt;/g, '>')
				.replace(/&quot;/g, '"')
				.replace(/&amp;/g, '&');
			expect(unescaped, `${value} → ${markdown}`).toBe(value);
		}
	});

	it('leaves an underscore inside a word alone', () => {
		expect(md(paragraph('snake_case name'))).toBe('snake_case name\n');
	});

	it('escapes the start of the line after a line break', () => {
		const markdown = md(p(text('a'), { type: 'hardBreak' }, text('# b')));
		expect(read(markdown)).toBe('<p>a<br># b</p>');
	});
});

describe('media and links', () => {
	it('writes an image, and nothing for an unsafe one', () => {
		expect(
			md({
				type: 'image',
				attrs: { src: 'https://example.com/a.png', alt: 'A [cat]' }
			})
		).toBe('![A \\[cat\\]](https://example.com/a.png)\n');
		expect(
			md({ type: 'image', attrs: { src: 'javascript:alert(1)' } })
		).toBe('');
	});

	it('writes a captioned image as the image, then its caption', () => {
		expect(
			md({
				type: 'figure',
				content: [
					{
						type: 'image',
						attrs: { src: 'https://example.com/a.png', alt: '' }
					},
					{ type: 'caption', content: [text('A cat')] }
				]
			})
		).toBe('![](https://example.com/a.png)\n\nA cat\n');
	});

	it('writes video, audio, files, embeds and link cards as links', () => {
		expect(
			md(
				{ type: 'video', attrs: { src: 'https://example.com/v.mp4' } },
				{
					type: 'audio',
					attrs: { src: 'https://example.com/a.mp3', title: 'Talk' }
				},
				{
					type: 'attachment',
					attrs: { src: 'https://example.com/f.pdf', name: 'f.pdf' }
				},
				{
					type: 'embed',
					attrs: {
						src: 'https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ'
					}
				},
				{
					type: 'linkPreview',
					attrs: { url: 'https://example.com/post', title: 'A post' }
				}
			)
		).toBe(
			[
				'[Video](https://example.com/v.mp4)',
				'[Talk](https://example.com/a.mp3)',
				'[f.pdf](https://example.com/f.pdf)',
				'[YouTube video](https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ)',
				'[A post](https://example.com/post)'
			].join('\n\n') + '\n'
		);
	});

	it('uses the labels it is given', () => {
		expect(
			renderToMarkdown(
				docOf({
					type: 'video',
					attrs: { src: 'https://example.com/v.mp4' }
				}),
				{
					labels: { video: 'Vidéo' }
				}
			)
		).toBe('[Vidéo](https://example.com/v.mp4)\n');
	});

	it('writes a mention as its text', () => {
		expect(
			md(
				p(text('hi '), {
					type: 'mention',
					attrs: { id: '1', label: 'Ada_' }
				})
			)
		).toBe('hi @Ada\\_\n');
	});
});

describe('maths', () => {
	it('writes $…$ inside a line and $$…$$ as a block', () => {
		expect(
			md(
				p(text('Area '), {
					type: 'mathInline',
					attrs: { latex: ' \\pi r^2 ' }
				}),
				{ type: 'mathBlock', attrs: { latex: '\\int_0^1 x\\,dx' } }
			)
		).toBe('Area $\\pi r^2$\n\n$$\n\\int_0^1 x\\,dx\n$$\n');
	});

	it('leaves empty formulas out', () => {
		expect(
			md(p(text('a'), { type: 'mathInline', attrs: { latex: '' } }), {
				type: 'mathBlock',
				attrs: { latex: ' ' }
			})
		).toBe('a\n');
	});
});

describe('tables', () => {
	const cell = (
		type: string,
		value: string,
		attrs?: Record<string, unknown>
	) => ({
		type,
		...(attrs ? { attrs } : {}),
		content: [paragraph(value)]
	});
	const row = (...cells: RenderableNode[]) => ({
		type: 'tableRow',
		content: cells
	});

	it('writes a header row and the rows under it', () => {
		const markdown = md({
			type: 'table',
			content: [
				row(cell('tableHeader', 'Name'), cell('tableHeader', 'Age')),
				row(
					cell('tableCell', 'Ada | Lovelace'),
					cell('tableCell', '36')
				)
			]
		});
		expect(markdown).toBe(
			'| Name | Age |\n| --- | --- |\n| Ada \\| Lovelace | 36 |\n'
		);
		expect(read(markdown)).toContain('<td>Ada | Lovelace</td>');
	});

	it('gives a table with no header row an empty one', () => {
		expect(
			md({ type: 'table', content: [row(cell('tableCell', 'a'))] })
		).toBe('|  |\n| --- |\n| a |\n');
	});

	it('leaves the places a merged cell covers empty', () => {
		expect(
			md({
				type: 'table',
				content: [
					row(
						cell('tableHeader', 'a', { colspan: 2 }),
						cell('tableHeader', 'b')
					),
					row(
						cell('tableCell', 'c', { rowspan: 2 }),
						cell('tableCell', 'd'),
						cell('tableCell', 'e')
					),
					row(cell('tableCell', 'f'), cell('tableCell', 'g'))
				]
			})
		).toBe(
			'| a |  | b |\n| --- | --- | --- |\n| c | d | e |\n|  | f | g |\n'
		);
	});

	it('keeps a cell with several lines on one line', () => {
		expect(
			md({
				type: 'table',
				content: [
					row({
						type: 'tableCell',
						content: [
							p(text('a'), { type: 'hardBreak' }, text('b')),
							paragraph('c')
						]
					})
				]
			})
		).toBe('|  |\n| --- |\n| a<br>b<br>c |\n');
	});
});

describe('overrides', () => {
	it('replaces a node by name, with the inline helper', () => {
		expect(
			renderToMarkdown(docOf(paragraph('a')), {
				components: {
					paragraph: ({ node, inline }) => `P: ${inline(node)}`
				}
			})
		).toBe('P: a\n');
	});
});

describe('columns', () => {
	it('writes each column’s blocks one after another', () => {
		expect(
			md({
				type: 'columns',
				content: [
					{
						type: 'column',
						attrs: { width: 30 },
						content: [paragraph('Pros')]
					},
					{ type: 'column', content: [paragraph('Cons')] }
				]
			})
		).toBe('Pros\n\nCons\n');
	});
});
