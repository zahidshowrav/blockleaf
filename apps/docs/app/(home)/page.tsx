import { DemoPanel } from '@/components/landing/demo-panel';
import { Hero } from '@/components/landing/hero';
import { Packages } from '@/components/landing/packages';
import { Why } from '@/components/landing/why';
import { SiteStructuredData } from '@/components/structured-data';
import { gitConfig } from '@/lib/shared';

const repoUrl = `https://github.com/${gitConfig.user}/${gitConfig.repo}`;

/**
 * The landing page sits on a fixed plate — two emerald washes over a 32px
 * grid, with a blurred orb behind the hero — so the background stays put
 * while the sections scroll over it.
 */
const Page = () => (
	<div className="relative flex flex-1 flex-col overflow-x-hidden">
		<SiteStructuredData repoUrl={repoUrl} />

		<div
			aria-hidden="true"
			className="bl-backdrop pointer-events-none fixed inset-0 z-0"
		/>
		<div
			aria-hidden="true"
			className="bl-orb pointer-events-none fixed top-20 left-1/2 z-0 h-[340px] w-[720px] -translate-x-1/2 rounded-full"
		/>

		<div className="relative z-10 space-y-28 pb-24">
			<Hero />
			<DemoPanel />
			<Why />
			<Packages />
		</div>
	</div>
);

export default Page;
