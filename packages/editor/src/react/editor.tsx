import { EditorContent, EditorContext } from '@tiptap/react';
import { useMemo, type ReactNode } from 'react';

import {
	useBlockleafEditor,
	type UseBlockleafEditorOptions
} from './use-blockleaf-editor.js';
import { EDITOR_CLASS_NAME } from '../core/index.js';

export type BlockleafEditorProps = UseBlockleafEditorOptions & {
	className?: string;
	/** Rendered before the editor is ready, so layout does not jump. */
	fallback?: ReactNode;
	/**
	 * Rendered after the document, inside the editor's box. Tiptap's
	 * `useCurrentEditor()` reaches the editor from here, so a word count or
	 * an outline needs no prop.
	 */
	children?: ReactNode;
};

export const BlockleafEditor = ({
	className,
	fallback = null,
	children,
	...options
}: BlockleafEditorProps) => {
	const editor = useBlockleafEditor(options);
	const context = useMemo(() => ({ editor }), [editor]);

	if (!editor) return <>{fallback}</>;

	return (
		<div
			className={
				className
					? `${EDITOR_CLASS_NAME} ${className}`
					: EDITOR_CLASS_NAME
			}
		>
			<EditorContent editor={editor} />
			<EditorContext.Provider value={context}>
				{children}
			</EditorContext.Provider>
		</div>
	);
};
