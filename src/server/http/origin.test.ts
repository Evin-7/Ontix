import { describe, expect, it } from "vitest";
import { isSameOriginRequest } from "./origin";

describe("isSameOriginRequest", () => {
  it("accepts the public host when Next exposes an internal request URL", () => {
    const request = new Request("http://localhost:3000/api/action", {
      headers: { origin: "http://127.0.0.1:3000", host: "127.0.0.1:3000" },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("uses the forwarded public host behind a production proxy", () => {
    const request = new Request("http://10.0.0.1/api/action", {
      headers: {
        origin: "https://ontixx.vercel.app",
        host: "ontixx.vercel.app",
        "x-forwarded-host": "ontixx.vercel.app",
        "x-forwarded-proto": "https",
      },
    });
    expect(isSameOriginRequest(request)).toBe(true);
  });

  it("rejects cross-site, malformed, and missing origins", () => {
    expect(isSameOriginRequest(new Request("https://ontixx.vercel.app/action", {
      headers: { origin: "https://attacker.example", host: "ontixx.vercel.app" },
    }))).toBe(false);
    expect(isSameOriginRequest(new Request("https://ontixx.vercel.app/action", {
      headers: { origin: "https://ontixx.vercel.app", host: "ontixx.vercel.app", "sec-fetch-site": "cross-site" },
    }))).toBe(false);
    expect(isSameOriginRequest(new Request("https://ontixx.vercel.app/action", {
      headers: { host: "ontixx.vercel.app" },
    }))).toBe(false);
  });
});
