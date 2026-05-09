"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ViewItems from "../../../admin/menu/category/components/items/items-view";
import ItemAdd from "../../../admin/menu/category/components/items/items-new";
import { Item } from "../../../types/types";

interface Pricelist {
  id: number;
  name: string;
  description?: string;
  status: string;
  station?: {
    name: string;
  };
}

interface PricelistItem {
  id: number;
  itemName: string;
  itemCode: string;
  category: string;
  pricelist: string;
  itemPrice: number;
}

export default function SupervisorPricelistPage() {
  const apiCall = useApiCall();
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [pricelistItems, setPricelistItems] = useState<PricelistItem[]>([]);
  const [transformedItems, setTransformedItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemErrorDetails, setItemErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [showPricelistModal, setShowPricelistModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedPricelist, setSelectedPricelist] = useState<Pricelist | null>(null);
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">("all");
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    fetchPricelists();
  }, []);

  useEffect(() => {
    if (selectedPricelist) {
      fetchPricelistItems(selectedPricelist.id);
    } else {
      setPricelistItems([]);
    }
  }, [selectedPricelist]);

  const fetchPricelists = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall("/api/menu/pricelists");
      if (result.status === 200) {
        // API returns array directly, not wrapped in {pricelists: [...]}
        setPricelists(Array.isArray(result.data) ? result.data : []);
      } else {
        setError(result.error || "Failed to fetch pricelists");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error fetching pricelists:", error);
      setError("Network error occurred");
      setErrorDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const fetchPricelistItems = async (pricelistId: number) => {
    if (!pricelistId) {
      setPricelistItems([]);
      setTransformedItems([]);
      return;
    }

    try {
      const result = await apiCall(`/api/menu/pricelists/${pricelistId}/items`);
      if (result.status === 200) {
        // API returns array directly
        const items = Array.isArray(result.data) ? result.data : [];
        setPricelistItems(items);

        // Transform items to match ViewItems expected format
        // API returns items with properties directly: name, code, id, category, etc.
        const transformed = items.map((item: any) => ({
          id: item.id,
          name: item.name || "Unknown",
          code: item.code || "N/A",
          price: item.price || 0,
          pricelistId: pricelistId,
          pricelistName: (item.pricelistName || selectedPricelist?.name || "") as any, // Type expects number but should be string
          pricelist_item_isEnabled: item.is_enabled !== undefined ? item.is_enabled : (item.isEnabled !== undefined ? item.isEnabled : true),
          stationName: selectedPricelist?.station?.name || "",
          category: item.category ? {
            id: String(item.category.id),
            name: item.category.name
          } : {
            id: "0",
            name: "N/A"
          },
          isGroup: item.isGroup || false,
          allowNegativeInventory: false, // Default value
          pricelistItemId: item.pricelistItemId, // Store pricelistItemId for price updates
        } as any)); // Use 'as any' to allow pricelistItemId property
        setTransformedItems(transformed);
        setItemError(null);
        setItemErrorDetails(null);
      } else {
        setItemError(result.error || "Failed to fetch pricelist items");
        setItemErrorDetails(result.errorDetails);
        setPricelistItems([]);
        setTransformedItems([]);
      }
    } catch (error: any) {
      console.error("Error fetching pricelist items:", error);
      setItemError("Network error occurred");
      setItemErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setPricelistItems([]);
      setTransformedItems([]);
    }
  };

  const handleAddPricelist = async (pricelistData) => {
    try {
      setFormError(null);
      const result = await apiCall("/api/menu/pricelists", {
        method: "POST",
        body: JSON.stringify(pricelistData),
      });

      if (result.status === 200 || result.status === 201) {
        await fetchPricelists();
        setShowPricelistModal(false);
      } else {
        setFormError(result.error || "Failed to add pricelist");
      }
    } catch (error: any) {
      console.error("Error adding pricelist:", error);
      setFormError("Network error occurred");
    }
  };

  const handleAddItem = async (itemData: any) => {
    try {
      setItemError(null);
      setItemErrorDetails(null);

      // Transform itemData to match API expectations
      // ItemAdd component passes: name, code, price, category, pricelistId, isGroup, isStock, allowNegativeInventory
      const transformedData = {
        name: itemData.name || itemData.itemName,
        code: itemData.code || itemData.itemCode,
        price: itemData.price || itemData.itemPrice,
        category: itemData.category,
        pricelistId: itemData.pricelistId || selectedPricelist?.id,
        isGroup: itemData.isGroup || false,
        isStock: itemData.isStock || false,
        allowNegativeInventory: itemData.allowNegativeInventory || false,
      };

      const result = await apiCall("/api/menu/items", {
        method: "POST",
        body: JSON.stringify(transformedData),
      });

      if (result.status === 200 || result.status === 201) {
        // Refresh items if a pricelist is selected
        if (selectedPricelist) {
          await fetchPricelistItems(selectedPricelist.id);
        }
        setShowItemModal(false);
      } else {
        setItemError(result.error || "Failed to add item");
        setItemErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error adding item:", error);
      setItemError("Network error occurred");
      setItemErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedPricelist) {
      setItemError("No pricelist selected");
      setItemErrorDetails(null);
      return;
    }

    try {
      setItemError(null);
      setItemErrorDetails(null);
      // Delete item from pricelist by disabling the pricelist_item relationship
      const result = await apiCall(`/api/menu/pricelists/${selectedPricelist.id}/items/${itemId}`, {
        method: "DELETE",
      });

      if (result.status === 200 || result.status === 204) {
        // Success - refresh pricelist items
        await fetchPricelistItems(selectedPricelist.id);
        setItemError(null);
        setItemErrorDetails(null);
      } else {
        // Error - apiCall already standardizes all non-2XX errors
        setItemError(result.error || "Failed to delete item from pricelist");
        setItemErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error deleting item from pricelist:", error);
      setItemError("Network error occurred");
      setItemErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const filteredPricelists = pricelists.filter((pricelist) => {
    const statusMatches = statusFilter === "all" || pricelist.status === statusFilter;
    const normalizedSearch = searchTerm.trim().toLowerCase();
    const searchMatches =
      normalizedSearch.length === 0 ||
      pricelist.name.toLowerCase().includes(normalizedSearch);
    return statusMatches && searchMatches;
  });

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-tags me-2" aria-hidden></i>
            Pricelist Management
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Manage pricelists and items for supervisors</p>
        </PageHeaderStrip>

        {/* Error Display */}
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        {/* Main Content */}
        <div className="row g-2">
          {/* Pricelists Section */}
          <div className="col-12 col-lg-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-list-ul me-2 text-primary"></i>
                    Pricelists
                  </h5>
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => setShowPricelistModal(true)}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Pricelist
                  </Button>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="p-3 border-bottom">
                  <div className="row g-3 align-items-end">
                    <div className="col-12 col-md-7">
                      <label className="form-label small fw-semibold mb-1">Search</label>
                      <input
                        type="text"
                        className="form-control form-control-sm w-100"
                        placeholder="Search pricelists..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                    <div className="col-12 col-md-5">
                      <label className="form-label small fw-semibold mb-1">Status</label>
                      <select
                        className="form-select form-select-sm w-100"
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value as "all" | "active" | "inactive")}
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </select>
                    </div>
                  </div>
                </div>
                {formError && (
                  <div className="alert alert-danger m-3 mb-0" role="alert">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {formError}
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setFormError(null)}
                      aria-label="Close"
                    ></button>
                  </div>
                )}

                {loading ? (
                  <div className="text-center py-5">
                    <div className="spinner-border text-primary" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <div className="table-responsive" style={{ maxHeight: "500px", overflowY: "auto" }}>
                    <table className="table table-hover mb-0">
                      <thead className="table-light sticky-top">
                        <tr>
                          <th className="fw-semibold">#</th>
                          <th className="fw-semibold">Name</th>
                          <th className="fw-semibold text-center">Status</th>
                          <th className="fw-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredPricelists.map((pricelist, index) => (
                          <tr
                            key={pricelist.id}
                            onClick={() => setSelectedPricelist(pricelist)}
                            style={{ cursor: "pointer" }}
                            className={selectedPricelist?.id === pricelist.id ? "table-primary" : ""}
                          >
                            <td className="fw-medium">{index + 1}</td>
                            <td>{pricelist.name}</td>
                            <td className="text-center">
                              <span className={`badge ${pricelist.status === "active" ? "bg-success" : "bg-secondary"}`}>
                                {pricelist.status === "active" ? "Active" : "Inactive"}
                              </span>
                            </td>
                            <td className="text-center">
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedPricelist(pricelist);
                                }}
                              >
                                <i className="bi bi-eye me-1"></i>
                                View Items
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Pricelist Items Section */}
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-box-seam me-2 text-primary"></i>
                    {selectedPricelist ? (
                      <>
                        <span className="fw-normal text-muted me-2">Selected pricelist:</span>
                        {selectedPricelist.name}
                      </>
                    ) : (
                      "Items"
                    )}
                  </h5>
                  {selectedPricelist && (
                    <div className="d-flex gap-2">
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => setShowItemModal(true)}
                        disabled={selectedPricelist.status === "inactive"}
                        title={selectedPricelist.status === "inactive" ? "Cannot add items to inactive pricelist" : ""}
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        Add Item
                      </Button>
                      <Button
                        variant="outline-secondary"
                        size="sm"
                        onClick={() => {
                          if (selectedPricelist) {
                            fetchPricelistItems(selectedPricelist.id);
                          }
                        }}
                        title="Refresh items"
                      >
                        <i className="bi bi-arrow-clockwise me-1"></i>
                        Refresh
                      </Button>
                    </div>
                  )}
                </div>
              </div>
              <div className="card-body">
                {selectedPricelist && selectedPricelist.status === "inactive" && (
                  <div className="alert alert-warning alert-sm mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    <strong>Pricelist Inactive:</strong> Cannot add or manage items on inactive pricelists.
                  </div>
                )}
                <ErrorDisplay
                  error={itemError}
                  errorDetails={itemErrorDetails}
                  onDismiss={() => {
                    setItemError(null);
                    setItemErrorDetails(null);
                  }}
                />

                {selectedPricelist ? (
                  <div>
                    {transformedItems.length === 0 ? (
                      <div className="text-center py-5">
                        <i className="bi bi-inbox display-4 text-muted"></i>
                        <p className="text-muted mt-3">No items in this pricelist. Click "Add Item" to add items.</p>
                      </div>
                    ) : (
                      <ViewItems
                        selectedCategory={null}
                        items={[]}
                        pricelistItems={transformedItems}
                        itemError={itemError}
                        setItems={setTransformedItems}
                        onItemPick={() => { }}
                        isBillingSection={false}
                        isPricelistSection={true}
                        isCategoryItemsSection={false}
                        handleDeleteItem={handleDeleteItem}
                        onItemUpdated={() => {
                          if (selectedPricelist) {
                            fetchPricelistItems(selectedPricelist.id);
                          }
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="text-center py-5">
                    <i className="bi bi-list-check display-4 text-muted"></i>
                    <p className="text-muted mt-3">Select a pricelist from the left to view its items.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Pricelist Modal */}
        {showPricelistModal && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add New Pricelist</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowPricelistModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      handleAddPricelist({
                        name: formData.get("name"),
                        description: "",
                        status: "active",
                      });
                    }}
                  >
                    <div className="mb-3">
                      <label htmlFor="pricelistName" className="form-label">
                        Pricelist Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="pricelistName"
                        name="name"
                        required
                      />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowPricelistModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Add Pricelist
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Add Item Modal - Using shared ItemAdd component */}
        <ItemAdd
          selectedCategory={null}
          showModal={showItemModal}
          handleModalClose={() => setShowItemModal(false)}
          handleAddItem={handleAddItem}
          itemError={itemError || ""}
          setItemError={(error: string) => setItemError(error || null)}
          selectedPricelistId={selectedPricelist?.id || null}
        />
      </div>
    </RoleAwareLayout>
  );
}
