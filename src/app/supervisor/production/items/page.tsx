"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";

interface InventoryItem {
  id: number;
  name: string;
  code: string;
  isStock: boolean;
  status: string;
}

export default function SupervisorProductionItemsPage() {
  const [inventoryItems, setInventoryItems] = useState<InventoryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [showModal, setShowModal] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  useEffect(() => {
    fetchInventoryItems();
  }, []);

  const fetchInventoryItems = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const response = await fetch("/api/production/items");
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setInventoryItems(data.items || []);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      setError("Failed to fetch inventory items");
      setErrorDetails({ networkError: true, status: 0 });
    } finally {
      setLoading(false);
    }
  };

  const handleAddInventoryItem = async (itemData) => {
    try {
      setFormError(null);
      const response = await fetch("/api/production/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(itemData),
      });

      if (response.ok || response.status === 201) {
        await fetchInventoryItems();
        setShowModal(false);
      } else {
        const errorData = await response.json();
        setFormError(errorData.error || "Failed to add inventory item");
      }
    } catch (error) {
      console.error("Error adding inventory item:", error);
      setFormError("Network error occurred");
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Production Items Management</h1>
            <p className="text-muted">Manage production items and inventory for supervisors</p>
          </div>
        </div>

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
                        {inventoryItems.map((item) => (
                          <tr key={item.id}>
                            <td>{item.id}</td>
                            <td>{item.name}</td>
                            <td>{item.code}</td>
                            <td>
                              <span
                                className={`badge ${
                                  item.isStock ? "bg-success" : "bg-secondary"
                                }`}
                              >
                                {item.isStock ? "Active" : "Inactive"}
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
                      const formData = new FormData(e.target);
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
