/**
 * HTML escaping utility
 */

const HTML_ESCAPE_MAP: Record<string, string> = {
  '&': '&',
  '<': '<',
  '>': '>',
  '"': '"',
  "'": "'"
};

export function escapeHtml(s: string): string {
  return String(s).replace(/[&<>"']/g, m => HTML_ESCAPE_MAP[m]);
}

export function escapeHtmlAttr(s: string): string {
  return String(s).replace(/[&<>"']/g, m => HTML_ESCAPE_MAP[m]);
}