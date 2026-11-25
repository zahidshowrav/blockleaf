/**
 * The sites an embed may show, and the only addresses its frame may load.
 *
 * An `<iframe>` runs another site's page inside yours, so an embed's `src`
 * is held to a fixed list in the schema, as a link's `href` is. A stored
 * `src` is the provider's own player address, never the page someone
 * pasted: the editor turns a pasted page into a player address once, on the
 * way in, and everything after that only checks it against this list.
 *
 * Each pattern matches a whole address, `https:` only, on the provider's
 * player host, with an id of the shape that provider uses.
 */
export const EMBED_PROVIDERS = {
	youtube:
		/^https:\/\/www\.youtube-nocookie\.com\/embed\/[\w-]{11}(\?start=\d+)?$/,
	vimeo: /^https:\/\/player\.vimeo\.com\/video\/\d+(\?h=[\da-f]+)?$/,
	loom: /^https:\/\/www\.loom\.com\/embed\/[\da-f]{32}$/,
	spotify:
		/^https:\/\/open\.spotify\.com\/embed\/(track|album|playlist|episode|show)\/[A-Za-z\d]{22}$/,
	codepen: /^https:\/\/codepen\.io\/[\w-]+\/embed\/[A-Za-z\d]+$/
} as const;

export type EmbedProvider = keyof typeof EMBED_PROVIDERS;

/**
 * The provider a player address belongs to, or `null` when it is not on the
 * list. Every stored or rendered `src` goes through this.
 */
export const embedProviderOf = (src: string): EmbedProvider | null => {
	for (const [provider, pattern] of Object.entries(EMBED_PROVIDERS)) {
		if (pattern.test(src)) return provider as EmbedProvider;
	}
	return null;
};

/** A player address that is on the list, or `null`. */
export const sanitizeEmbedSrc = (src: string): string | null => {
	const trimmed = src.trim();
	return embedProviderOf(trimmed) ? trimmed : null;
};

/** `90`, `1m30s` or `1h2m3s`, as YouTube writes a start time, in seconds. */
const seconds = (value: string | null): number => {
	if (!value) return 0;
	if (/^\d+$/.test(value)) return Number(value);
	const match = /^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/.exec(value);
	if (!match) return 0;
	const [, h = '0', m = '0', s = '0'] = match;
	return Number(h) * 3600 + Number(m) * 60 + Number(s);
};

const youtube = (url: URL, host: string, path: string[]): string | null => {
	let id: string | null = null;
	if (host === 'youtu.be') id = path[0] ?? null;
	else if (path[0] === 'watch') id = url.searchParams.get('v');
	else if (['embed', 'shorts', 'live', 'v'].includes(path[0] ?? ''))
		id = path[1] ?? null;
	if (!id) return null;
	const start = seconds(
		url.searchParams.get('t') ?? url.searchParams.get('start')
	);
	return `https://www.youtube-nocookie.com/embed/${id}${start ? `?start=${start}` : ''}`;
};

const vimeo = (url: URL, host: string, path: string[]): string | null => {
	// `player.vimeo.com/video/1?h=abc`, `vimeo.com/1`, or an unlisted
	// `vimeo.com/1/abc`, whose second part is the key the player needs.
	const [first, second] =
		host === 'player.vimeo.com' && path[0] === 'video'
			? [path[1], url.searchParams.get('h')]
			: [path[0], path[1] ?? url.searchParams.get('h')];
	if (!first || !/^\d+$/.test(first)) return null;
	return `https://player.vimeo.com/video/${first}${second ? `?h=${second}` : ''}`;
};

const HOSTS: Record<
	string,
	(url: URL, host: string, path: string[]) => string | null
> = {
	'youtube.com': youtube,
	'm.youtube.com': youtube,
	'youtu.be': youtube,
	'youtube-nocookie.com': youtube,
	'vimeo.com': vimeo,
	'player.vimeo.com': vimeo,
	'loom.com': (_url, _host, path) =>
		path[0] === 'share' || path[0] === 'embed'
			? `https://www.loom.com/embed/${path[1] ?? ''}`
			: null,
	'open.spotify.com': (_url, _host, path) => {
		// A localised address puts `intl-de` first.
		const parts = path[0]?.startsWith('intl-') ? path.slice(1) : path;
		const [kind, id] = parts[0] === 'embed' ? parts.slice(1) : parts;
		return kind && id
			? `https://open.spotify.com/embed/${kind}/${id}`
			: null;
	},
	'codepen.io': (_url, _host, path) =>
		path[0] && (path[1] === 'pen' || path[1] === 'embed') && path[2]
			? `https://codepen.io/${path[0]}/embed/${path[2]}`
			: null
};

/**
 * The player address for a page someone pasted or typed: a YouTube watch
 * page, a Vimeo video, a Loom share, a Spotify track, album, playlist,
 * episode or show, or a CodePen pen. A player address already on the list
 * comes back as it is. Anything else is `null`, and is not embedded.
 */
export const toEmbedSrc = (input: string): string | null => {
	const trimmed = input.trim();
	const own = sanitizeEmbedSrc(trimmed);
	if (own) return own;
	let url: URL;
	try {
		url = new URL(trimmed);
	} catch {
		return null;
	}
	if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
	const host = url.hostname.replace(/^www\./, '');
	const path = url.pathname.split('/').filter(Boolean);
	const src = HOSTS[host]?.(url, host, path) ?? null;
	return src ? sanitizeEmbedSrc(src) : null;
};
