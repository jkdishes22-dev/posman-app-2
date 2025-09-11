"use client";

import React, { useState, useEffect, useRef } from "react";
import ViewItems from "../admin/menu/category/components/items/items-view";
import Categories from "../admin/menu/category/components/category/categories";
import { Item } from "../types/types";
import QuantityModal from "./QuantityModal";
import jwt from "jsonwebtoken";
import { DecodedToken } from "../components/SecureRoute";
import { Button, Modal, Alert, Row, Col } from "react-bootstrap";
import ReceiptPrint, { CaptainOrderPrint, CustomerCopyPrint } from './ReceiptPrint';
import { printReceiptWithTimestamp, downloadReceiptAsFile } from './printUtils';
import ReactDOM from "react-dom/client";
import { useStation } from "../contexts/StationContext";
import StationSelector from "../components/StationSelector";
import StationStatus from "../components/StationStatus";

const BillingSection = () => {
  // Station context
  const { currentStation, isLoading: stationLoading, error: stationError, loadStationsIfNeeded } = useStation();

  // Existing state
  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [fetchCategoryError, setFetchCategoryError] = useState("");
  const [itemError, setItemError] = useState("");
  const [selectedItems, setSelectedItems] = useState([]);
  const [showQuantityModal, setShowQuantityModal] = useState(false);
  const [currentItem, setCurrentItem] = useState<Item | null>(null);
  const [waitress, setWaitress] = useState("");
  const [userId, setUserId] = useState("");
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [createdBill, setCreatedBill] = useState(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    const decodedToken = jwt.decode(token) as DecodedToken;
    if (decodedToken && decodedToken.user) {
      setWaitress(decodedToken.user.firstname);
      setUserId(decodedToken.id.toString());
    }

    // Load stations if needed
    loadStationsIfNeeded();
  }, [loadStationsIfNeeded]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/categories", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (!response.ok) {
          setFetchCategoryError("Failed to fetch categories: " + data);
          throw new Error("Failed to fetch categories");
        }
        setCategories(data);
      } catch (error: any) {
        setFetchCategoryError("Failed to fetch categories: " + error);
      }
    };
    fetchCategories();
  }, []);

  // Refetch items when station changes
  useEffect(() => {
    if (currentStation && selectedCategory) {
      fetchItems(selectedCategory.id);
    }
  }, [currentStation, selectedCategory]);

  const fetchItems = async (categoryId: string) => {
    if (!currentStation) {
      setItemError("No station selected. Please select a station first.");
      return;
    }

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/menu/items/station?stationId=${currentStation.id}&categoryId=${categoryId}&userId=${userId}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      const data = await response.json();
      if (!response.ok) {
        if (response.status === 403 && data.missingPermissions) {
          throw new Error(`Access denied: Missing ${data.missingPermissions.join(", ")} permission(s)`);
        }
        throw new Error(data.message || "Failed to fetch items for this station");
      }
      setItems(data.items || []);
    } catch (error: any) {
      const errorMessage = error.message || "Failed to fetch items for the selected category and station";
      setItemError(errorMessage);
    }
  };

  const handlePickItem = (item: Item) => {
    if (!item.price) {
      return;
    }
    setCurrentItem(item);
    setShowQuantityModal(true);
  };

  const handleQuantityConfirm = (quantity: number) => {
    if (currentItem) {
      setSelectedItems((prev) => {
        const existingItemIndex = prev.findIndex(
          (i) => i.id === currentItem.id,
        );
        if (existingItemIndex >= 0) {
          const updatedItems = [...prev];
          updatedItems[existingItemIndex].quantity = quantity;
          updatedItems[existingItemIndex].subtotal =
            currentItem.price * quantity;
          return updatedItems;
        } else {
          return [
            ...prev,
            {
              ...currentItem,
              quantity,
              subtotal: currentItem.price * quantity,
            },
          ];
        }
      });
    }
  };

  const handleRemoveItem = (itemId: string) => {
    setSelectedItems((prev) => prev.filter((item) => item.id !== itemId));
  };

  const handleShowSubmitModal = () => setShowSubmitModal(true);
  const handleCloseSubmitModal = () => setShowSubmitModal(false);
  const handleShowCancelModal = () => setShowCancelModal(true);
  const handleCloseCancelModal = () => setShowCancelModal(false);

  const handleConfirmSubmit = async () => {
    if (!currentStation) {
      alert("Please select a station before creating a bill");
      return;
    }

    const token = localStorage.getItem("token");
    const total = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
    const payload = {
      items: selectedItems.map((item) => ({
        item_id: item.id,
        quantity: item.quantity,
        subtotal: item.subtotal,
      })),
      user_id: userId,
      station_id: currentStation.id,
      total,
    };
    try {
      const response = await fetch("/api/bills", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });
      if (!response.ok) {
        throw new Error("Failed to submit picked items");
      }
      const data = await response.json();
      setShowSubmitModal(false);
      setCreatedBill({
        ...data.bill,
        bill_items: selectedItems.map(item => ({
          ...item,
          item: { name: item.name, price: item.price },
        })),
        user: { firstName: waitress },
        currency: "KES",
      });
    } catch (error: any) {
      console.error("Error submitting items:", error);
    }
  };

  const handlePrint = async () => {
    if (!createdBill) return;

    // Print Captain Order first
    await printReceipt(CaptainOrderPrint, createdBill, "Captain Order");

    // Wait a moment, then print Customer Copy
    setTimeout(async () => {
      await printReceipt(CustomerCopyPrint, createdBill, "Customer Copy");
    }, 1000);
  };

  const printReceipt = async (Component: any, bill: any, title: string) => {
    // Determine the type based on the component
    let type: 'customer' | 'captain' | 'receipt' = 'receipt';
    if (Component === CustomerCopyPrint) {
      type = 'customer';
    } else if (Component === CaptainOrderPrint) {
      type = 'captain';
    }

    return printReceiptWithTimestamp(Component, bill, title, type);
  };

  const handleDownload = async () => {
    if (!createdBill) return;

    // Download Customer Copy
    await downloadReceiptAsFile(CustomerCopyPrint, createdBill, 'customer');
  };

  const handleConfirmCancel = () => {
    window.location.reload();
  };

  const totalAmount = selectedItems.reduce(
    (sum, item) => sum + item.subtotal,
    0,
  );

  // Show loading state if station is loading
  if (stationLoading) {
    return (
      <div className="container">
        <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '400px' }}>
          <div className="text-center">
            <div className="spinner-border text-primary mb-3" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="text-muted">Loading station information...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if station has error
  if (stationError) {
    return (
      <div className="container">
        <Alert variant="danger">
          <Alert.Heading>Station Error</Alert.Heading>
          <p>{stationError}</p>
          <Button variant="outline-danger" onClick={() => window.location.reload()}>
            Retry
          </Button>
        </Alert>
      </div>
    );
  }

  // Show warning if no station selected
  if (!currentStation) {
    return (
      <div className="container">
        <Alert variant="warning">
          <Alert.Heading>No Station Selected</Alert.Heading>
          <p>Please select a station to start billing.</p>
          <StationSelector />
        </Alert>
      </div>
    );
  }

  return (
    <div className="container-fluid px-3 py-2">
      {/* Minimal Header with Collapsible Station Selection */}
      <div className="row mb-2">
        <div className="col-12">
          <div className="d-flex justify-content-between align-items-center">
            <h4 className="mb-0 text-primary">
              <i className="bi bi-cart-check me-2"></i>
              Point of Sale
            </h4>
            <div className="d-flex align-items-center gap-2">
              <StationStatus variant="minimal" />
              <button
                className="btn btn-primary btn-sm"
                type="button"
                data-bs-toggle="collapse"
                data-bs-target="#stationSelector"
                aria-expanded="false"
                aria-controls="stationSelector"
                title="Choose Station"
              >
                <i className="bi bi-gear me-1"></i>
                Choose Station
              </button>
            </div>
          </div>

          {/* Collapsible Station Selector - Right Aligned */}
          <div className="collapse mt-2" id="stationSelector">
            <div className="d-flex justify-content-end">
              <div className="card border-0 bg-light" style={{ width: '300px' }}>
                <div className="card-body py-2">
                  <StationSelector showLabel={false} size="sm" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - Balanced Layout */}
      <div className="row g-3">
        {/* Available Items Section */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-light border-0 py-2">
              <h6 className="mb-0 text-dark">
                <i className="bi bi-box-seam me-1"></i>
                Available Items
              </h6>
            </div>
            <div className="card-body p-0">
              <ViewItems
                selectedCategory={selectedCategory}
                items={items}
                itemError={itemError}
                setItems={setItems}
                isBillingSection={true}
                isPricelistSection={false}
                isCategoryItemsSection={false}
                onItemPick={createdBill ? undefined : handlePickItem}
              />
            </div>
          </div>
        </div>

        {/* Billing Section - Balanced Layout */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-success text-white border-0 py-2">
              <h5 className="mb-0">
                <i className="bi bi-receipt me-2"></i>
                Current Bill
              </h5>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0 table-sm">
                  <thead className="table-light">
                    <tr>
                      <th className="border-0 small">Item</th>
                      <th className="border-0 text-center small">Qty</th>
                      <th className="border-0 text-end small">Price</th>
                      <th className="border-0 text-center small">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(createdBill ? createdBill.bill_items : selectedItems).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-3">
                          <i className="bi bi-cart-x fs-3 d-block mb-1"></i>
                          <small>No items in bill</small>
                        </td>
                      </tr>
                    ) : (
                      (createdBill ? createdBill.bill_items : selectedItems).map((item) => (
                        <tr key={item.id}>
                          <td className="fw-medium">{item.item?.name || item.name}</td>
                          <td className="text-center">
                            <span className="badge bg-secondary">{item.quantity}</span>
                          </td>
                          <td className="text-end fw-medium">
                            ${(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                          </td>
                          <td className="text-center">
                            {!createdBill && (
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove item"
                              >
                                <i className="bi bi-trash"></i>
                              </button>
                            )}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="card-footer bg-light border-0 py-2">
              <div className="row align-items-center">
                <div className="col-md-6">
                  <div className="d-flex flex-column">
                    <div className="h5 mb-1 text-success">
                      Total: ${createdBill && !isNaN(Number(createdBill.total))
                        ? Number(createdBill.total).toFixed(2)
                        : totalAmount.toFixed(2)
                      }
                    </div>
                    <small className="text-muted">
                      <i className="bi bi-person me-1"></i>
                      Served by: {waitress}
                    </small>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="d-grid gap-1 d-md-flex justify-content-md-end">
                    {!createdBill ? (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={handleShowSubmitModal}
                          disabled={selectedItems.length === 0 || !currentStation}
                          className="px-3"
                        >
                          <i className="bi bi-check-circle me-1"></i>
                          Create Bill
                        </Button>
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={handleShowCancelModal}
                          disabled={selectedItems.length === 0}
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Clear
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={handlePrint}
                          className="me-1"
                        >
                          <i className="bi bi-printer me-1"></i>
                          Print
                        </Button>
                        <Button
                          variant="outline-primary"
                          size="sm"
                          onClick={handleDownload}
                        >
                          <i className="bi bi-download me-1"></i>
                          Download
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categories Section - Compact */}
      <div className="row mt-2">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-header bg-light border-0 py-1">
              <h6 className="mb-0 text-dark">
                <i className="bi bi-grid me-1"></i>
                Item Categories
              </h6>
            </div>
            <div className="card-body py-1">
              <Categories
                categories={categories}
                onCategoryClick={(category) => {
                  setSelectedCategory(category);
                  fetchItems(category.id);
                }}
                fetchError={fetchCategoryError}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Hidden Receipt Component */}
      <div style={{ display: 'none' }}>
        {createdBill && <ReceiptPrint ref={receiptRef} bill={createdBill} />}
      </div>
      {/* Quantity Modal */}
      {showQuantityModal && (
        <QuantityModal
          item={currentItem}
          onClose={() => setShowQuantityModal(false)}
          onConfirm={handleQuantityConfirm}
        />
      )}

      {/* Submit Confirmation Modal */}
      <Modal show={showSubmitModal} onHide={handleCloseSubmitModal}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Billing</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Create bill of total amount:
          <b>{totalAmount}</b>?
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseSubmitModal}>
            Cancel
          </Button>
          <Button
            className="btn-success"
            variant="primary"
            onClick={handleConfirmSubmit}
          >
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal show={showCancelModal} onHide={handleCloseCancelModal}>
        <Modal.Header closeButton>
          <Modal.Title>Cancel Billing</Modal.Title>
        </Modal.Header>
        <Modal.Body>Are you sure you want to cancel billing?</Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleCloseCancelModal}>
            No
          </Button>
          <Button variant="primary" onClick={handleConfirmCancel}>
            Yes
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BillingSection;
