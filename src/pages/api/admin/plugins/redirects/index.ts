/**
 * API Route: /api/admin/plugins/redirects
 *
 * GET  — lê src/data/redirects.json
 * PUT  — escreve src/data/redirects.json + sincroniza vercel.json
 */
import type { APIRoute } from 'astro';
import { readDataFile, writeFileToRepo, readFileFromRepo } from '../../../../../plugins/_server';
import { normalizeRedirectRules, type RedirectRule } from '../../../../../lib/redirectRules';

export const prerender = false;

const REDIRECTS_PATH = 'src/data/redirects.json';
const VERCEL_JSON_PATH = 'vercel.json';

/** Sincroniza redirects ativos pro vercel.json (funciona em static mode) */
async function syncVercelJson(redirects: RedirectRule[]) {
    let vercelConfig: any = {};
    const existing = await readFileFromRepo(VERCEL_JSON_PATH);
    if (existing) {
        vercelConfig = JSON.parse(existing);
    }

    const vercelRedirects = redirects
        .filter(r => r.enabled)
        .map(r => ({
            source: r.from,
            destination: r.to,
            permanent: r.type === 301,
        }));

    vercelConfig.redirects = vercelRedirects;

    const saved = await writeFileToRepo(VERCEL_JSON_PATH, JSON.stringify(vercelConfig, null, 2), {
        message: 'CMS: Sync redirects to vercel.json',
    });
    if (!saved) throw new Error('Falha ao sincronizar vercel.json.');
}

export const GET: APIRoute = async () => {
    try {
        const redirects = normalizeRedirectRules(readDataFile<any[]>(REDIRECTS_PATH.split('/').pop()!, []));
        return new Response(JSON.stringify(redirects), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 500 });
    }
};

export const PUT: APIRoute = async ({ request }) => {
    try {
        const redirects = normalizeRedirectRules(await request.json());
        const ok = await writeFileToRepo(REDIRECTS_PATH, JSON.stringify(redirects, null, 2), {
            message: 'CMS: Update redirects',
        });
        if (!ok) return new Response(JSON.stringify({ error: 'Falha ao salvar' }), { status: 500 });

        // Sync to vercel.json for static mode compatibility
        await syncVercelJson(redirects);

        return new Response(JSON.stringify({ success: true, redirects }), {
            status: 200,
            headers: { 'Content-Type': 'application/json' },
        });
    } catch (err: any) {
        return new Response(JSON.stringify({ error: err.message }), { status: 400 });
    }
};
