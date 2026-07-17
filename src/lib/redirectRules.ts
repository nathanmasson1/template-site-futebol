import { withInternalTrailingSlash, withTrailingSlash } from './urls';

export interface RedirectRule {
  id: string;
  from: string;
  to: string;
  type: 301 | 302;
  enabled: boolean;
  note: string;
}

const RESERVED_SOURCE = /^\/(?:admin|api|_astro)(?:\/|$)/i;
const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
const NON_HTTP_SCHEME = /^[a-z][a-z\d+.-]*:/i;

function normalizeSource(value: unknown) {
  const source = typeof value === 'string' ? value.trim() : '';

  if (!source.startsWith('/') || source.startsWith('//')) {
    throw new Error('A origem deve ser um caminho interno iniciado por /.');
  }
  if (source.includes('?') || source.includes('#') || source.includes('\\') || /\s/.test(source)) {
    throw new Error(`Origem inválida: ${source}`);
  }
  if (RESERVED_SOURCE.test(source)) {
    throw new Error('Não é permitido redirecionar rotas de /admin, /api ou /_astro.');
  }

  return withInternalTrailingSlash(source);
}

function normalizeDestination(value: unknown) {
  const destination = typeof value === 'string' ? value.trim() : '';

  if (!destination || destination.startsWith('//')) {
    throw new Error('O destino deve ser um caminho interno ou uma URL http/https.');
  }
  if (destination.startsWith('/')) {
    return withInternalTrailingSlash(destination);
  }
  if (ABSOLUTE_HTTP_URL.test(destination)) {
    return withTrailingSlash(destination);
  }
  if (NON_HTTP_SCHEME.test(destination)) {
    throw new Error('O destino aceita somente URLs http/https.');
  }

  throw new Error('O destino interno deve começar com /.');
}

export function normalizeRedirectRules(input: unknown): RedirectRule[] {
  if (!Array.isArray(input)) {
    throw new Error('A lista de redirecionamentos é inválida.');
  }
  if (input.length > 100) {
    throw new Error('O limite é de 100 redirecionamentos.');
  }

  const seenSources = new Set<string>();

  return input.map((item: any, index) => {
    const from = normalizeSource(item?.from);
    const to = normalizeDestination(item?.to);
    const type = Number(item?.type) === 302 ? 302 : 301;

    if (seenSources.has(from)) {
      throw new Error(`Origem duplicada: ${from}`);
    }
    seenSources.add(from);

    if (to.startsWith('/') && from === to) {
      throw new Error(`O redirecionamento ${from} aponta para ele mesmo.`);
    }

    return {
      id: typeof item?.id === 'string' && item.id.trim() ? item.id.trim() : `r_${Date.now()}_${index}`,
      from,
      to,
      type,
      enabled: item?.enabled !== false,
      note: typeof item?.note === 'string' ? item.note.trim().slice(0, 200) : '',
    };
  });
}
