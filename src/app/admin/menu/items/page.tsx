"use client";

import React, { useCallback, useEffect, useState } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import PageHeaderStrip from "src/app/components/PageHeaderStrip";
import ErrorDisplay from "src/app/components/ErrorDisplay";
import { useApiCall } from "src/app/utils/apiUtils";
import { useTooltips } from "src/app/hooks/useTooltips";
import AssignCategoryModal from "./components/assign-category-modal";

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
  category: { id: number; name: string } | null;
  pricelists: ItemPricelist[];
}

interface Pricelist {
  id: number;
  name: string;
  status: string;
}

export default function ItemsPage() {
  useTooltips();
  const apiCall = useApiCall();

  const [items, setItems] = useState<Item[]>([]);
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  const [assignCategoryItem, setAssignCategoryItem] = useState<Item | null>(null);
  const [assignCategoryError, setAssignCategoryError] = useState<string | null>(null);

  const [linkPricelistItemId, setLinkPricelistItemId] = useState<number | null>(null);
  const [linkPricelistId, setLinkPricelistId] = useState<string>("");
  const [linkPrice, setLinkPrice] = useState<string>("");
  const [linkError, setLinkError] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);

  const fetchItems = useCallback(async () => {
    const result = await apiCall("/api/menu/items?all=true");
    if (result.status >= 200 && result.status < 300) {
      setItems(Array.isArray(result.data) ? result.data : []);
      setFetchError(null);
    } else {
      setFetchError(result.error || "Failed to fetch items");
    }
  }, [apiCall]);

  const fetchPricelists = useCallback(async () => {
    const result = await apiCall("/api/menu/pricelists");
    if (result.status >= 200 && result.status < 300) {
      setPricelists(Array.isArray(result.data) ? result.data : []);
    }
  }, [apiCall]);

  useEffect(() => {
    fetchItems();
    fetchPricelists();
  }, [fetchItems, fetchPricelists]);

  const handleAssignCategory = async (categoryId: number | null) => {
    if (!assignCategoryItem) return;
    setAssignCategoryError(null);
    const result = await apiCall(`/api/menu/items/${assignCategoryItem.id}/category`, {
      method: "PATCH",
      body: JSON.stringify({ categoryId }),
    });
    if (result.status >= 200 && result.status < 300) {
      setAssignCategoryItem(null);
      fetchItems();
    } else {
      setAssignCategoryError(result.error || "Failed to update category");
    }
  };

  const handleUnlinkFromPricelist = async (item: Item, pricelistItemId: number, pricelistId: number) => {
    const result = await apiCall(`/api/menu/pricelists/${pricelistId}/items/${item.id}`, {
      method: "DELETE",
    });
    if (result.status >= 200 && result.status < 300) {
      fetchItems();
    }
  };

  const handleLinkToPricelist = async (itemId: number) => {
    if (!linkPricelistId || !linkPrice) {
      setLinkError("Please select a pricelist and enter a price.");
      return;
    }
    setLinkLoading(true);
    setLinkError(null);
    const result = await apiCall(`/api/menu/pricelists/${linkPricelistId}/items/${itemId}`, {
      method: "POST",
      body: JSON.stringify({ price: Number(linkPrice) }),
    });
    setLinkLoading(false);
    if (result.status >= 200 && result.status < 300) {
      setLinkPricelistItemId(null);
      setLinkPricelistId("");
      setLinkPrice("");
      fetchItems();
    } else {
      setLinkError(result.error || "Failed to link item to pricelist");
    }
  };

  const filtered = items.filter((item) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      item.name.toLowerCase().includes(q) ||
      item.code.toLowerCase().includes(q) ||
      item.category?.name.toLowerCase().includes(q)
    );
  });

  const availablePricelists = (item: Item) =>
    pricelists.filter((pl) => !item.pricelists.some((ip) => ip.id === pl.id));

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
                <span className="ms-2 badge bg-secondary fw-normal">{items.length}</span>
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
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    className="btn btn-outline-secondary"
                    type="button"
                    onClick={() => setSearch("")}
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
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="fw-semibold">#</th>
                    <th className="fw-semibold">Name</th>
                    <th className="fw-semibold">Code</th>
                    <th className="fw-semibold">Category</th>
                    <th className="fw-semibold">Pricelists</th>
                    <th className="fw-semibold text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={6} className="text-center text-muted py-4">
                        {search ? "No items match your search." : "No items found."}
                      </td>
                    </tr>
                  )}
                  {filtered.map((item, index) => (
                    <React.Fragment key={item.id}>
                      <tr>
                        <td className="fw-medium align-middle">{index + 1}</td>
                        <td className="align-middle">
                          {item.name}
                          {item.isGroup && (
                            <span className="ms-1 badge bg-info text-dark small">Group</span>
                          )}
                          {item.isStock && (
                            <span className="ms-1 badge bg-secondary small">Stock</span>
                          )}
                        </td>
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
                                  {pl.name}
                                  <button
                                    type="button"
                                    className="btn-close btn-close-sm"
                                    style={{ fontSize: "0.5rem" }}
                                    title={`Remove from ${pl.name}`}
                                    onClick={() => handleUnlinkFromPricelist(item, pl.pricelistItemId, pl.id)}
                                    aria-label={`Remove from ${pl.name}`}
                                  />
                                </span>
                              ))}
                            </div>
                          )}
                        </td>
                        <td className="text-center align-middle">
                          <div className="d-flex gap-1 justify-content-center">
                            <button
                              className="btn btn-outline-primary btn-sm"
                              title="Assign category"
                              onClick={() => {
                                setAssignCategoryItem(item);
                                setAssignCategoryError(null);
                              }}
                            >
                              <i className="bi bi-tag me-1"></i>
                              Category
                            </button>
                            <button
                              className="btn btn-outline-success btn-sm"
                              title="Link to pricelist"
                              onClick={() => {
                                setLinkPricelistItemId(item.id === linkPricelistItemId ? null : item.id);
                                setLinkPricelistId("");
                                setLinkPrice("");
                                setLinkError(null);
                              }}
                            >
                              <i className="bi bi-link-45deg me-1"></i>
                              Pricelist
                            </button>
                          </div>
                        </td>
                      </tr>
                      {linkPricelistItemId === item.id && (
                        <tr className="table-light">
                          <td colSpan={6} className="py-2 px-3">
                            <div className="d-flex align-items-center gap-2 flex-wrap">
                              <span className="fw-semibold small text-muted">Link to pricelist:</span>
                              <select
                                className="form-select form-select-sm"
                                style={{ maxWidth: 200 }}
                                value={linkPricelistId}
                                onChange={(e) => setLinkPricelistId(e.target.value)}
                              >
                                <option value="">Select pricelist…</option>
                                {availablePricelists(item).map((pl) => (
                                  <option key={pl.id} value={pl.id}>
                                    {pl.name}
                                  </option>
                                ))}
                              </select>
                              <input
                                type="number"
                                className="form-control form-control-sm"
                                style={{ maxWidth: 110 }}
                                placeholder="Price (KES)"
                                min={0}
                                step="0.01"
                                value={linkPrice}
                                onChange={(e) => setLinkPrice(e.target.value)}
                              />
                              <button
                                className="btn btn-success btn-sm"
                                onClick={() => handleLinkToPricelist(item.id)}
                                disabled={linkLoading}
                              >
                                {linkLoading ? (
                                  <span className="spinner-border spinner-border-sm" role="status"></span>
                                ) : (
                                  <><i className="bi bi-check-circle me-1"></i>Link</>
                                )}
                              </button>
                              <button
                                className="btn btn-outline-secondary btn-sm"
                                onClick={() => { setLinkPricelistItemId(null); setLinkError(null); }}
                              >
                                Cancel
                              </button>
                              {linkError && (
                                <span className="text-danger small">
                                  <i className="bi bi-exclamation-circle me-1"></i>
                                  {linkError}
                                </span>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
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
      </div>
    </RoleAwareLayout>
  );
}
