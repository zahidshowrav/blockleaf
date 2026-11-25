import type { Editor } from '@tiptap/core';
import {
	forwardRef,
	useEffect,
	useId,
	useImperativeHandle,
	useRef,
	useState,
	type ComponentType,
	type FormEvent,
	type Ref
} from 'react';

import type { SlashMenuRef, SlashPickerProps } from './types.js';
import { defaultLabels, type ResolvedLabels } from '../../core/labels.js';

export type UrlPickerStrings = {
	/** Accessible name of the field. */
	address: string;
	placeholder: string;
	/** The submit button. */
	insert: string;
	/** Shown when `canInsert` refuses the address. */
	invalid: string;
};

export type UrlPickerConfig = {
	/** Its strings, from the resolved label set. */
	strings: (labels: ResolvedLabels) => UrlPickerStrings;
	/** Whether the address can be inserted, without inserting it. */
	canInsert: (editor: Editor, url: string) => boolean;
	/** Inserts it. The `/query` text is already gone. */
	insert: (editor: Editor, url: string) => void;
};

/**
 * A slash menu picker that asks for an address: a field, a button, and a
 * line saying why an address was refused. Escape goes back to the list.
 *
 * The field takes focus, so the editor's keys stop reaching the menu; the
 * field handles its own. The `/query` text stays in the document until an
 * address is accepted.
 */
export const createUrlPicker = (
	config: UrlPickerConfig
): ComponentType<SlashPickerProps & { ref?: Ref<SlashMenuRef> }> =>
	/* @__PURE__ */ forwardRef<SlashMenuRef, SlashPickerProps>(
		function UrlPicker(
			{ editor, range, onCancel, labels = defaultLabels },
			ref
		) {
			const strings = config.strings(labels);
			const [value, setValue] = useState('');
			const [invalid, setInvalid] = useState(false);
			const input = useRef<HTMLInputElement>(null);
			const errorId = useId();

			const cancel = () => {
				onCancel();
				editor.commands.focus();
			};

			useEffect(() => {
				input.current?.focus();
			}, []);

			useImperativeHandle(ref, () => ({
				onKeyDown: ({ event }) => {
					if (event.key !== 'Escape') return false;
					cancel();
					return true;
				}
			}));

			const submit = (event: FormEvent) => {
				event.preventDefault();
				const url = value.trim();
				if (!url || !config.canInsert(editor, url)) {
					setInvalid(true);
					return;
				}
				editor.chain().focus().deleteRange(range).run();
				config.insert(editor, url);
			};

			return (
				<form
					className="blockleaf-url-picker"
					onSubmit={submit}
					onKeyDown={(event) => {
						if (event.key === 'Escape') {
							event.preventDefault();
							cancel();
						}
					}}
				>
					<input
						ref={input}
						className="blockleaf-url-picker__input"
						type="url"
						inputMode="url"
						value={value}
						placeholder={strings.placeholder}
						aria-label={strings.address}
						aria-invalid={invalid || undefined}
						aria-describedby={invalid ? errorId : undefined}
						onChange={(event) => {
							setValue(event.target.value);
							setInvalid(false);
						}}
					/>
					<button
						type="submit"
						className="blockleaf-url-picker__submit"
					>
						{strings.insert}
					</button>
					{invalid ? (
						<p
							id={errorId}
							className="blockleaf-url-picker__error"
							role="alert"
						>
							{strings.invalid}
						</p>
					) : null}
				</form>
			);
		}
	);
