import { describe, expect, it } from 'vitest';

import { docOf } from './fixtures.js';
import { canonical, editorHTML, reactHTML, stringHTML } from './html.js';
import { toPlainText } from '../src/text.js';
import { type RenderableDocument, type RenderableNode } from '../src/types.js';

const video: RenderableNode = {
	type: 'video',
	attrs: {
		id: 'v',
		src: 'https://cdn.test/a.mp4',
		poster: 'https://cdn.test/a.png',
		width: 640,
		align: 'center'
	}
};

const audio: RenderableNode = {
	type: 'audio',
	attrs: { id: 'a', src: '/media/talk.mp3', title: 'The talk' }
};

const attachment: RenderableNode = {
	type: 'attachment',
	attrs: {
		id: 'f',
		src: 'https://cdn.test/report.pdf',
		name: 'report.pdf',
		size: 1_572_864,
		mime: 'application/pdf'
	}
};

const both = (doc: RenderableDocument) => [
	canonical(reactHTML(doc)),
	canonical(stringHTML(doc))
];

const embed: RenderableNode = {
	type: 'embed',
	attrs: {
		id: 'e',
		src: 'https://player.vimeo.com/video/76979871',
		width: 480,
		align: 'right'
	}
};

describe('media blocks (PA-12 to PA-14)', () => {
	it.each([
		['a video', video],
		['an audio clip', audio],
		['a file', attachment],
		['an embed', embed],
		[
			'a full width embed',
			{ ...embed, attrs: { ...embed.attrs, width: 'full', align: null } }
		]
	])('renders %s exactly as the editor writes it', (_, node) => {
		const doc = docOf(node);
		const editor = canonical(editorHTML(doc));
		for (const html of both(doc)) expect(html).toBe(editor);
	});

	it('renders a captioned video as the editor does', () => {
		const doc = docOf({
			type: 'figure',
			attrs: { id: 'fig' },
			content: [
				video,
				{ type: 'caption', content: [{ type: 'text', text: 'Launch' }] }
			]
		});
		const editor = canonical(editorHTML(doc));
		for (const html of both(doc)) expect(html).toBe(editor);
	});

	it('names an audio player with no title from the labels', () => {
		const doc = docOf({ type: 'audio', attrs: { src: '/a.mp3' } });
		expect(
			canonical(stringHTML(doc, { labels: { audio: 'Son' } }))
		).toContain('aria-label="Son"');
		expect(
			canonical(reactHTML(doc, { labels: { audio: 'Son' } }))
		).toContain('aria-label="Son"');
	});

	it.each([
		['javascript:alert(1)'],
		['data:video/mp4;base64,AAAA'],
		['http://cdn.test/a.mp4']
	])('renders nothing for an unsafe source: %s', (src) => {
		for (const type of ['video', 'audio', 'attachment']) {
			const doc = docOf({ type, attrs: { src, name: 'x' } });
			for (const html of both(doc)) {
				expect(html).toBe('');
			}
		}
	});

	it('drops an unsafe poster and keeps the video', () => {
		const doc = docOf({
			type: 'video',
			attrs: { src: '/a.mp4', poster: 'javascript:alert(1)' }
		});
		for (const html of both(doc)) {
			expect(html).toContain('<video');
			expect(html).not.toContain('poster');
		}
	});

	it('escapes a file name', () => {
		const doc = docOf({
			type: 'attachment',
			attrs: { src: '/a.pdf', name: '<img src=x onerror=alert(1)>.pdf' }
		});
		// The raw output: the canonical form decodes text again.
		for (const html of [reactHTML(doc), stringHTML(doc)]) {
			expect(html).not.toContain('<img');
			expect(html).toContain('&lt;img');
		}
	});

	it('counts a file as its name in plain text, and players as nothing', () => {
		expect(toPlainText(docOf(video, attachment, audio))).toBe('report.pdf');
	});
});

describe('full width (PA-24)', () => {
	it.each([
		[
			'an image',
			{
				type: 'image',
				attrs: { id: 'i', src: '/a.png', alt: 'A', width: 'full' }
			}
		],
		[
			'a video',
			{ type: 'video', attrs: { id: 'v', src: '/a.mp4', width: 'full' } }
		]
	])('renders %s at full width exactly as the editor does', (_, node) => {
		const doc = docOf(node as RenderableNode);
		const editor = canonical(editorHTML(doc));
		expect(editor).toContain('data-width="full"');
		for (const html of both(doc)) expect(html).toBe(editor);
	});

	it('writes no width for a word it does not know', () => {
		const doc = docOf({
			type: 'image',
			attrs: { src: '/a.png', width: 'wide' }
		});
		for (const html of both(doc)) {
			expect(html).not.toContain('width');
		}
	});
});

describe('embeds', () => {
	it('renders a captioned embed as the editor does', () => {
		const doc = docOf({
			type: 'figure',
			attrs: { id: 'fig' },
			content: [
				embed,
				{
					type: 'caption',
					content: [{ type: 'text', text: 'The talk' }]
				}
			]
		});
		const editor = canonical(editorHTML(doc));
		for (const html of both(doc)) expect(html).toBe(editor);
	});

	it.each([
		['a page rather than a player', 'https://vimeo.com/76979871'],
		['another site', 'https://evil.test/embed'],
		['a script', 'javascript:alert(1)']
	])('renders nothing for %s', (_, src) => {
		const doc = docOf({ type: 'embed', attrs: { src } });
		for (const html of both(doc)) expect(html).toBe('');
	});

	it('names the frame from the labels', () => {
		const doc = docOf(embed);
		const labels = { embed: (provider: string) => `Lecteur ${provider}` };
		expect(canonical(stringHTML(doc, { labels }))).toContain(
			'title="Lecteur vimeo"'
		);
		expect(canonical(reactHTML(doc, { labels }))).toContain(
			'title="Lecteur vimeo"'
		);
	});

	it('counts as nothing in plain text', () => {
		expect(toPlainText(docOf(embed))).toBe('');
	});
});
