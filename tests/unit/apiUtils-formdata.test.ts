import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApiCall } from "../../src/app/utils/apiUtils";

function ensureLocalStorageToken() {
  const g = globalThis as unknown as { localStorage?: Storage };
  if (!g.localStorage) {
    const store: Record<string, string> = {};
    g.localStorage = {
      getItem: (k: string) => (k in store ? store[k] : null),
      setItem: (k: string, v: string) => {
        store[k] = v;
      },
      removeItem: (k: string) => {
        delete store[k];
      },
      clear: () => {
        Object.keys(store).forEach((k) => delete store[k]);
      },
      key: () => null,
      length: 0,
    } as Storage;
  }
  g.localStorage.setItem("token", "unit-test-token");
}

describe("createApiCall / executeRequest", () => {
  const originalFetch = globalThis.fetch;

  beforeEach(() => {
    vi.restoreAllMocks();
    ensureLocalStorageToken();
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it("does not set Content-Type application/json when body is FormData", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: {
        get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
      },
      json: () => Promise.resolve({ ok: true }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const logout = vi.fn();
    const api = createApiCall(logout);
    const fd = new FormData();
    fd.append("file", new Blob(["a,b"], { type: "text/csv" }), "t.csv");

    const result = await api("/api/menu/pricelists/1/upload/validate", {
      method: "POST",
      body: fd,
    });

    expect(result.status).toBe(200);
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBeUndefined();
  });

  it("sets Content-Type application/json for JSON bodies", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      status: 200,
      headers: {
        get: (name: string) => (name.toLowerCase() === "content-type" ? "application/json" : null),
      },
      json: () => Promise.resolve({ ok: true }),
    });
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    const api = createApiCall(vi.fn());
    await api("/api/foo", { method: "POST", body: JSON.stringify({ a: 1 }) });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = init.headers as Record<string, string>;
    expect(headers["Content-Type"]).toBe("application/json");
  });
});
