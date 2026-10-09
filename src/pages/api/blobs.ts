import type { APIRoute } from 'astro';
import { getStore } from '@netlify/blobs';
import { uploadDisabled } from '../../utils';
import { requireSession } from '../../lib/auth';

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
    const denied = await requireSession(cookies);
    if (denied) return denied;

    if (uploadDisabled) throw new Error('Sorry, uploads are disabled');

    const parameters = await request.json();
    const blobStore = getStore('shapes');
    const key = parameters.name;
    await blobStore.setJSON(key, parameters);
    return new Response(
        JSON.stringify({
            message: `Stored shape "${key}"`
        })
    );
};

export const GET: APIRoute = async ({ request, cookies }) => {
    const denied = await requireSession(cookies);
    if (denied) return denied;

    try {
        const blobStore = getStore({ name: 'shapes', consistency: 'strong' });
        const data = await blobStore.list();
        const keys = data.blobs.map(({ key }) => key);
        return new Response(
            JSON.stringify({
                keys
            })
        );
    } catch (e) {
        console.error(e);
        return new Response(
            JSON.stringify({
                keys: [],
                error: 'Failed listing blobs'
            })
        );
    }
};
