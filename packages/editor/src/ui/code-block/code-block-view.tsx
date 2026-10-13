import {
	NodeViewContent,
	NodeViewWrapper,
	type NodeViewProps
} from '@tiptap/react';

const PLAIN = '';

/**
 * A code block with a language picker in its corner.
 *
 * The picker lists exactly what the extension registered — a language the
 * host did not register would highlight as nothing, and offering it would be
 * a promise the grammar set cannot keep.
 */
export const CodeBlockView = ({
	node,
	extension,
	updateAttributes,
	editor
}: NodeViewProps) => {
	const { languageNames } = extension.options as { languageNames?: string[] };
	const languages = languageNames ?? [];
	const current =
		typeof node.attrs.language === 'string' ? node.attrs.language : PLAIN;

	return (
		<NodeViewWrapper className="blockleaf-code-block-wrapper">
			<select
				className="blockleaf-code-block__language"
				aria-label="Code language"
				value={current}
				disabled={!editor.isEditable}
				// The select is chrome around the node, not part of it. Without
				// this ProseMirror treats it as editable content and the caret
				// can land inside the dropdown.
				contentEditable={false}
				onChange={(event) => {
					updateAttributes({
						language:
							event.target.value === PLAIN
								? null
								: event.target.value
					});
				}}
			>
				<option value={PLAIN}>Plain text</option>
				{languages.map((language) => (
					<option
						key={language}
						value={language}
					>
						{language}
					</option>
				))}
			</select>

			<pre>
				<NodeViewContent<'code'> as="code" />
			</pre>
		</NodeViewWrapper>
	);
};
