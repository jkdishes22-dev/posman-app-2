"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

interface InventoryItem {
  id: number;
  name: string;
  code: string;
  isStock: boolean;
  status: string;
}

type ItemTypeFilter = "all" | "stock" | "sellable";

export default function SupervisorProductionItemsPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [itemTypeFilter, setItemTypeFilter] = useState<ItemTypeFilter>("all");

  const apiCall = useApiCall();

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  useEffect(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase();
    let nextItems = [...inventoryItems];

    if (itemTypeFilter === "stock") {
      nextItems = nextItems.filter((item) => item.isStock);
    } else if (itemTypeFilter === "sellable") {
      nextItems = nextItems.filter((item) => !item.isStock);
    }

    if (normalizedSearch.length > 0) {
      nextItems = nextItems.filter(
        (item) =>
          item.name.toLowerCase().includes(normalizedSearch) ||
          item.code.toLowerCase().includes(normalizedSearch)
      );
    }

    setFilteredItems(nextItems);
  }, [inventoryItems, searchTerm, itemTypeFilter]);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall("/api/production/items");
      if (result.status === 200) {
        const items = result.data.items || [];
        setInventoryItems(items);
        setFilteredItems(items);
      } else {
        setError(result.error || "Failed to fetch inventory items");
        setErrorDetails(result.errorDetails);
      }
    } catch (error) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventoryItem = async (itemData) => {
    try {
      setFormError(null);
      const result = await apiCall("/api/production/items", {
        method: "POST",
        body: JSON.stringify(itemData),
      });

      if (result.status === 200 || result.status === 201) {
        await fetchInventoryItems();
        setShowModal(false);
      } else {
        setFormError(result.error || "Failed to add inventory item");
      }
    } catch (error) {
      setFormError("Network error occurred");
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip>
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-box-seam me-2" aria-hidden></i>
            Production Items Management
          </h1>
          <p className="mb-0 mt-2 small text-white-50">Manage production items and inventory for supervisors</p>
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

        <div className="row">
          <div className="col-12">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Inventory Items</h5>
                <Button
                  variant="primary"
                  onClick={() => setShowModal(true)}
                >
                  <i className="bi bi-plus me-1"></i>
                  Create Stock Item
                </Button>
              </div>
              <div className="card-body">
                {formError && (
                  <div className="alert alert-danger" role="alert">
                    {formError}
                    <button
                      type="button"
                      className="btn-close"
                      onClick={() => setFormError(null)}
                    ></button>
                  </div>
                )}

                {loading ? (
                  <div className="text-center">
                    <div className="spinner-border" role="status">
                      <span className="visually-hidden">Loading...</span>
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="row g-3 mb-3">
                      <div className="col-md-6">
                        <label className="form-label mb-1" htmlFor="itemSearch">
                          Search
                        </label>
                        <input
                          id="itemSearch"
                          type="text"
                          className="form-control"
                          placeholder="Search by name or code..."
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                      </div>
                      <div className="col-md-4">
                        <label className="form-label mb-1" htmlFor="itemTypeFilter">
                          Item Type
                        </label>
                        <select
                          id="itemTypeFilter"
                          className="form-select"
                          value={itemTypeFilter}
                          onChange={(e) => setItemTypeFilter(e.target.value as ItemTypeFilter)}
                        >
                          <option value="all">All Types</option>
                          <option value="stock">Stock Items</option>
                          <option value="sellable">Sellable Items</option>
                        </select>
                      </div>
                    </div>
                    <div className="table-responsive">
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Code</th>
                          <th>Status</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>{item.name}</td>
                            <td>{item.code}</td>
                            <td>
                              <span
                                className={`badge ${item.isStock ? "bg-success" : "bg-secondary"
                                  }`}
                              >
                                {item.isStock ? "Stock" : "Sellable"}
                              </span>
                            </td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => {
                                  // Handle edit functionality
                                }}
                              >
                                Edit
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Add Item Modal */}
        {showModal && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Create Stock Item</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      handleAddInventoryItem({
                        name: formData.get("name"),
                        code: formData.get("code"),
                        isStock: formData.get("isStock") === "on",
                      });
                    }}
                  >
                    <div className="mb-3">
                      <label htmlFor="itemName" className="form-label">
                        Item Name
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="itemName"
                        name="name"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="itemCode" className="form-label">
                        Item Code
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="itemCode"
                        name="code"
                        required
                      />
                    </div>
                    <div className="mb-3 form-check">
                      <input
                        type="checkbox"
                        className="form-check-input"
                        id="isStock"
                        name="isStock"
                        defaultChecked
                      />
                      <label className="form-check-label" htmlFor="isStock">
                        Is Stock Item
                      </label>
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Create Item
                      </button>
                    </div>
                  </form>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </RoleAwareLayout>
  );
}
