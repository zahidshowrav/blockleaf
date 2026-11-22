/** One emoji the picker can offer. */
export interface EmojiItem {
	/** What is inserted: the emoji itself, as plain text. */
	emoji: string;
	/** Its Unicode name, lower case — `party popper`. */
	name: string;
	/** Other words it is found by — `tada`, `celebration`. */
	keywords: readonly string[];
}

/**
 * Reads the generated table (`EMOJI_DATA`): one emoji per line, its name and
 * keywords after tabs.
 */
export const parseEmojiData = (data: string): EmojiItem[] =>
	data.split('\n').map((line) => {
		const [emoji = '', name = '', keywords = ''] = line.split('\t');
		return {
			emoji,
			name,
			keywords: keywords ? keywords.split(' ') : []
		};
	});

/**
 * A smaller number is a better match; `Infinity` is no match. The name comes
 * first: `rocket` is the rocket, before the astronaut whose keyword it is.
 */
const score = (item: EmojiItem, query: string): number => {
	if (item.name === query) return 0;
	if (item.name.startsWith(query)) return 1;
	if (item.keywords.includes(query)) return 2;
	if (
		item.name.split(' ').some((word) => word.startsWith(query)) ||
		item.keywords.some((word) => word.startsWith(query))
	) {
		return 3;
	}
	if (item.name.includes(query)) return 4;
	return Number.POSITIVE_INFINITY;
};

/**
 * The best `limit` matches for what was typed after the `:`, best first,
 * ties in the table's own order — Unicode's, which keeps the common faces
 * near the top.
 *
 * `thumbs_up` finds `thumbs up`: an underscore is how a shortcode spells a
 * space.
 */
export const searchEmoji = (
	items: readonly EmojiItem[],
	query: string,
	limit = 8
): EmojiItem[] => {
	const needle = query.toLowerCase().replaceAll('_', ' ').trim();
	if (!needle) return items.slice(0, limit);
	return items
		.map((item, index) => ({ item, index, rank: score(item, needle) }))
		.filter((entry) => entry.rank !== Number.POSITIVE_INFINITY)
		.sort((a, b) => a.rank - b.rank || a.index - b.index)
		.slice(0, limit)
		.map((entry) => entry.item);
};
