import { expect } from "vitest";
import { testApiHandler } from "next-test-api-route-handler";
import { bearer } from "../setup/helpers.js";

type AuthCase = {
  method: string;
  handler: any;
  params?: Record<string, string>;
  body?: unknown;
  authPassStatus?: "strict-200" | "strict-201" | "not-401-403";
  forbiddenMode?: "strict" | "auth-gated";
};

function toHeaders(token?: string, hasBody?: boolean): Record<string, string> {
  const headers: Record<string, string> = {};
  if (token) {
    Object.assign(headers, bearer(token));
  }
  if (hasBody) {
    headers["Content-Type"] = "application/json";
  }
  return headers;
}

export async function assert401(authCase: AuthCase) {
  await testApiHandler({
    pagesHandler: authCase.handler,
    params: authCase.params,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: authCase.method,
        headers: toHeaders(undefined, authCase.body !== undefined),
        body: authCase.body ? JSON.stringify(authCase.body) : undefined,
      });
      expect(res.status).toBe(401);
    },
  });
}

export async function assert403(authCase: AuthCase, wrongToken: string) {
  await testApiHandler({
    pagesHandler: authCase.handler,
    params: authCase.params,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: authCase.method,
        headers: toHeaders(wrongToken, authCase.body !== undefined),
        body: authCase.body ? JSON.stringify(authCase.body) : undefined,
      });
      if (authCase.forbiddenMode === "auth-gated") {
        expect(res.status).not.toBe(401);
        return;
      }

      expect(res.status).toBe(403);
    },
  });
}

export async function assertAllowed(authCase: AuthCase, allowedToken: string) {
  await testApiHandler({
    pagesHandler: authCase.handler,
    params: authCase.params,
    test: async ({ fetch }) => {
      const res = await fetch({
        method: authCase.method,
        headers: toHeaders(allowedToken, authCase.body !== undefined),
        body: authCase.body ? JSON.stringify(authCase.body) : undefined,
      });

      if (authCase.authPassStatus === "strict-200") {
        expect([401, 403]).not.toContain(res.status);
        return;
      }

      if (authCase.authPassStatus === "strict-201") {
        expect([401, 403]).not.toContain(res.status);
        return;
      }

      expect([401, 403]).not.toContain(res.status);
    },
  });
}
