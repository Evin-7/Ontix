import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { normalizeFoundryDate, readBoundedFoundryPages } from "./workspace";

describe("Foundry workspace reads", () => {
  it("normalizes timestamp strings and generated timestamp structs", () => {
    expect(normalizeFoundryDate("2026-10-14T10:00:00Z")).toBe("2026-10-14T10:00:00.000Z");
    expect(normalizeFoundryDate({ timestamp: "2026-10-14T10:00:00Z", offset: 0 })).toBe("2026-10-14T10:00:00.000Z");
    expect(normalizeFoundryDate("not-a-date")).toBeNull();
    expect(normalizeFoundryDate(null)).toBeNull();
  });

  it("uses a stable snapshot and stops after five bounded pages", async () => {
    const fetchPage = vi.fn(async ({ $nextPageToken }: { $nextPageToken?: string }) => {
      const page = Number($nextPageToken ?? "0");
      return {
        data: [page],
        nextPageToken: String(page + 1),
        totalCount: "7",
      };
    });

    const result = await readBoundedFoundryPages(fetchPage);

    expect(fetchPage).toHaveBeenCalledTimes(5);
    expect(fetchPage).toHaveBeenNthCalledWith(1, { $pageSize: 100, $snapshot: true });
    expect(fetchPage).toHaveBeenNthCalledWith(2, { $pageSize: 100, $snapshot: true, $nextPageToken: "1" });
    expect(result).toEqual({ data: [0, 1, 2, 3, 4], totalCount: 7, hasMore: true });
  });
});
