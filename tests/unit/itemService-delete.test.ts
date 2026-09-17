import { describe, it, expect, vi, beforeEach } from "vitest";
import { ItemService } from "src/backend/service/ItemService";
import { ItemStatus } from "src/backend/entities/Item";
import { cache } from "src/backend/utils/cache";

const mockUpdate = vi.fn();
const mockFindOne = vi.fn();

const mockRepo = {
  findOne: mockFindOne,
  update: mockUpdate,
};

const mockDatasource = {
  getRepository: vi.fn(() => mockRepo),
} as any;

describe("ItemService.deleteItem", () => {
  let service: ItemService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new ItemService(mockDatasource);
  });

  it("soft-deletes an item by setting status to DELETED", async () => {
    mockFindOne.mockResolvedValue({ id: 1, name: "Egg", status: ItemStatus.ACTIVE });
    mockUpdate.mockResolvedValue({ affected: 1 });

    await service.deleteItem(1);

    expect(mockUpdate).toHaveBeenCalledWith(1, { status: ItemStatus.DELETED });
  });

  it("throws 404 when item is not found", async () => {
    mockFindOne.mockResolvedValue(null);

    await expect(service.deleteItem(999)).rejects.toMatchObject({
      message: "Item not found",
      statusCode: 404,
    });

    expect(mockUpdate).not.toHaveBeenCalled();
  });

  it("invalidates item caches after deletion", async () => {
    mockFindOne.mockResolvedValue({ id: 2, name: "Chapati", status: ItemStatus.ACTIVE });
    mockUpdate.mockResolvedValue({ affected: 1 });

    const invalidateManySpy = vi.spyOn(cache, "invalidateMany");
    await service.deleteItem(2);

    expect(invalidateManySpy).toHaveBeenCalledWith(
      expect.arrayContaining(["items_", "items_all_with_details"])
    );
  });
});
