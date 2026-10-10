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
});
