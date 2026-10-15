import { ImageResponse } from 'next/og';

import { appName } from '@/lib/shared';

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

const accent = '#6d8bff';

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
				<svg
					width="40"
					height="40"
					viewBox="0 0 24 24"
					fill="none"
					stroke={accent}
					strokeWidth="2"
					strokeLinecap="round"
					strokeLinejoin="round"
				>
					<path d="M11 20a10 10 0 0010-10 25.9 25.9 0 00-1.04-7.281 1 1 0 00-1.755-.325C15.833 5.5 13 5.5 9.8 6.1A7 7 0 0011 20" />
					<path d="M2 21a5 5 0 012.911-4.544C7.613 15.212 8.351 15.24 11 13" />
				</svg>
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
