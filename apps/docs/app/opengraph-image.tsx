import { renderOGImage } from '@/lib/og';
import { appDescription, appTagline } from '@/lib/shared';

export const alt = `Blockleaf — ${appTagline}`;
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

/** The default social card, used by any page that does not name its own. */
const Image = () =>
	renderOGImage({ title: appTagline, description: appDescription });

export default Image;
