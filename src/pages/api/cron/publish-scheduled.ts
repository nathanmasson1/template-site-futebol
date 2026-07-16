import type { APIRoute } from 'astro';
import fs from 'node:fs/promises';
import path from 'node:path';
import { readFileFromRepo, writeFileToRepo } from '../../../plugins/_server';

export const prerender = false;

type RepoOptions = {
    token: string;
    owner: string;
    repo: string;
};

function getRepoOptions(): RepoOptions {
    return {
        token: process.env.GITHUB_TOKEN || import.meta.env.GITHUB_TOKEN || '',
        owner: process.env.GITHUB_OWNER || import.meta.env.GITHUB_OWNER || '',
        repo: process.env.GITHUB_REPO || import.meta.env.GITHUB_REPO || '',
    };
}

function hasRepoOptions(options: RepoOptions) {
    return Boolean(options.token && options.owner && options.repo);
}

async function listPostPaths(options: RepoOptions) {
    if (!hasRepoOptions(options)) {
        const blogDir = path.resolve(process.cwd(), 'src/content/blog');
        const files = await fs.readdir(blogDir);
        return files
            .filter((name) => name.endsWith('.md'))
            .map((name) => `src/content/blog/${name}`);
    }

    const apiUrl = `https://api.github.com/repos/${options.owner}/${options.repo}/contents/src/content/blog`;
    const res = await fetch(apiUrl, {
        headers: {
            Authorization: `Bearer ${options.token}`,
            Accept: 'application/vnd.github+json',
        },
    });

    if (!res.ok) {
        const payload = await res.json().catch(() => ({}));
        throw new Error(`Erro ao listar posts: ${payload.message || res.statusText}`);
    }

    const data = await res.json();
    if (!Array.isArray(data)) return [];

    return data
        .filter((item) => item.type === 'file' && item.name.endsWith('.md'))
        .map((item) => item.path as string);
}

function extractFrontmatterValue(frontmatter: string, key: string) {
    const match = frontmatter.match(new RegExp(`^${key}:\\s*(?:"([^"]*)"|'([^']*)'|([^\\n\\r]+))`, 'm'));
    return match ? (match[1] || match[2] || match[3] || '').trim() : '';
}

function shouldPublish(frontmatter: string, now: Date) {
    const draft = extractFrontmatterValue(frontmatter, 'draft').toLowerCase() === 'true';
    const scheduledAtRaw = extractFrontmatterValue(frontmatter, 'scheduledAt');
    if (!draft || !scheduledAtRaw) return false;

    const scheduledAt = new Date(scheduledAtRaw);
    return !isNaN(scheduledAt.getTime()) && scheduledAt <= now;
}

function markAsPublished(markdown: string) {
    const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
    if (!match) return markdown;

    let frontmatter = match[1];
    if (/^draft:\s*/m.test(frontmatter)) {
        frontmatter = frontmatter.replace(/^draft:\s*.*/m, 'draft: false');
    } else {
        frontmatter = `${frontmatter}\ndraft: false`;
    }

    return `---\n${frontmatter}\n---\n${match[2]}`;
}

export const GET: APIRoute = async ({ request }) => {
    const json = (data: any, status = 200) =>
        new Response(JSON.stringify(data), {
            status,
            headers: { 'Content-Type': 'application/json' },
        });

    const cronSecret = process.env.CRON_SECRET || import.meta.env.CRON_SECRET;
    const authHeader = request.headers.get('authorization') || '';
    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
        return json({ success: false, message: 'Não autorizado.' }, 401);
    }

    try {
        const options = getRepoOptions();
        const now = new Date();
        const postPaths = await listPostPaths(options);
        const published: string[] = [];
        const skipped: string[] = [];

        for (const postPath of postPaths) {
            const markdown = await readFileFromRepo(postPath, options);
            if (!markdown) {
                skipped.push(postPath);
                continue;
            }

            const match = markdown.match(/^---\r?\n([\s\S]*?)\r?\n---/);
            if (!match || !shouldPublish(match[1], now)) {
                skipped.push(postPath);
                continue;
            }

            const updated = markAsPublished(markdown);
            const ok = await writeFileToRepo(postPath, updated, {
                ...options,
                message: `Cron: publicando post agendado ${path.basename(postPath)}`,
            });

            if (!ok) throw new Error(`Erro ao publicar ${postPath}`);
            published.push(postPath);
        }

        return json({
            success: true,
            checked: postPaths.length,
            published: published.length,
            publishedPaths: published,
            skipped: skipped.length,
            now: now.toISOString(),
        });
    } catch (err: any) {
        return json({ success: false, message: err.message }, 500);
    }
};
