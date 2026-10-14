import type { MetadataRoute } from 'next';

import { siteUrl } from '@/lib/shared';

const robots = (): MetadataRoute.Robots => ({
	rules: [{ userAgent: '*', allow: '/' }],
	sitemap: new URL('sitemap.xml', siteUrl).href,
	host: siteUrl.origin
});

export default robots;
