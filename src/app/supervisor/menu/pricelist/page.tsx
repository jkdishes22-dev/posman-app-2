"use client";

import RoleAwareLayout from "../../../shared/RoleAwareLayout";
import React, { useState, useEffect } from "react";
import { Button } from "react-bootstrap";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";

interface Pricelist {
  id: number;
  name: string;
  description: string;
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [itemError, setItemError] = useState<string | null>(null);
  const [itemErrorDetails, setItemErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [showPricelistModal, setShowPricelistModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [selectedPricelist, setSelectedPricelist] = useState<Pricelist | null>(null);

  useEffect(() => {
    fetchPricelists();
    fetchPricelistItems();
  }, []);

  const fetchPricelists = async () => {
    try {
      setLoading(true);
      setError(null);
      setErrorDetails(null);

      const result = await apiCall("/api/menu/pricelists");
      if (result.status === 200) {
        setPricelists(result.data.pricelists || []);
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

  const fetchPricelistItems = async () => {
    try {
      const result = await apiCall("/api/menu/items");
      if (result.status === 200) {
        setPricelistItems(result.data.items || []);
      } else {
        setItemError(result.error || "Failed to fetch pricelist items");
        setItemErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error fetching pricelist items:", error);
      setItemError("Network error occurred");
      setItemErrorDetails(null);
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

  const handleAddItem = async (itemData) => {
    try {
      setItemError(null);
      setItemErrorDetails(null);
      const result = await apiCall("/api/menu/items", {
        method: "POST",
        body: JSON.stringify(itemData),
      });

      if (result.status === 200 || result.status === 201) {
        await fetchPricelistItems();
        setShowItemModal(false);
      } else {
        setItemError(result.error || "Failed to add item");
        setItemErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Error adding item:", error);
      setItemError("Network error occurred");
      setItemErrorDetails(null);
    }
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="row mb-4">
          <div className="col-12">
            <h1 className="h3 mb-0">Pricelist Management</h1>
            <p className="text-muted">Manage pricelists and items for supervisors</p>
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
          {/* Pricelists Section */}
          <div className="col-md-6">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Pricelists</h5>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => setShowPricelistModal(true)}
                >
                  <i className="bi bi-plus me-1"></i>
                  Add Pricelist
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
                          <th>#</th>
                          <th>Name</th>
                          <th>Description</th>
                          <th>Status</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pricelists.map((pricelist) => (
                          <tr key={pricelist.id}>
                            <td>{pricelist.id}</td>
                            <td>{pricelist.name}</td>
                            <td>{pricelist.description}</td>
                            <td>
                              <span
                                className={`badge ${pricelist.status === "active" ? "bg-success" : "bg-secondary"
                                  }`}
                              >
                                {pricelist.status}
                              </span>
                            </td>
                            <td>
                              <Button
                                variant="outline-primary"
                                size="sm"
                                onClick={() => setSelectedPricelist(pricelist)}
                              >
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
          <div className="col-md-6">
            <div className="card">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h5 className="card-title mb-0">Pricelist Items</h5>
                <Button
                  variant="success"
                  size="sm"
                  onClick={() => setShowItemModal(true)}
                >
                  <i className="bi bi-plus me-1"></i>
                  Add Item
                </Button>
              </div>
              <div className="card-body">
                <ErrorDisplay
                  error={itemError}
                  errorDetails={itemErrorDetails}
                  onDismiss={() => {
                    setItemError(null);
                    setItemErrorDetails(null);
                  }}
                />

                <div className="table-responsive">
                  <table className="table table-striped">
                    <thead>
                      <tr>
                        <th>Item Name</th>
                        <th>Item Code</th>
                        <th>Category</th>
                        <th>Pricelist</th>
                        <th>Price</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pricelistItems.map((item) => (
                        <tr key={item.id}>
                          <td>{item.itemName}</td>
                          <td>{item.itemCode}</td>
                          <td>{item.category}</td>
                          <td>{item.pricelist}</td>
                          <td>${(Number(item.itemPrice) || 0).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
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
                        description: formData.get("description"),
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
                    <div className="mb-3">
                      <label htmlFor="pricelistDescription" className="form-label">
                        Description
                      </label>
                      <textarea
                        className="form-control"
                        id="pricelistDescription"
                        name="description"
                        rows={3}
                      ></textarea>
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

        {/* Add Item Modal */}
        {showItemModal && (
          <div className="modal show d-block" tabIndex={-1}>
            <div className="modal-dialog">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">Add Item to Pricelist</h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => setShowItemModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const formData = new FormData(e.target as HTMLFormElement);
                      handleAddItem({
                        itemName: formData.get("itemName"),
                        itemCode: formData.get("itemCode"),
                        category: formData.get("category"),
                        pricelistId: formData.get("pricelistId"),
                        itemPrice: parseFloat(formData.get("itemPrice") as string),
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
                        name="itemName"
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
                        name="itemCode"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="category" className="form-label">
                        Category
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        id="category"
                        name="category"
                        required
                      />
                    </div>
                    <div className="mb-3">
                      <label htmlFor="pricelistId" className="form-label">
                        Pricelist
                      </label>
                      <select className="form-select" id="pricelistId" name="pricelistId" required>
                        <option value="">Select Pricelist</option>
                        {pricelists.map((pricelist) => (
                          <option key={pricelist.id} value={pricelist.id}>
                            {pricelist.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="mb-3">
                      <label htmlFor="itemPrice" className="form-label">
                        Price
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control"
                        id="itemPrice"
                        name="itemPrice"
                        required
                      />
                    </div>
                    <div className="d-flex justify-content-end gap-2">
                      <button
                        type="button"
                        className="btn btn-secondary"
                        onClick={() => setShowItemModal(false)}
                      >
                        Cancel
                      </button>
                      <button type="submit" className="btn btn-primary">
                        Add Item
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
