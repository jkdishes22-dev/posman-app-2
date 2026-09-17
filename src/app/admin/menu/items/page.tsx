"use client";

import React, { useCallback, useEffect, useRef, useState } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import PageHeaderStrip from "src/app/components/PageHeaderStrip";
import ErrorDisplay from "src/app/components/ErrorDisplay";
import { useApiCall } from "src/app/utils/apiUtils";
import { useTooltips } from "src/app/hooks/useTooltips";
import AssignCategoryModal from "./components/assign-category-modal";
import LinkPricelistModal from "./components/link-pricelist-modal";
import EditItemDetailsModal from "./components/edit-item-details-modal";

const PAGE_SIZE = 10;

interface ItemPricelist {
  id: number;
  name: string;
  price: number;
  pricelistItemId: number;
}

interface Item {
  id: number;
  name: string;
  code: string;
  isGroup: boolean;
  isStock: boolean;
  allowNegativeInventory: boolean;
  category: { id: number; name: string } | null;
  pricelists: ItemPricelist[];
}

export default function ItemsPage() {
  useTooltips();
  const apiCall = useApiCall();

  const [items, setItems] = useState<Item[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  const [assignCategoryItem, setAssignCategoryItem] = useState<Item | null>(null);
  const [assignCategoryError, setAssignCategoryError] = useState<string | null>(null);

  const [linkPricelistItem, setLinkPricelistItem] = useState<Item | null>(null);

  const [editItem, setEditItem] = useState<Item | null>(null);

  const [deleteItem, setDeleteItem] = useState<Item | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const fetchItems = useCallback(async (targetPage: number, searchTerm: string) => {
    const params = new URLSearchParams({
      all: "true",
      page: String(targetPage),
      limit: String(PAGE_SIZE),
    });
    if (searchTerm.trim()) params.set("search", searchTerm.trim());
    const result = await apiCall(`/api/menu/items?${params}`);
    if (result.status >= 200 && result.status < 300) {
      const data = result.data ?? {};
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(typeof data.total === "number" ? data.total : 0);
      setFetchError(null);
    } else {
      setFetchError(result.error || "Failed to fetch items");
    }
  }, [apiCall]);

  useEffect(() => {
    fetchItems(page, debouncedSearch);
  }, [fetchItems, page, debouncedSearch]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setPage(1);
      setDebouncedSearch(value);
    }, 300);
  };

  const handleAssignCategory = async (categoryId: number | null) => {
    if (!assignCategoryItem) return;
    setAssignCategoryError(null);
    const result = await apiCall(`/api/menu/items/${assignCategoryItem.id}/category`, {
      method: "PATCH",
      body: JSON.stringify({ categoryId }),
    });
    if (result.status >= 200 && result.status < 300) {
      setAssignCategoryItem(null);
      fetchItems(page, debouncedSearch);
    } else {
      setAssignCategoryError(result.error || "Failed to update category");
    }
  };

  const handleUnlinkFromPricelist = async (item: Item, pricelistId: number) => {
    const result = await apiCall(`/api/menu/pricelists/${pricelistId}/items/${item.id}`, {
      method: "DELETE",
    });
    if (result.status >= 200 && result.status < 300) {
      fetchItems(page, debouncedSearch);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteItem) return;
    setDeleteLoading(true);
    setDeleteError(null);
    const result = await apiCall(`/api/menu/items/${deleteItem.id}`, { method: "DELETE" });
    setDeleteLoading(false);
    if (result.status >= 200 && result.status < 300) {
      setDeleteItem(null);
      // If last item on page, go back a page
      const newTotal = total - 1;
      const maxPage = Math.max(1, Math.ceil(newTotal / PAGE_SIZE));
      fetchItems(Math.min(page, maxPage), debouncedSearch);
    } else {
      setDeleteError(result.error || "Failed to delete item");
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const startIndex = (page - 1) * PAGE_SIZE + 1;
  const endIndex = Math.min(page * PAGE_SIZE, total);

  const buildPageNumbers = () => {
    const pages: (number | "…")[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (page > 3) pages.push("…");
      for (let i = Math.max(2, page - 1); i <= Math.min(totalPages - 1, page + 1); i++) pages.push(i);
      if (page < totalPages - 2) pages.push("…");
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-bag me-2" aria-hidden></i>
            Items
            <i
              className="bi bi-question-circle ms-2"
              style={{ cursor: "help", fontSize: "0.9rem" }}
              data-bs-toggle="tooltip"
              data-bs-placement="bottom"
              title="View and manage all items. Assign categories and pricelists to items here."
            ></i>
          </h1>
        </PageHeaderStrip>

        <ErrorDisplay error={fetchError} onDismiss={() => setFetchError(null)} />

        <div className="card shadow-sm">
          <div className="card-header bg-light">
            <div className="d-flex justify-content-between align-items-center gap-2 flex-wrap">
              <h5 className="mb-0 fw-bold">
                <i className="bi bi-list-ul me-2 text-primary"></i>
                All Items
                <span className="ms-2 badge bg-secondary fw-normal">{total}</span>
              </h5>
              <div className="input-group input-group-sm" style={{ maxWidth: 320 }}>
                <span className="input-group-text">
                  <i className="bi bi-search"></i>
                </span>
                <input
                  type="text"
                  className="form-control"
                  placeholder="Search by name, code or category…"
                  value={search}
                  onChange={(e) => handleSearchChange(e.target.value)}
                />
                {search && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => handleSearchChange("")}
                    title="Clear search"
                  >
                    <i className="bi bi-x"></i>
                  </button>
                )}
              </div>
            </div>
          </div>
          <div className="card-body p-0">
            <div className="table-responsive">
              <table className="table table-sm table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="fw-semibold">#</th>
                    <th className="fw-semibold">Name</th>
                    <th className="fw-semibold">Code</th>
                    <th className="fw-semibold">Category</th>
                    <th className="fw-semibold">Flags</th>
                    <th className="fw-semibold">Pricelists</th>
                    <th className="fw-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center text-muted py-4">
                        {search ? "No items match your search." : "No items found."}
                      </td>
                    </tr>
                  )}
                  {items.map((item, index) => (
                    <tr key={item.id}>
                      <td className="fw-medium align-middle">{startIndex + index}</td>
                      <td className="align-middle fw-semibold">{item.name}</td>
                      <td className="align-middle">
                        <span className="badge bg-secondary-subtle text-secondary border">
                          {item.code}
                        </span>
                      </td>
                      <td className="align-middle">
                        {item.category ? (
                          <span className="badge bg-primary-subtle text-primary border border-primary-subtle">
                            {item.category.name}
                          </span>
                        ) : (
                          <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                            Uncategorised
                          </span>
                        )}
                      </td>
                      <td className="align-middle">
                        <div className="d-flex gap-1 flex-wrap">
                          {item.isGroup && <span className="badge bg-primary">Group</span>}
                          {item.isStock && <span className="badge bg-success">Stock</span>}
                          {item.allowNegativeInventory && (
                            <span className="badge bg-warning text-dark">Allow Neg</span>
                          )}
                          {!item.isGroup && !item.isStock && !item.allowNegativeInventory && (
                            <span className="text-muted small">—</span>
                          )}
                        </div>
                      </td>
                      <td className="align-middle">
                        {item.pricelists.length === 0 ? (
                          <span className="badge bg-warning-subtle text-warning border border-warning-subtle">
                            None
                          </span>
                        ) : (
                          <div className="d-flex flex-wrap gap-1">
                            {item.pricelists.map((pl) => (
                              <span
                                key={pl.id}
                                className="badge bg-success-subtle text-success border border-success-subtle d-inline-flex align-items-center gap-1"
                              >
                                {pl.name} — KSh {Number(pl.price).toFixed(2)}
                                <button
                                  type="button"
                                  className="btn-close btn-close-sm"
                                  style={{ fontSize: "0.5rem" }}
                                  title={`Remove from ${pl.name}`}
                                  onClick={() => handleUnlinkFromPricelist(item, pl.id)}
                                  aria-label={`Remove from ${pl.name}`}
                                />
                              </span>
                            ))}
                          </div>
                        )}
                      </td>
                      <td className="text-center align-middle">
                        <div className="d-flex gap-1 justify-content-center flex-nowrap">
                          <button
                            className="btn btn-outline-primary btn-sm"
                            title="Edit item details"
                            onClick={() => setEditItem(item)}
                          >
                            <i className="bi bi-pencil"></i>
                          </button>
                          <button
                            className="btn btn-outline-secondary btn-sm"
                            title="Assign category"
                            onClick={() => {
                              setAssignCategoryItem(item);
                              setAssignCategoryError(null);
                            }}
                          >
                            <i className="bi bi-tag"></i>
                          </button>
                          <button
                            className="btn btn-outline-success btn-sm"
                            title="Link to pricelist"
                            onClick={() => setLinkPricelistItem(item)}
                          >
                            <i className="bi bi-link-45deg"></i>
                          </button>
                          <button
                            className="btn btn-outline-danger btn-sm"
                            title="Delete item"
                            onClick={() => { setDeleteItem(item); setDeleteError(null); }}
                          >
                            <i className="bi bi-trash"></i>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination footer */}
          {total > PAGE_SIZE && (
            <div className="card-footer bg-light d-flex align-items-center justify-content-between flex-wrap gap-2">
              <small className="text-muted">
                Showing {startIndex}–{endIndex} of {total} items
              </small>
              <nav>
                <ul className="pagination pagination-sm mb-0">
                  <li className={`page-item${page === 1 ? " disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPage(page - 1)} disabled={page === 1}>
                      <i className="bi bi-chevron-left"></i>
                    </button>
                  </li>
                  {buildPageNumbers().map((p, i) =>
                    p === "…" ? (
                      <li key={`ellipsis-${i}`} className="page-item disabled">
                        <span className="page-link">…</span>
                      </li>
                    ) : (
                      <li key={p} className={`page-item${p === page ? " active" : ""}`}>
                        <button className="page-link" onClick={() => setPage(p)}>
                          {p}
                        </button>
                      </li>
                    )
                  )}
                  <li className={`page-item${page === totalPages ? " disabled" : ""}`}>
                    <button className="page-link" onClick={() => setPage(page + 1)} disabled={page === totalPages}>
                      <i className="bi bi-chevron-right"></i>
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>

        {assignCategoryError && (
          <div className="alert alert-danger mt-2" role="alert">
            <i className="bi bi-exclamation-triangle me-2"></i>
            {assignCategoryError}
          </div>
        )}

        <AssignCategoryModal
          show={!!assignCategoryItem}
          itemName={assignCategoryItem?.name ?? ""}
          currentCategoryId={assignCategoryItem?.category?.id ?? null}
          onHide={() => setAssignCategoryItem(null)}
          onConfirm={handleAssignCategory}
        />

        <LinkPricelistModal
          show={!!linkPricelistItem}
          itemId={linkPricelistItem?.id ?? 0}
          itemName={linkPricelistItem?.name ?? ""}
          linkedPricelistIds={linkPricelistItem?.pricelists.map((pl) => pl.id) ?? []}
          onHide={() => setLinkPricelistItem(null)}
          onLinked={(plId, plName, plPrice) => {
            if (linkPricelistItem) {
              setItems((prev) =>
                prev.map((i) =>
                  i.id === linkPricelistItem.id
                    ? {
                        ...i,
                        pricelists: [
                          ...i.pricelists,
                          { id: plId, name: plName, price: plPrice, pricelistItemId: 0 },
                        ],
                      }
                    : i
                )
              );
            }
            fetchItems(page, debouncedSearch);
          }}
        />

        <EditItemDetailsModal
          show={!!editItem}
          item={editItem}
          onHide={() => setEditItem(null)}
          onUpdated={(updated) => {
            setItems((prev) =>
              prev.map((i) => (i.id === updated.id ? { ...i, ...updated } : i))
            );
            fetchItems(page, debouncedSearch);
          }}
        />

        {/* Delete confirmation modal */}
        {deleteItem && (
          <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className="bi bi-trash text-danger me-2"></i>
                    Delete Item
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => { setDeleteItem(null); setDeleteError(null); }}
                  ></button>
                </div>
                <div className="modal-body">
                  {deleteError && (
                    <div className="alert alert-danger py-2 small" role="alert">
                      <i className="bi bi-exclamation-circle me-1"></i>
                      {deleteError}
                    </div>
                  )}
                  <p>
                    Are you sure you want to delete <strong>&quot;{deleteItem.name}&quot;</strong>?
                  </p>
                  <div className="alert alert-warning mb-0" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    This action cannot be undone. The item will be permanently removed from all pricelists and categories.
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => { setDeleteItem(null); setDeleteError(null); }}
                    disabled={deleteLoading}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className="btn btn-danger"
                    onClick={handleConfirmDelete}
                    disabled={deleteLoading}
                  >
                    {deleteLoading ? (
                      <><span className="spinner-border spinner-border-sm me-1" role="status"></span>Deleting…</>
                    ) : (
                      <><i className="bi bi-trash me-1"></i>Delete Item</>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleAwareLayout>
  );
}
