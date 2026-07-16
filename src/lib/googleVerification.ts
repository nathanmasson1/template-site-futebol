export function extractGoogleSiteVerification(value: unknown) {
  if (typeof value !== 'string') return '';

  const raw = value.trim();
  if (!raw) return '';

  if (/^<meta\b/i.test(raw)) {
    const isGoogleVerificationTag = /\bname\s*=\s*(?:["']google-site-verification["']|google-site-verification)(?:\s|\/>|>)/i.test(raw);
    if (!isGoogleVerificationTag) return '';

    const content = raw.match(/\bcontent\s*=\s*(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i);
    return (content?.[1] || content?.[2] || content?.[3] || '').trim();
  }

  return /[<>\s"']/.test(raw) ? '' : raw;
}
