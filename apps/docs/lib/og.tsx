import { ImageResponse } from 'next/og';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { appName } from '@/lib/shared';

/**
 * The mark, inlined as a data URI. Satori has no way to resolve a relative
 * `/logo/...` URL while the cards are being generated at build time, and the
 * dark cut is the right one here — the card is always on #0b0d12.
 */
const mark = `data:image/png;base64,${readFileSync(
	join(process.cwd(), 'public/logo/logo-icon-1.png')
).toString('base64')}`;

const WIDTH = 1200;
const HEIGHT = 630;

/**
 * Keeps a string inside the card.
 *
 * Satori lays flex children out without shrinking them, so a long title and a
 * long description simply overlap — which is what the stock Fumadocs card
 * does with the titles on this site. Clamping the text is the reliable fix;
 * line clamping in CSS is not uniformly supported by the renderer.
 */
const clamp = (text: string, limit: number) => {
	const trimmed = text.trim();
	if (trimmed.length <= limit) return trimmed;

	const cut = trimmed.slice(0, limit);
	const lastSpace = cut.lastIndexOf(' ');

	return `${(lastSpace > limit * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`;
};

export interface OGImageOptions {
	title: string;
	description?: string;
	/** Sits above the title, e.g. `Documentation` or `Blog`. */
	section?: string;
}

const accent = '#34d399';

/** The social card. 1200×630, the size every scraper expects. */
export const renderOGImage = ({
	title,
	description,
	section
}: OGImageOptions) =>
	new ImageResponse(
		<div
			style={{
				display: 'flex',
				flexDirection: 'column',
				width: '100%',
				height: '100%',
				padding: '72px 80px',
				backgroundColor: '#0b0d12',
				color: '#ffffff',
				borderBottom: `16px solid ${accent}`
			}}
		>
			<div
				style={{
					display: 'flex',
					alignItems: 'center',
					gap: 16,
					fontSize: 30,
					fontWeight: 600,
					color: accent
				}}
			>
				<img
					src={mark}
					width={44}
					height={44}
					alt=""
				/>
				<span>{appName}</span>
				{section ? (
					<span style={{ color: 'rgba(255,255,255,0.35)' }}>
						{`/ ${section}`}
					</span>
				) : null}
			</div>

			<div
				style={{
					display: 'flex',
					flexDirection: 'column',
					marginTop: 'auto',
					gap: 20
				}}
			>
				<div
					style={{
						fontSize: title.length > 48 ? 62 : 76,
						fontWeight: 800,
						lineHeight: 1.1,
						letterSpacing: '-0.02em'
					}}
				>
					{clamp(title, 90)}
				</div>
				{description ? (
					<div
						style={{
							fontSize: 30,
							lineHeight: 1.35,
							color: 'rgba(240,242,248,0.72)'
						}}
					>
						{clamp(description, 150)}
					</div>
				) : null}
			</div>
		</div>,
		{ width: WIDTH, height: HEIGHT }
	);
