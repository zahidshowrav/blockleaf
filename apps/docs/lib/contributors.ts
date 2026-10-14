import { gitConfig } from '@/lib/shared';

export interface Contributor {
	login: string;
	avatar: string;
	url: string;
	contributions: number;
}

interface GitHubContributor {
	login?: string;
	type?: string;
	avatar_url?: string;
	html_url?: string;
	contributions?: number;
}

const endpoint = `https://api.github.com/repos/${gitConfig.user}/${gitConfig.repo}/contributors?per_page=100`;

/**
 * Everyone with a commit on the default branch, most commits first.
 *
 * `fumadocs-page-history` would do this per page and from git history, but it
 * requires Node 24.14 and this repository is pinned to 22.22.1 — so this is
 * the repository-wide version, read from the API at build time.
 *
 * Bots are filtered out: the release workflow's commits are the changeset
 * bot's, and crediting it next to people is noise.
 */
export const getContributors = async (): Promise<Contributor[]> => {
	const token = process.env.GITHUB_TOKEN;

	const response = await fetch(endpoint, {
		headers: {
			Accept: 'application/vnd.github+json',
			...(token ? { Authorization: `Bearer ${token}` } : {})
		},
		next: { revalidate: 3600 }
	});

	if (!response.ok) return [];

	const payload: unknown = await response.json();
	if (!Array.isArray(payload)) return [];

	return (payload as GitHubContributor[])
		.filter(
			(entry) =>
				entry.type !== 'Bot' &&
				typeof entry.login === 'string' &&
				!entry.login.endsWith('[bot]')
		)
		.map((entry) => ({
			login: entry.login ?? '',
			avatar: entry.avatar_url ?? '',
			url: entry.html_url ?? '',
			contributions: entry.contributions ?? 0
		}))
		.sort((a, b) => b.contributions - a.contributions);
};
