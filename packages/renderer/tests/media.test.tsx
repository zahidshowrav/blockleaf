import { describe, expect, it } from 'vitest';

import { docOf } from './fixtures.js';
import { canonical, editorHTML, reactHTML, stringHTML } from './html.js';
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

const both = (doc: RenderableDocument) => [
	canonical(reactHTML(doc)),
	canonical(stringHTML(doc))
];

describe('media blocks (PA-12)', () => {
	it.each([['a video', video]])(
		'renders %s exactly as the editor writes it',
		(_, node) => {
			const doc = docOf(node);
			const editor = canonical(editorHTML(doc));
			for (const html of both(doc)) expect(html).toBe(editor);
		}
	);

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

	it.each([
		['javascript:alert(1)'],
		['data:video/mp4;base64,AAAA'],
		['http://cdn.test/a.mp4']
	])('renders nothing for an unsafe source: %s', (src) => {
		for (const type of ['video']) {
			const doc = docOf({ type, attrs: { src } });
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
});
