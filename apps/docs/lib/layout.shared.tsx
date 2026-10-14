import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared';

import { appName, gitConfig } from '@/lib/shared';

export const baseOptions = (): BaseLayoutProps => ({
	nav: {
		title: (
			<>
				<span aria-hidden="true">🍃</span>
				<span className="font-semibold">{appName}</span>
			</>
		)
	},
	githubUrl: `https://github.com/${gitConfig.user}/${gitConfig.repo}`
});
