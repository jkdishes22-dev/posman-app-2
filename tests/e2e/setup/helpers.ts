import { testApiHandler } from "next-test-api-route-handler";

// Lazy import to avoid module-load-time issues with env vars
async function getLoginHandler() {
  return (await import("../../../pages/api/auth/login.js")).default;
}

let _adminToken: string | null = null;

/**
 * Log in with the given credentials and return a JWT.
 */
export async function login(username: string, password: string): Promise<string> {
  const handler = await getLoginHandler();
  let token = "";
  await testApiHandler({
    pagesHandler: handler,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      if (res.status !== 200) {
        const body = await res.text();
        throw new Error(`Login failed for '${username}' (${res.status}): ${body}`);
      }
      const data = await res.json();
      token = data.token as string;
    },
  });
  return token;
}

/**
 * Log in as the seeded admin user and return a JWT.
 * Token is cached for the lifetime of the test process.
 */
export async function getAdminToken(): Promise<string> {
  if (_adminToken) return _adminToken;
  _adminToken = await login("admin", "admin123");
  return _adminToken!;
}

/** Returns an Authorization header object for use in fetch calls. */
export function bearer(token: string) {
  return { Authorization: `Bearer ${token}` };
}
