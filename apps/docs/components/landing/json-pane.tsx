const TOKENS =
	/("(?:\\.|[^"\\])*"\s*:|"(?:\\.|[^"\\])*"|-?\d+(?:\.\d+)?|\btrue\b|\bfalse\b|\bnull\b)/g;

const classOf = (token: string) => {
	if (token.endsWith(':')) return 'bl-json-key';
	if (token.startsWith('"')) return 'bl-json-str';
	if (token === 'true' || token === 'false' || token === 'null')
		return 'bl-json-lit';

	return 'bl-json-num';
};

/**
 * Tints a JSON document for display.
 *
 * Deliberately a regex and not a highlighter: the only grammar on this page
 * is JSON, and shipping a syntax-highlighting bundle to the landing page to
 * colour one `<pre>` is not a trade worth making.
 */
export const JsonPane = ({ json }: { json: string }) => (
	<pre className="font-mono text-xs leading-relaxed">
		<code>
			{json.split(TOKENS).map((part, index) =>
				index % 2 === 1 ? (
					<span
						key={index}
						className={classOf(part)}
					>
						{part}
					</span>
				) : (
					part
				)
			)}
		</code>
	</pre>
);
