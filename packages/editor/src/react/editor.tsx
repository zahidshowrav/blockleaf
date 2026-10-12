import { EditorContent } from '@tiptap/react';
import type { ReactNode } from 'react';

import {
	useBlockleafEditor,
	type UseBlockleafEditorOptions
} from './use-blockleaf-editor.js';
import { EDITOR_CLASS_NAME } from '../core/index.js';

export type BlockleafEditorProps = UseBlockleafEditorOptions & {
	className?: string;
	/** Rendered before the editor is ready, so layout does not jump. */
	fallback?: ReactNode;
	children?: ReactNode;
};

export const BlockleafEditor = ({
	className,
	fallback = null,
	children,
	...options
}: BlockleafEditorProps) => {
	const editor = useBlockleafEditor(options);

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
			{children}
		</div>
	);
};
