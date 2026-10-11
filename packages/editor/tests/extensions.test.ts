import { describe, expect, it } from 'vitest';

import { HEADING_LEVELS } from '../src/core/constants.js';
import { createExtensions, presets } from '../src/core/extensions.js';

describe('extension presets', () => {
	it('exposes every preset as a factory', () => {
		expect(Object.keys(presets).sort()).toEqual(['minimal', 'standard']);
	});

	it('returns a fresh array per call so consumers cannot mutate shared state', () => {
		expect(createExtensions('standard')).not.toBe(
			createExtensions('standard')
		);
	});

	it('caps headings at three levels', () => {
		expect(HEADING_LEVELS).toEqual([1, 2, 3]);
	});

	it('configures minimal preset with inline formatting only', () => {
		const extensions = createExtensions('minimal');
		const names = extensions.map((e) => e.name);

		expect(names).toContain('starterKit');
		expect(names).toContain('underline');
		expect(names).toContain('link');
		expect(names).toContain('uniqueID');
		expect(names).toContain('pasteNormalizer');
		expect(names).not.toContain('callout');
		expect(names).not.toContain('taskList');
	});

	it('configures standard preset with full node and mark set (EC-03, EC-04, EC-05, EC-08)', () => {
		const extensions = createExtensions('standard');
		const names = extensions.map((e) => e.name);

		expect(names).toContain('starterKit');
		expect(names).toContain('underline');
		expect(names).toContain('link');
		expect(names).toContain('highlight');
		expect(names).toContain('taskList');
		expect(names).toContain('taskItem');
		expect(names).toContain('callout');
		expect(names).toContain('uniqueID');
		expect(names).toContain('shortcuts');
		expect(names).toContain('pasteNormalizer');
		expect(names).toContain('tableKit');
	});
});
