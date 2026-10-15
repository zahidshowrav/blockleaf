import { appDescription, appName, appTagline, siteUrl } from '@/lib/shared';

const absolute = (path: string) => new URL(path, siteUrl).href;

/**
 * JSON-LD, rendered as a plain script tag.
 *
 * `JSON.stringify` output is injected directly, so anything that could close
 * the tag early has to be escaped — a description containing `</script>`
 * would otherwise end the block and leave the rest as markup.
 */
const Script = ({ data }: { data: object }) => (
	<script
		type="application/ld+json"
		dangerouslySetInnerHTML={{
			__html: JSON.stringify(data).replace(/</g, '\\u003c')
		}}
	/>
);

/** The site itself, plus the thing it documents. Rendered once, on the home page. */
export const SiteStructuredData = ({ repoUrl }: { repoUrl: string }) => (
	<>
		<Script
			data={{
				'@context': 'https://schema.org',
				'@type': 'WebSite',
				name: appName,
				alternateName: `${appName} — ${appTagline}`,
				description: appDescription,
				url: siteUrl.href
			}}
		/>
		<Script
			data={{
				'@context': 'https://schema.org',
				'@type': 'SoftwareSourceCode',
				name: '@blockleaf/editor',
				description: appDescription,
				codeRepository: repoUrl,
				programmingLanguage: 'TypeScript',
				runtimePlatform: 'React',
				license: 'https://opensource.org/licenses/MIT',
				url: siteUrl.href
			}}
		/>
	</>
);

/** A documentation page. */
export const DocStructuredData = ({
	title,
	description,
	url
}: {
	title: string;
	description?: string;
	url: string;
}) => (
	<Script
		data={{
			'@context': 'https://schema.org',
			'@type': 'TechArticle',
			headline: title,
			description,
			url: absolute(url),
			isPartOf: { '@type': 'WebSite', name: appName, url: siteUrl.href }
		}}
	/>
);

/** A blog post. */
export const PostStructuredData = ({
	title,
	description,
	url,
	image,
	datePublished,
	authors
}: {
	title: string;
	description?: string;
	url: string;
	image?: string;
	datePublished?: string;
	authors: { name: string; url?: string }[];
}) => (
	<Script
		data={{
			'@context': 'https://schema.org',
			'@type': 'BlogPosting',
			headline: title,
			description,
			url: absolute(url),
			image: image ? absolute(image) : undefined,
			datePublished,
			author: authors.map((author) => ({
				'@type': 'Person',
				name: author.name,
				url: author.url
			})),
			publisher: { '@type': 'Organization', name: appName }
		}}
	/>
);
