/**
 * HTML escaping utility
 */
const HTML_ESCAPE_MAP = {
    '&': '&',
    '<': '<',
    '>': '>',
    '"': '"',
    "'": "'"
};
export function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, m => HTML_ESCAPE_MAP[m]);
}
export function escapeHtmlAttr(s) {
    return String(s).replace(/[&<>"']/g, m => HTML_ESCAPE_MAP[m]);
}
//# sourceMappingURL=escape.js.map