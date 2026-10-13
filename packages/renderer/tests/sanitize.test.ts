import { describe, expect, it } from 'vitest';

import {
	sanitizeHref as editorHref,
	sanitizeSrc as editorSrc
} from '@blockleaf/editor/extensions';

import { sanitizeHref, sanitizeSrc } from '../src/sanitize.js';

/**
 * The renderer carries its own copy of the editor's URL rules, because it
 * reads documents the editor did not write and cannot assume they were ever
 * sanitised. Copies drift, so every vector runs through both implementations
 * and they must agree. See F15.
 */

const HREFS = [
	'https://example.com',
	'https://example.com/a?b=c#d',
	'mailto:someone@example.com',
	'/docs/getting-started',
	'#section',
	'docs/getting-started',
	'',
	'   ',
	'javascript:alert(1)',
	'JavaScript:alert(1)',
	'  javascript:alert(1)  ',
	'data:text/html,<script>alert(1)</script>',
	'vbscript:msgbox(1)',
	'//evil.example.com',
	'http://example.com',
	'file:///etc/passwd'
];

const SRCS = [
	'https://example.com/a.png',
	'/uploads/a.png',
	'uploads/a.png',
	'data:image/png;base64,iVBORw0KGgo=',
	'data:image/webp;base64,UklGRg==',
	'data:image/svg+xml;base64,PHN2Zz4=',
	'data:text/html;base64,PHNjcmlwdD4=',
	'blob:https://example.com/abc-123',
	'http://example.com/a.png',
	'//example.com/a.png',
	'javascript:alert(1)',
	'',
	'   '
];

describe('sanitizeHref agrees with the editor', () => {
	it.each(HREFS)('%j', (href) => {
		expect(sanitizeHref(href)).toBe(editorHref(href));
	});
});

describe('sanitizeSrc agrees with the editor', () => {
	it.each(SRCS)('%j', (src) => {
		expect(sanitizeSrc(src)).toBe(editorSrc(src));
	});
});

describe('the rules themselves', () => {
	it.each([
		'javascript:alert(1)',
		'JavaScript:alert(1)',
		'data:text/html,<script>alert(1)</script>',
		'vbscript:msgbox(1)',
		'//evil.example.com',
		'http://example.com',
		'file:///etc/passwd',
		''
	])('rejects %j as an href', (href) => {
		expect(sanitizeHref(href)).toBeNull();
	});

	it.each([
		'blob:https://example.com/abc',
		'data:image/svg+xml;base64,PHN2Zz4=',
		'data:text/html;base64,PHNjcmlwdD4=',
		'http://example.com/a.png',
		'//example.com/a.png',
		'javascript:alert(1)',
		''
	])('rejects %j as an image source', (src) => {
		expect(sanitizeSrc(src)).toBeNull();
	});
});
