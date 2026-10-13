# Uploads

`@blockleaf/editor` never talks to a storage provider. You implement one
interface; the editor drives it.

> **Status.** MC-01 defines the contract below and validates it. The editor
> does not call an adapter yet — drop, paste and picker entry points are MC-02,
> progress and abort are MC-03. The interface is stable; wire your adapter now
> and it will be used as soon as those land.

## Why you own storage

Baking in S3, or Uploadthing, or anything else, makes the package useless to
everyone storing files somewhere else — and every host already has an upload
endpoint. Shipping a provider also means shipping its SDK, which every consumer
pays for whether they use it or not.

So there is one interface, two reference implementations in this document, and
no upload dependency in the package.

## The interface

```ts
import type { UploadAdapter } from '@blockleaf/editor';

interface UploadResult {
	id: string; // stable, passed back to remove()
	src: string; // the URL stored in the document
	width?: number; // intrinsic pixels, if you know them
	height?: number;
}

interface UploadContext {
	signal: AbortSignal;
	onProgress?: (fraction: number) => void;
}

interface UploadAdapter {
	upload(file: File, context: UploadContext): Promise<UploadResult>;
	remove?(id: string): Promise<void>;
}
```

`PROJECT_PLAN.md` §4 sketches `upload(file, signal)`. The second argument is an
object instead, because progress needs somewhere to live and adding a third
positional argument later would be a breaking change.

### `width` and `height` are worth returning

Without them the editor cannot reserve space before the image loads, and the
document reflows as each one arrives. If your endpoint knows the dimensions,
return them.

### `remove` is optional

Plenty of hosts would rather sweep orphaned files in a cron job than trust an
editor to tell them what to delete. Omit it and nothing calls it.

## Progress

`fetch` cannot report upload progress — there is no event for it. If you want a
real progress bar rather than a spinner, use `XMLHttpRequest`:

```ts
const adapter: UploadAdapter = {
	upload(file, { signal, onProgress }) {
		return new Promise((resolve, reject) => {
			const body = new FormData();
			body.append('file', file);

			const request = new XMLHttpRequest();
			request.open('POST', '/api/upload');
			request.responseType = 'json';

			request.upload.addEventListener('progress', (event) => {
				if (event.lengthComputable) {
					onProgress?.(event.loaded / event.total);
				}
			});

			request.addEventListener('load', () => {
				if (request.status >= 200 && request.status < 300) {
					resolve(request.response as UploadResult);
				} else {
					reject(new Error(`Upload failed: ${request.status}`));
				}
			});

			request.addEventListener('error', () => {
				reject(new Error('Upload failed'));
			});

			signal.addEventListener('abort', () => {
				request.abort();
				reject(new DOMException('Aborted', 'AbortError'));
			});

			request.send(body);
		});
	}
};
```

Calling `onProgress` is optional in both directions. An adapter that never
calls it gets an indeterminate state, which is the right answer for an upload
whose size you cannot measure.

## Cancelling versus failing

These are different outcomes and the editor treats them differently.

- **Reject with an `AbortError`** — the upload was cancelled. The placeholder
  disappears, silently. `fetch` throws this for you when the signal fires.
- **Reject with anything else** — the upload failed. The placeholder stays and
  offers a retry.

The check is on `error.name === 'AbortError'`, so you can throw your own error
with that name if you are not using `fetch`.

The signal fires when the user cancels, and when the editor unmounts with an
upload still in flight. Pass it through; an adapter that ignores it leaks a
request per abandoned upload.

## Validation

What your adapter resolves with is checked before any of it reaches the
document, by `isUploadResult`. It is exported, so you can use it in your own
tests:

```ts
import { isUploadResult } from '@blockleaf/editor';

expect(isUploadResult(await adapter.upload(file, context))).toBe(true);
```

The mistake it exists to catch is an endpoint answering with `{ url }` instead
of `{ src }` — without the guard that stores an image node with no source, in
your database, and you find out later.

The check is structural: extra properties pass, so returning your own richer
object is fine.

`src` itself is sanitised by the image node rather than here. An `<img>` that
arrives through a paste never passes through an adapter, so the gate that
catches every path has to live on the node.

## Reference: presigned upload

Two round trips, no file bytes through your server.

```ts
const adapter: UploadAdapter = {
	async upload(file, { signal }) {
		const presign = await fetch('/api/uploads/presign', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ name: file.name, type: file.type }),
			signal
		});
		if (!presign.ok) throw new Error('Could not presign upload');

		const { uploadUrl, id, src } = (await presign.json()) as {
			uploadUrl: string;
			id: string;
			src: string;
		};

		const put = await fetch(uploadUrl, {
			method: 'PUT',
			body: file,
			headers: { 'Content-Type': file.type },
			signal
		});
		if (!put.ok) throw new Error('Upload failed');

		return { id, src };
	},

	async remove(id) {
		await fetch(`/api/uploads/${id}`, { method: 'DELETE' });
	}
};
```

Both `fetch` calls take the signal, so cancelling during either one aborts
cleanly. Neither reports progress — see above.

## Validate on the server too

An adapter runs in the browser, which means it runs on the user's machine and
nothing it returns can be trusted. Check the file type and size in your
endpoint, not only in the adapter, and validate the stored document at the
mutation boundary with [`@blockleaf/editor/validate`](./schema.md).

## The image block

An uploaded image becomes an `image` node:

```json
{
	"type": "image",
	"attrs": {
		"id": "img-8f3a",
		"src": "https://cdn.test/photo.png",
		"alt": "A cat on a wall",
		"width": 1200,
		"align": "center"
	}
}
```

`id` is assigned by the editor, not by your adapter — it is the block id every
other node carries. The `id` your adapter returns is the storage identifier,
and it is what `remove` receives.

### `src` is sanitised by the schema

Allowed:

- `https:`
- site-relative and relative paths (`/uploads/a.png`, `img/a.png`)
- base64 data URLs for raster formats — `png`, `jpeg`, `gif`, `webp`, `avif`

Refused:

- `javascript:`, and anything else carrying an unexpected scheme
- `http:`, matching the link rule, and blocked as mixed content anyway
- protocol-relative URLs (`//cdn.test/a.png`), which inherit the page scheme
- `blob:`, which points into one browser session and is dead on reload
- `data:image/svg+xml` — an SVG is a document, not a bitmap, and this one
  would be attacker-authored markup stored in your database

An `<img>` that arrives through a paste with an unsafe `src` is **dropped**,
not stored with a null source. `setImage` and `updateImage` refuse the same
sources, so host code calling the commands directly is held to the rule too.

### Alt text

`alt` has three states and they are not the same thing:

| Value           | Means                                                 |
| --------------- | ----------------------------------------------------- |
| `null`          | Nobody has said. A screen reader reads the file name. |
| `""`            | Decorative. A screen reader skips it.                 |
| `"A cat on..."` | Described.                                            |

The editor's alt field writes the second when submitted empty, so marking an
image decorative is something a user can actually do.
