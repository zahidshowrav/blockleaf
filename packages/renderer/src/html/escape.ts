/**
 * HTML escaping for the string target.
 *
 * Attribute values are written inside double quotes, so `'` does not need
 * escaping there; it is escaped anyway, because an attribute value is the one
 * place where being wrong about this is a vulnerability rather than a typo.
 */

export const escapeText = (value: string): string =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export const escapeAttribute = (value: string): string =>
	escapeText(value).replace(/"/g, '&quot;').replace(/'/g, '&#39;');

/**
 * Serialises attributes, skipping any whose value is `undefined`. An empty
 * string is kept: `alt=""` is meaningful and `alt` missing is not the same
 * thing.
 */
export const attributes = (
	pairs: Record<string, string | number | undefined>
): string => {
	let output = '';

	for (const [name, value] of Object.entries(pairs)) {
		if (value === undefined) continue;
		output += ` ${name}="${escapeAttribute(String(value))}"`;
	}

	return output;
};

/** Wraps children in an element. */
export const element = (
	tag: string,
	pairs: Record<string, string | number | undefined>,
	children: string
): string => `<${tag}${attributes(pairs)}>${children}</${tag}>`;

/** Void elements have no closing tag and no children. */
export const voidElement = (
	tag: string,
	pairs: Record<string, string | number | undefined>
): string => `<${tag}${attributes(pairs)}>`;
