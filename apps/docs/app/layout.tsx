import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './global.css';
import {
	appDescription,
	appName,
	appTagline,
	gitConfig,
	siteUrl
} from '@/lib/shared';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	metadataBase: siteUrl,
	title: {
		default: `${appName} — ${appTagline}`,
		template: `%s — ${appName}`
	},
	description: appDescription,
	applicationName: appName,
	authors: [
		{
			name: 'Zahid R. Showrav',
			url: `https://github.com/${gitConfig.user}`
		}
	],
	creator: 'Zahid R. Showrav',
	keywords: [
		'block editor',
		'rich text editor',
		'React editor',
		'Notion-style editor',
		'Tiptap',
		'ProseMirror',
		'WYSIWYG',
		'headless editor',
		'Novel alternative',
		'JSON document schema'
	],
	alternates: { canonical: '/' },
	openGraph: {
		type: 'website',
		siteName: appName,
		title: `${appName} — ${appTagline}`,
		description: appDescription,
		url: siteUrl
	},
	twitter: {
		card: 'summary_large_image',
		title: `${appName} — ${appTagline}`,
		description: appDescription
	},
	robots: {
		index: true,
		follow: true,
		googleBot: { index: true, follow: true, 'max-image-preview': 'large' }
	}
};

const Layout = ({ children }: LayoutProps<'/'>) => (
	<html
		lang="en"
		className={inter.className}
		suppressHydrationWarning
	>
		<body className="flex min-h-screen flex-col">
			<RootProvider>{children}</RootProvider>
		</body>
	</html>
);

export default Layout;
