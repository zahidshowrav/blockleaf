/**
 * Escaping for the Markdown target.
 *
 * Every character Markdown could read as syntax gets a backslash, so text
 * comes out as the same text. A few are only syntax in one place — `#` at
 * the start of a line, `|` inside a table — and are escaped only there, so
 * ordinary prose does not fill up with backslashes.
 */

/**
 * Text as Markdown reads it back unchanged. `_` inside a word is left alone,
 * since Markdown never reads it as emphasis there, and `&` only where it
 * would start a character reference.
 */
export const escapeMarkdown = (value: string): string =>
	value
		.replace(/[\\`*[\]<~$]/g, '\\$&')
		.replace(/_/g, (match, offset: number, whole: string) =>
			/\w/.test(whole[offset - 1] ?? '') &&
			/\w/.test(whole[offset + 1] ?? '')
				? match
				: '\\_'
		)
		.replace(/&(?=#?\w+;)/g, '\\&');

/**
 * Text that starts a line, escaped so it does not start a heading, a quote,
 * a list or a rule. Leading spaces become a character reference, or four of
 * them would start a code block.
 */
export const escapeLineStart = (value: string): string =>
	value
		.replace(/^[#>+=-]/, '\\$&')
		.replace(/^(\d+)([.)])/, '$1\\$2')
		.replace(/^[ \t]/, (space) => (space === ' ' ? '&#32;' : '&#9;'));

/** The longest run of a character, so a fence or code span can be longer. */
const longestRun = (value: string, character: string): number => {
	let longest = 0;
	let current = 0;
	for (const each of value) {
		current = each === character ? current + 1 : 0;
		longest = Math.max(longest, current);
	}
	return longest;
};

/** Inline code. The backticks around it outnumber any run inside it. */
export const codeSpan = (value: string): string => {
	const ticks = '`'.repeat(longestRun(value, '`') + 1);
	// Markdown strips one space from each end when both ends have one, and
	// a backtick at either end would join the fence.
	const pad =
		/^`|`$/.test(value) || (/^ [^]* $/.test(value) && value.trim() !== '')
			? ' '
			: '';
	return `${ticks}${pad}${value}${pad}${ticks}`;
};

/** A code fence that no line of the code can close early. */
export const codeFence = (value: string): string =>
	'`'.repeat(Math.max(3, longestRun(value, '`') + 1));

/**
 * A link or image address. Spaces, brackets and parentheses are
 * percent-encoded, so the address cannot end the link early.
 */
export const linkDestination = (url: string): string =>
	url.replace(
		/[ ()<>]/g,
		(character) => `%${character.charCodeAt(0).toString(16).toUpperCase()}`
	);

/** Text inside an HTML element, for the one block written as HTML. */
export const escapeHtmlText = (value: string): string =>
	value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/** Puts `prefix` before every line; an empty line gets it without spaces. */
export const prefixLines = (value: string, prefix: string): string =>
	value
		.split('\n')
		.map((line) => (line ? prefix + line : prefix.trimEnd()))
		.join('\n');

/**
 * Indents every line after the first, which already carries a list marker.
 * Empty lines stay empty.
 */
export const hangingIndent = (value: string, width: number): string => {
	const indent = ' '.repeat(width);
	return value
		.split('\n')
		.map((line, index) => (index === 0 || !line ? line : indent + line))
		.join('\n');
};
