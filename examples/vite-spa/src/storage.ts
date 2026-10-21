import { isBlockleafDocument, type BlockleafDocument } from '@blockleaf/editor';

const KEY = 'blockleaf-example-document';

/**
 * Reads the stored document back.
 *
 * Guarded with `isBlockleafDocument` rather than trusted, because what comes
 * out of storage is the same kind of thing that comes out of a database: a
 * shape you hope is right. The editor's own guard is exported for exactly
 * this, and a document written by an older version of your app is the normal
 * case rather than the strange one.
 */
export const load = (): BlockleafDocument | null => {
	try {
		const raw = window.localStorage.getItem(KEY);
		if (!raw) return null;

		const parsed: unknown = JSON.parse(raw);
		return isBlockleafDocument(parsed) ? parsed : null;
	} catch {
		// Private browsing, cleared storage, or something that is not JSON.
		return null;
	}
};

export const save = (doc: BlockleafDocument): void => {
	try {
		window.localStorage.setItem(KEY, JSON.stringify(doc));
	} catch {
		// Quota, or storage the browser will not give us. A real app would
		// tell someone; an example should not pretend it cannot happen.
	}
};
