import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
	testDir: './e2e',
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: process.env.CI ? 2 : 0,
	workers: process.env.CI ? 1 : undefined,
	reporter: 'list',
	use: {
		baseURL: 'http://localhost:5180',
		trace: 'on-first-retry'
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices['Desktop Chrome'] },
			testIgnore: /touch\.spec\.ts/
		},
		{
			// HD-04. A phone is not a narrow desktop: it never fires
			// `mousemove`, so anything hover-driven has to be proven another way.
			name: 'mobile-chrome',
			use: { ...devices['Pixel 7'] },
			testMatch: /touch\.spec\.ts/
		}
	],
	webServer: {
		command: 'pnpm --filter sandbox dev --port 5180',
		url: 'http://localhost:5180',
		reuseExistingServer: !process.env.CI,
		timeout: 30000
	}
});
