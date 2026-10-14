/**
 * Compare a browser Origin to the public request host. Next.js may expose an
 * internal URL to a route handler behind a proxy, so request.url is not always
 * the origin the browser used. Forwarded values are supplied by the hosting
 * proxy; direct local requests fall back to Host and the request protocol.
 */
export function isSameOriginRequest(request: Request) {
  const origin = request.headers.get("origin");
  if (!origin || request.headers.get("sec-fetch-site") === "cross-site") return false;

  const forwardedHost = request.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const host = forwardedHost || request.headers.get("host")?.trim() || new URL(request.url).host;
  if (!host) return false;

  const forwardedProtocol = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const requestProtocol = new URL(request.url).protocol.slice(0, -1);
  const protocol = forwardedProtocol || requestProtocol;
  if (protocol !== "http" && protocol !== "https") return false;

  try {
    const parsedOrigin = new URL(origin);
    const expectedOrigin = new URL(`${protocol}://${host}`).origin;
    return parsedOrigin.origin === expectedOrigin && origin === parsedOrigin.origin;
  } catch {
    return false;
  }
}
