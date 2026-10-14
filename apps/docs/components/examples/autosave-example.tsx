'use client';

import { useCallback, useRef, useState } from 'react';

import { BlockleafEditor, type BlockleafDocument } from '@blockleaf/editor';

import { ExampleFrame } from '@/components/examples/example-frame';
import { sampleDocument } from '@/components/examples/sample-document';

type SaveState = 'saved' | 'dirty' | 'saving';

const labels: Record<SaveState, string> = {
	saved: 'Saved',
	dirty: 'Unsaved changes',
	saving: 'Saving…'
};

const count = (n: number, noun: string) => `${n} ${noun}${n === 1 ? '' : 's'}`;

/**
 * The two callbacks doing their separate jobs: `onChangeImmediate` flips the
 * indicator on the keystroke, `onChange` is the debounced one that writes.
 */
export const AutosaveExample = () => {
	const [state, setState] = useState<SaveState>('saved');
	const [writes, setWrites] = useState(0);
	const [keystrokes, setKeystrokes] = useState(0);
	const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

	const onChangeImmediate = useCallback(() => {
		setKeystrokes((n) => n + 1);
		setState((current) => (current === 'saving' ? current : 'dirty'));
	}, []);

	const onChange = useCallback((_doc: BlockleafDocument) => {
		setState('saving');
		clearTimeout(timer.current);
		// Stands in for the request you would actually make.
		timer.current = setTimeout(() => {
			setWrites((n) => n + 1);
			setState('saved');
		}, 400);
	}, []);

	return (
		<ExampleFrame
			caption={`${labels[state]} — ${count(keystrokes, 'transaction')}, ${count(writes, 'write')}`}
		>
			<BlockleafEditor
				className="min-h-full px-4 py-3"
				defaultValue={sampleDocument}
				onChange={onChange}
				onChangeImmediate={onChangeImmediate}
			/>
		</ExampleFrame>
	);
};
