const ABSOLUTE_HTTP_URL = /^https?:\/\//i;
const NON_HTTP_SCHEME = /^[a-z][a-z\d+.-]*:/i;
const FILE_PATH = /\/[^/]+\.[^/]+$/;

export function isPagePath(pathname: string) {
  return pathname !== '/' && !pathname.endsWith('/') && !FILE_PATH.test(pathname);
}

export function withTrailingSlash(value: string) {
  if (!value || value.startsWith('#') || value.startsWith('?') || value.startsWith('//')) {
    return value;
  }

  if (NON_HTTP_SCHEME.test(value) && !ABSOLUTE_HTTP_URL.test(value)) {
    return value;
  }

  try {
    const isAbsolute = ABSOLUTE_HTTP_URL.test(value);
    const url = new URL(value, 'https://url-normalizer.local');

    if (isPagePath(url.pathname)) {
      url.pathname = `${url.pathname}/`;
    }

    if (isAbsolute) {
      return url.toString();
    }

    return `${url.pathname}${url.search}${url.hash}`;
  } catch {
    return value;
  }
}

export function withInternalTrailingSlash(value: string) {
  return value.startsWith('/') && !value.startsWith('//')
    ? withTrailingSlash(value)
    : value;
}
