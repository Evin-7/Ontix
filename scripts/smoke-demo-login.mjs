import { readFile } from "node:fs/promises";
import { homedir } from "node:os";
import { join } from "node:path";

const baseUrl = new URL(process.env.ONTIX_DEMO_SMOKE_URL || "http://127.0.0.1:3000");
if (baseUrl.protocol !== "http:" || baseUrl.hostname !== "127.0.0.1") {
  throw new Error("The demo smoke test accepts only the local 127.0.0.1 HTTP server.");
}
const origin = baseUrl.origin;
const credentialPath = join(homedir(), ".config", "ontix", "demo-credentials.txt");
const credentialText = await readFile(credentialPath, "utf8");
const username = credentialText.match(/^Username: (.+)$/m)?.[1];
const password = credentialText.match(/^Password: (.+)$/m)?.[1];
if (!username || !password) throw new Error("The local demo credentials file is incomplete.");

let cookie = "";
let cookieName = "";
let failures = 0;
function assert(condition, safeMessage) {
  if (!condition) throw new Error(safeMessage);
}

try {
  const landing = await fetch(`${origin}/`);
  const landingHtml = await landing.text();
  assert(landing.status === 200 && landingHtml.includes("Continue with Palantir Foundry") && landingHtml.includes("Explore Demo"), "The sign-in page does not display both sign-in options.");

  const loginPage = await fetch(`${origin}/demo-login`);
  const loginHtml = await loginPage.text();
  assert(loginPage.status === 200 && loginHtml.includes("name=\"username\"") && loginHtml.includes("name=\"password\""), "The demo sign-in form did not render.");

  const login = await fetch(`${origin}/api/demo/sign-in`, {
    method: "POST",
    redirect: "manual",
    headers: { origin, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }),
  });
  assert(login.status === 303 && new URL(login.headers.get("location") || "/", origin).pathname === "/overview", "Demo sign-in did not redirect to the workspace.");
  const setCookies = login.headers.getSetCookie?.() ?? [login.headers.get("set-cookie") ?? ""];
  const sessionCookie = setCookies.find((value) => /^(?:__Host-ontix-demo|ontix-demo)=/.test(value));
  assert(sessionCookie, "Demo sign-in did not set its separate session cookie.");
  const match = sessionCookie.match(/^([^=]+)=([^;]+)/);
  assert(match, "Demo sign-in returned an invalid session cookie.");
  cookieName = match[1];
  cookie = `${cookieName}=${match[2]}`;
  assert(/httponly/i.test(sessionCookie) && /samesite=lax/i.test(sessionCookie), "Demo cookie security attributes were missing.");

  const pages = [
    ["/overview", "Fleet Reliability Program"],
    ["/projects", "Fleet Reliability Program"],
    ["/cases", "Vehicle telemetry variance"],
    ["/customers", "Northstar Logistics"],
    ["/employees", "Jordan Lee"],
    ["/teams", "Reliability Operations"],
    ["/approvals", "APR-6001"],
    ["/settings", "Demo visitor"],
  ];
  for (const [path, expected] of pages) {
    const response = await fetch(`${origin}${path}`, { headers: { cookie } });
    const html = await response.text();
    assert(response.status === 200 && html.includes(expected), `Demo data did not render for ${path}.`);
  }

  const search = await fetch(`${origin}/api/demo/search?q=fleet`, { headers: { cookie } });
  const searchPayload = await search.json();
  assert(search.status === 200 && searchPayload.results.some((result) => result.title === "Fleet Reliability Program"), "Demo search did not return sample data.");

  const foundrySearch = await fetch(`${origin}/api/foundry/search?q=fleet`, { headers: { cookie } });
  assert(foundrySearch.status === 403, "A demo session was not blocked from Foundry search.");

  const workflow = await fetch(`${origin}/api/foundry/workflows`, {
    method: "POST",
    headers: { origin, cookie, "content-type": "application/json" },
    body: JSON.stringify({ action: "resolve-case", caseId: "CASE-5001" }),
  });
  const workflowPayload = await workflow.json();
  assert(workflow.status === 403 && workflowPayload.error === "Editing is unavailable in demo mode.", "A demo session was not blocked from Foundry actions.");

  const logout = await fetch(`${origin}/api/demo/sign-out`, { method: "POST", redirect: "manual", headers: { origin, cookie } });
  assert(logout.status === 303 && new URL(logout.headers.get("location") || "/", origin).pathname === "/", "Demo sign-out did not return to the sign-in page.");
  cookie = "";
  const afterLogout = await fetch(`${origin}/api/demo/search?q=fleet`);
  assert(afterLogout.status === 401, "Demo access remained available after sign-out.");
  console.log("Demo smoke passed: login, all workspace modules, sample search, Foundry read/write denial, and logout.");
} catch (error) {
  failures += 1;
  throw new Error(error instanceof Error ? error.message : "Demo smoke test failed.");
} finally {
  if (cookie) {
    await fetch(`${origin}/api/demo/sign-out`, { method: "POST", redirect: "manual", headers: { origin, cookie } }).catch(() => undefined);
  }
  void failures;
}
