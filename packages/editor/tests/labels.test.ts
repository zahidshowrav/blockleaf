import { Editor } from '@tiptap/core';
import { afterEach, describe, expect, it } from 'vitest';

import { createExtensions } from '../src/core/extensions.js';
import {
	createUploadExtension,
	type UploadAdapter
} from '../src/core/index.js';
import { defaultLabels, resolveLabels } from '../src/core/labels.js';
import { createBlockActions } from '../src/ui/drag-handle/actions.js';
import { createSlashCommands } from '../src/ui/slash-menu/registry.js';
import { createTableActions } from '../src/ui/table-controls/actions.js';

const editors: Editor[] = [];
const containers: HTMLElement[] = [];

afterEach(() => {
	while (editors.length) editors.pop()?.destroy();
	while (containers.length) containers.pop()?.remove();
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('resolving a label set (HD-02)', () => {
	it('returns the defaults when given nothing', () => {
		expect(resolveLabels()).toEqual(defaultLabels);
	});

	// A host should be able to translate one word without restating the rest.
	it('keeps the siblings of an overridden key', () => {
		const labels = resolveLabels({
			slashMenu: { groups: { lists: 'Listes' } }
		});

		expect(labels.slashMenu.groups.lists).toBe('Listes');
		expect(labels.slashMenu.groups.headings).toBe('Headings');
		expect(labels.slashMenu.menu).toBe('Slash commands');
		expect(labels.blockMenu.menu).toBe('Block actions');
	});

	it('merges every nested group, not just the first level', () => {
		const labels = resolveLabels({
			blockMenu: { actions: { delete: 'Supprimer' } },
			table: { actions: { 'delete-row': 'Supprimer la ligne' } },
			image: { actions: { 'align-left': 'À gauche' } },
			bubbleMenu: { actions: { bold: 'Gras' } }
		});

		expect(labels.blockMenu.actions.delete).toBe('Supprimer');
		expect(labels.blockMenu.actions.duplicate).toBe('Duplicate');
		expect(labels.table.actions['delete-row']).toBe('Supprimer la ligne');
		expect(labels.table.actions['delete-table']).toBe('Delete table');
		expect(labels.image.actions['align-left']).toBe('À gauche');
		expect(labels.bubbleMenu.actions.bold).toBe('Gras');
		expect(labels.bubbleMenu.toolbar).toBe('Text formatting');
	});

	it('takes functions as readily as strings', () => {
		const labels = resolveLabels({
			upload: { uploading: (name) => `Envoi de ${name}` }
		});

		expect(labels.upload.uploading('a.png')).toBe('Envoi de a.png');
		expect(labels.upload.cancel).toBe('Cancel');
	});
});

describe('registries built from a label set (HD-02)', () => {
	it('names slash commands from the shared block types', () => {
		const labels = resolveLabels({
			blockTypes: { 'heading-1': 'Titre 1' },
			slashMenu: { descriptions: { 'heading-1': 'Grand titre.' } }
		});
		const command = createSlashCommands(
			labels.slashMenu,
			labels.blockTypes
		).find((entry) => entry.id === 'heading-1');

		expect(command?.title).toBe('Titre 1');
		expect(command?.description).toBe('Grand titre.');
	});

	// One translation, two surfaces: the slash menu and "Turn into" name the
	// same blocks, so they read from the same map.
	it('names "Turn into" from that same map', () => {
		const labels = resolveLabels({
			blockTypes: { 'heading-1': 'Titre 1' }
		});
		const action = createBlockActions(
			labels.blockMenu,
			labels.blockTypes
		).find((entry) => entry.id === 'turn-heading-1');

		expect(action?.title).toBe('Titre 1');
	});

	it('groups block actions under the translated headings', () => {
		const labels = resolveLabels({
			blockMenu: { groups: { turnInto: 'Transformer en' } }
		});
		const actions = createBlockActions(labels.blockMenu, labels.blockTypes);

		expect(actions.find((a) => a.id === 'turn-paragraph')?.group).toBe(
			'Transformer en'
		);
		expect(actions.find((a) => a.id === 'delete')?.group).toBe('Actions');
	});

	it('names table actions from the label set', () => {
		const labels = resolveLabels({
			table: {
				actions: {
					'add-row-before': 'Insérer au-dessus',
					'delete-table': 'Supprimer'
				}
			}
		});
		const actions = createTableActions(labels.table);

		expect(actions.find((a) => a.id === 'add-row-before')?.title).toBe(
			'Insérer au-dessus'
		);
		expect(actions.find((a) => a.id === 'delete-table')?.title).toBe(
			'Supprimer'
		);
		expect(actions.find((a) => a.id === 'delete-row')?.title).toBe(
			'Delete row'
		);
	});
});

describe('the upload placeholder speaks the label set (HD-02)', () => {
	const failing: UploadAdapter = {
		upload: () => Promise.reject(new Error('nope'))
	};

	it('renders the translated error actions', async () => {
		const container = document.createElement('div');
		document.body.append(container);
		containers.push(container);

		const editor = new Editor({
			element: container,
			extensions: [
				...createExtensions('standard'),
				createUploadExtension({
					adapter: failing,
					labels: resolveLabels({
						upload: {
							retry: 'Réessayer',
							dismiss: 'Ignorer',
							failed: (name) => `Échec : ${name}`
						}
					})
				})
			],
			content: '<p>Hello</p>'
		});
		editors.push(editor);

		const file = new File(['x'], 'photo.png', { type: 'image/png' });
		editor.commands.uploadFiles([file]);
		await flush();

		const placeholder = container.querySelector('.blockleaf-upload');
		expect(placeholder?.textContent).toContain('Échec : photo.png');
		expect(
			container.querySelector('[data-action="retry"]')?.textContent
		).toBe('Réessayer');
		expect(
			container.querySelector('[data-action="dismiss"]')?.textContent
		).toBe('Ignorer');
	});
});
