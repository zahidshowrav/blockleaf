import { RootProvider } from 'fumadocs-ui/provider/next';
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';

import './global.css';
import { appDescription, appName } from '@/lib/shared';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
	title: { default: appName, template: `%s — ${appName}` },
	description: appDescription
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
