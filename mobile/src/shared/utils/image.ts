/**
 * Generate optimized ImageKit URLs by appending auto format, auto quality,
 * and optional bounding dimensions.
 */
export function optimizeImageKitUrl(url: string | null | undefined, width?: number, height?: number): string {
  if (!url || typeof url !== 'string') return '';
  if (!url.includes('imagekit.io')) return url;

  // Check if transformations already exist in the URL
  const separator = url.includes('?') ? '&' : '?';
  let tr = 'tr=f-auto,q-auto'; // auto-format, auto-quality by default

  if (width) tr += `,w-${width}`;
  if (height) tr += `,h-${height}`;

  return `${url}${separator}${tr}`;
}
