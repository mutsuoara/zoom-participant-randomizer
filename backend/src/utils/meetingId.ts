// Convert a base64 meeting UUID to a URL-safe base64url string.
// Zoom UUIDs contain '/', '+', '=' which break URL path segments
// (nginx decodes %2F before Express sees it).
export function toUrlSafeId(uuid: string): string {
  return uuid.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
}
