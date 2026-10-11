import { describe, expect, it } from 'vitest';

import { sanitizeHref } from '../src/core/marks/link.js';

describe('link href sanitisation (EC-09)', () => {
	it('accepts valid https URLs', () => {
		expect(sanitizeHref('https://example.com')).toBe('https://example.com');
		expect(sanitizeHref('https://example.com/path?foo=bar#baz')).toBe(
			'https://example.com/path?foo=bar#baz'
		);
	});

	it('accepts mailto links', () => {
		expect(sanitizeHref('mailto:user@example.com')).toBe(
			'mailto:user@example.com'
		);
	});

	it('accepts site-relative paths and hash anchors', () => {
		expect(sanitizeHref('/docs/overview')).toBe('/docs/overview');
		expect(sanitizeHref('#heading-1')).toBe('#heading-1');
		expect(sanitizeHref('docs/getting-started')).toBe(
			'docs/getting-started'
		);
	});

	it('rejects javascript: URLs strictly', () => {
		expect(sanitizeHref('javascript:alert(1)')).toBeNull();
		expect(sanitizeHref('javascript:void(0)')).toBeNull();
		expect(sanitizeHref('JAVASCRIPT:alert(1)')).toBeNull();
		expect(sanitizeHref('  javascript:alert(1)  ')).toBeNull();
	});

	it('rejects protocol-relative, data:, and vbscript: URLs', () => {
		expect(sanitizeHref('//evil.com')).toBeNull();
		expect(
			sanitizeHref('data:text/html,<script>alert(1)</script>')
		).toBeNull();
		expect(sanitizeHref('vbscript:msgbox(1)')).toBeNull();
		expect(sanitizeHref('file:///etc/passwd')).toBeNull();
	});

	it('rejects empty or whitespace-only links', () => {
		expect(sanitizeHref('')).toBeNull();
		expect(sanitizeHref('   ')).toBeNull();
	});
});
