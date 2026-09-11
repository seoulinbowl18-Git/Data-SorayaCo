import { API } from "@/src/theme";

/**
 * Resolves an image URL. Relative paths starting with "/" get prefixed with
 * the API host so we always hit the same origin the app is talking to.
 * External URLs (http/https) pass through unchanged.
 */
export function resolveImage(src?: string | null): string {
  if (!src) return "";
  if (src.startsWith("http://") || src.startsWith("https://")) return src;
  if (src.startsWith("/")) return `${API}${src}`;
  return `${API}/${src}`;
}
