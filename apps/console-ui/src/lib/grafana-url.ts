export function withKiosk(url: string): string {
  const hashIndex = url.indexOf('#');
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : '';
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url;

  const queryIndex = withoutHash.indexOf('?');
  const hasQuery = queryIndex >= 0;
  const query = hasQuery ? withoutHash.slice(queryIndex + 1) : '';

  const params = new URLSearchParams(query);
  if (params.has('kiosk')) {
    return url;
  }

  const separator = hasQuery ? '&' : '?';
  return `${withoutHash}${separator}kiosk${hash}`;
}
