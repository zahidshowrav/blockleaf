import { blogLlms, docsLlms } from '@/lib/source';

export const revalidate = false;

export const GET = async () =>
	new Response(`${await docsLlms.full()}\n\n${await blogLlms.full()}`);
