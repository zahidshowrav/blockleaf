import type { ReactNode } from 'react';

const Layout = ({ children }: { children: ReactNode }) => (
	<main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-10 pb-24">
		{children}
	</main>
);

export default Layout;
