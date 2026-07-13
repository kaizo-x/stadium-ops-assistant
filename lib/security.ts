/**
 * Simple client-side sanitization function to prevent HTML/Script injection.
 * Strips HTML tags and escapes special characters.
 */
export function sanitizeInput(text: string): string {
  if (!text) return "";
  // Strip HTML tags using a regular expression
  const clean = text.replace(/<[^>]*>/g, "");
  // Escape HTML entities to prevent rendering issues or injection in raw text contexts
  return clean
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;");
}
