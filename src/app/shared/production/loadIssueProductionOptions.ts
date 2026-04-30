import type { ApiResponse } from "../../utils/apiUtils";
import type { ApiErrorResponse } from "../../utils/errorUtils";

export type IssueProductionItemOption = {
  id: number;
  name: string;
  code: string;
  category: string;
  isStock: boolean;
  isGroup?: boolean;
  available: number;
};

type ApiCaller = <T = unknown>(
  url: string,
  options?: RequestInit,
) => Promise<ApiResponse<T>>;

const CHUNK = 80;

function chunkIds(ids: number[]): number[][] {
  const out: number[][] = [];
  for (let i = 0; i < ids.length; i += CHUNK) {
    out.push(ids.slice(i, i + CHUNK));
  }
  return out;
}

/**
 * Sellable leaf items (non-stock, non-group per API) with available inventory for production issue UIs.
 */
export async function loadIssueProductionItemOptions(
  apiCall: ApiCaller,
): Promise<{
  options: IssueProductionItemOption[];
  error: string | null;
  errorDetails: ApiErrorResponse | null;
}> {
  const sellableResult = await apiCall<{ items?: Array<{
    id: number;
    name: string;
    code: string;
    category?: string;
    isStock?: boolean;
    isGroup?: boolean;
  }> }>("/api/items/sellable?limit=2000");

  if (sellableResult.status < 200 || sellableResult.status >= 300) {
    return {
      options: [],
      error: sellableResult.error || "Failed to load items",
      errorDetails: sellableResult.errorDetails ?? null,
    };
  }

  const raw = sellableResult.data?.items || [];
  const items = raw.filter((row) => row.isGroup !== true);

  const ids = items.map((i) => i.id);
  const availableById: Record<number, number> = {};

  for (const part of chunkIds(ids)) {
    if (part.length === 0) continue;
    const url = `/api/inventory/available?itemIds=${part.join(",")}`;
    const invResult = await apiCall<{ available?: Record<string, number> }>(url);
    if (invResult.status === 200 && invResult.data?.available) {
      for (const [k, v] of Object.entries(invResult.data.available)) {
        availableById[Number(k)] = typeof v === "number" ? v : 0;
      }
    }
  }

  const options: IssueProductionItemOption[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    code: item.code || "",
    category: typeof item.category === "string" ? item.category : "N/A",
    isStock: Boolean(item.isStock),
    isGroup: item.isGroup,
    available: availableById[item.id] ?? 0,
  }));

  options.sort((a, b) => a.name.localeCompare(b.name));

  return { options, error: null, errorDetails: null };
}
