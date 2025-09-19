"use client";

import React, { useState, useEffect, useRef } from "react";
import ViewItems from "../admin/menu/category/components/items/items-view";
import Categories from "../admin/menu/category/components/category/categories";
import { Item } from "../types/types";
import QuantityModal from "./QuantityModal";
import { Button, Modal, Alert, Row, Col } from "react-bootstrap";
import ReceiptPrint, { CaptainOrderPrint, CustomerCopyPrint } from './ReceiptPrint';
import { printReceiptWithTimestamp, downloadReceiptAsFile } from './printUtils';
import ReactDOM from "react-dom/client";
import { useStation } from "../contexts/StationContext";
import { useAuth } from "../contexts/AuthContext";
import ErrorDisplay from "../components/ErrorDisplay";
import StationSelector from "../components/StationSelector";
import StationStatus from "../components/StationStatus";
import { useApiCall } from "../utils/apiUtils";
import { ApiErrorResponse } from "../utils/errorUtils";

const BillingSection = () => {
  // Auth context
  const { isAuthenticated, logout, user } = useAuth();

  // Station context
  const { currentStation, isLoading: stationLoading, error: stationError, loadStationsIfNeeded } = useStation();

  // API call hook
  const apiCall = useApiCall();

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
  const [showStationSelector, setShowStationSelector] = useState(false);
  const [billError, setBillError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoriesFetched, setCategoriesFetched] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const receiptRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isAuthenticated) {
      logout();
      return;
    }

    const initializeUser = async () => {
      try {
        // Use auth context user directly
        if (user && user.id) {
          setUserId(user.id.toString());
          setWaitress(user.firstname || user.firstName || "");
        }
      } catch (error) {
        console.error("Error initializing user:", error);
      }
    };

    initializeUser();

    // Load stations if needed
    loadStationsIfNeeded();
  }, [isAuthenticated]);

  useEffect(() => {
    if (categoriesFetched) return;

    const fetchCategories = async () => {
      try {
        setCategoriesFetched(true);
        const result = await apiCall("/api/menu/categories");
        if (result.status === 200) {
          setCategories(result.data);
        } else {
          setFetchCategoryError("Failed to fetch categories: " + result.error);
          setErrorDetails(result.errorDetails);
          setCategoriesFetched(false); // Reset on error to allow retry
        }
      } catch (error: any) {
        setFetchCategoryError("Failed to fetch categories: " + error.message);
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        setCategoriesFetched(false); // Reset on error to allow retry
      }
    };
    fetchCategories();
  }, []); // Empty dependency array - only run once

  // Refetch items when station changes
  useEffect(() => {
    if (currentStation && selectedCategory) {
      fetchItems(selectedCategory.id);
    }
  }, [currentStation, selectedCategory]);

  // Auto-hide station selector when station is selected
  useEffect(() => {
    if (currentStation) {
      setShowStationSelector(false);
    }
  }, [currentStation]);

  const fetchItems = async (categoryId: string) => {
    if (!currentStation) {
      setItemError("No station selected. Please select a station first.");
      return;
    }

    try {
      const result = await apiCall(
        `/api/menu/items/station?stationId=${currentStation.id}&categoryId=${categoryId}&userId=${userId}`
      );

      if (result.status === 200) {
        setItems(result.data.items || []);
      } else {
        setItemError(result.error || "Failed to fetch items for this station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      const errorMessage = error.message || "Failed to fetch items for the selected category and station";
      setItemError(errorMessage);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
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
  const handleCloseSubmitModal = () => {
    setShowSubmitModal(false);
    setBillError(""); // Clear error when modal is closed
  };
  const handleShowCancelModal = () => setShowCancelModal(true);
  const handleCloseCancelModal = () => setShowCancelModal(false);

  const handleConfirmSubmit = async () => {
    if (!currentStation) {
      setBillError("Please select a station before creating a bill");
      return;
    }

    setIsSubmitting(true);
    setBillError(""); // Clear any previous errors

    try {
      // Ensure we have a valid user ID
      let currentUserId = userId;
      if (!currentUserId || currentUserId === "" || currentUserId === "NaN") {
        // Try to get user ID from auth context as fallback
        if (user && user.id) {
          currentUserId = user.id.toString();
          setUserId(currentUserId);
        } else {
          try {
            const result = await apiCall("/api/users/me");
            if (result.status === 200) {
              if (result.data.id) {
                currentUserId = result.data.id.toString();
                setUserId(currentUserId);
                setWaitress(result.data.firstname || result.data.firstName || "");
              } else {
                throw new Error("No user ID in API response");
              }
            } else {
              throw new Error(result.error || "Failed to fetch user data");
            }
          } catch (error) {
            setBillError("Unable to process bill. Please log out and log back in.");
            return;
          }
        }
      }

      const total = selectedItems.reduce((sum, item) => sum + item.subtotal, 0);
      const payload = {
        items: selectedItems.map((item) => ({
          item_id: item.id,
          quantity: item.quantity,
          subtotal: item.subtotal,
        })),
        user_id: parseInt(currentUserId), // Use the validated user ID
        station_id: currentStation.id,
        total,
      };
      try {
        const result = await apiCall("/api/bills", {
          method: "POST",
          body: JSON.stringify(payload),
        });
        if (result.status === 200) {
          setShowSubmitModal(false);
          setBillError(""); // Clear any previous errors
          setItems([]); // Clear available items instantly
          setCreatedBill({
            ...result.data.bill,
            bill_items: selectedItems.map(item => ({
              ...item,
              item: { name: item.name, price: item.price },
            })),
            user: { firstName: waitress },
            currency: "KES",
          });
        } else {
          setBillError(result.error || "Failed to submit picked items");
          setErrorDetails(result.errorDetails);
        }
      } catch (error: any) {
        // Show the actual error message from the API
        const errorMessage = error.message || "Failed to submit picked items";
        setBillError(errorMessage);
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      }
    } catch (error: any) {
      console.error("Error in bill submission:", error);
      setBillError("An unexpected error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
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
    // Reset bill state without reloading the page
    setCreatedBill(null);
    setSelectedItems([]);
    setSelectedCategory(null);
    setItems([]); // Clear the available items list
    setWaitress("");
    setUserId("");
    setShowSubmitModal(false);
    setShowCancelModal(false);
    setShowQuantityModal(false);
    setCurrentItem(null);
    setItemError("");
    setFetchCategoryError("");
    setBillError(""); // Clear bill errors
  };

  const handleNewBill = () => {
    // Reset all bill-related state without reloading the page
    setCreatedBill(null);
    setSelectedItems([]);
    setSelectedCategory(null);
    setItems([]); // Clear the available items list
    setWaitress("");
    setUserId("");
    setShowSubmitModal(false);
    setShowCancelModal(false);
    setShowQuantityModal(false);
    setCurrentItem(null);
    setItemError("");
    setFetchCategoryError("");
    setBillError(""); // Clear bill errors
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
    <div className="container-fluid p-0">
      {/* Main Content - Improved Layout */}
      <div className="row g-1">
        {/* Available Items Section */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-primary text-white py-0">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0 fw-bold">
                  <i className="bi bi-box-seam me-2"></i>
                  Available Items
                </h6>
                <div className="d-flex align-items-center gap-3">
                  <small className="text-white-50">
                    {items.length} items
                  </small>
                  <div className="d-flex align-items-center gap-2">
                    <StationStatus variant="minimal" />
                    <button
                      className={`btn btn-sm ${currentStation ? 'btn-success' : 'btn-light'} text-white`}
                      type="button"
                      onClick={() => setShowStationSelector(!showStationSelector)}
                      title={currentStation ? `Current: ${currentStation.name} - Click to change` : "Choose Station"}
                    >
                      <i className={`bi ${currentStation ? 'bi-arrow-repeat' : 'bi-gear'} me-1`}></i>
                      {currentStation ? 'Switch Station' : 'Choose Station'}
                    </button>
                    {createdBill && (
                      <button
                        className="btn btn-sm btn-warning text-dark fw-bold"
                        type="button"
                        onClick={handleNewBill}
                        title="Start a new bill"
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        New Bill
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Collapsible Station Selector */}
              {showStationSelector && (
                <div className="mt-2">
                  <div className="d-flex justify-content-end">
                    <div className="card border-0 bg-light shadow-sm" style={{ width: '300px' }}>
                      <div className="card-body py-1">
                        <StationSelector showLabel={false} size="sm" />
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
            <div className="card-body p-0">
              <ErrorDisplay
                error={itemError}
                onDismiss={() => setItemError("")}
              />
              <ErrorDisplay
                error={errorDetails?.message || null}
                errorDetails={errorDetails}
                onDismiss={() => setErrorDetails(null)}
              />
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

        {/* Billing Section - Improved */}
        <div className="col-lg-6">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-success text-white border-0 py-0">
              <div className="d-flex align-items-center justify-content-between">
                <h6 className="mb-0 fw-bold">
                  <i className="bi bi-receipt me-2"></i>
                  Current Bill
                </h6>
                <div className="d-flex align-items-center gap-3">
                  <small className="text-white-50">
                    {(createdBill ? createdBill.bill_items : selectedItems).length} items
                  </small>
                  {createdBill && (
                    <span className="badge bg-light text-success fw-bold">
                      #{createdBill.id}
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                  <thead className="table-light">
                    <tr>
                      <th className="border-0 fw-bold">Item</th>
                      <th className="border-0 text-center fw-bold">Qty</th>
                      <th className="border-0 text-end fw-bold">Price</th>
                      <th className="border-0 text-center fw-bold">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(createdBill ? createdBill.bill_items : selectedItems).length === 0 ? (
                      <tr>
                        <td colSpan={4} className="text-center text-muted py-4">
                          <i className="bi bi-cart-x fs-1 d-block mb-2 text-muted"></i>
                          <span className="fw-medium">No items in bill</span>
                        </td>
                      </tr>
                    ) : (
                      (createdBill ? createdBill.bill_items : selectedItems).map((item) => (
                        <tr key={item.id} className="align-middle">
                          <td className="fw-medium">{item.item?.name || item.name}</td>
                          <td className="text-center">
                            <span className="badge bg-primary rounded-pill">{item.quantity}</span>
                          </td>
                          <td className="text-end fw-bold text-success">
                            ${(item.subtotal || (item.price * item.quantity)).toFixed(2)}
                          </td>
                          <td className="text-center">
                            {!createdBill && (
                              <button
                                className="btn btn-outline-danger btn-sm"
                                onClick={() => handleRemoveItem(item.id)}
                                title="Remove item"
                                style={{
                                  minWidth: '32px',
                                  minHeight: '32px',
                                  padding: '0.375rem',
                                  borderWidth: '2px',
                                  backgroundColor: 'rgba(220, 53, 69, 0.1)',
                                  color: '#dc3545',
                                  fontWeight: '600',
                                  boxShadow: '0 2px 4px rgba(220, 53, 69, 0.2)',
                                  transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={(e) => {
                                  e.currentTarget.style.transform = 'scale(1.05)';
                                  e.currentTarget.style.backgroundColor = '#dc3545';
                                  e.currentTarget.style.color = 'white';
                                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(220, 53, 69, 0.3)';
                                }}
                                onMouseLeave={(e) => {
                                  e.currentTarget.style.transform = 'scale(1)';
                                  e.currentTarget.style.backgroundColor = 'rgba(220, 53, 69, 0.1)';
                                  e.currentTarget.style.color = '#dc3545';
                                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(220, 53, 69, 0.2)';
                                }}
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" className="bi bi-x-circle" viewBox="0 0 16 16">
                                  <path d="M8 15A7 7 0 1 1 8 1a7 7 0 0 1 0 14m0 1A8 8 0 1 0 8 0a8 8 0 0 0 0 16" />
                                  <path d="M4.646 4.646a.5.5 0 0 1 .708 0L8 7.293l2.646-2.647a.5.5 0 0 1 .708.708L8.707 8l2.647 2.646a.5.5 0 0 1-.708.708L8 8.707l-2.646 2.647a.5.5 0 0 1-.708-.708L7.293 8 4.646 5.354a.5.5 0 0 1 0-.708" />
                                </svg>
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
            <div className="card-footer bg-success text-white border-0 py-0" style={{ boxShadow: '0 -2px 4px rgba(0,0,0,0.1)' }}>
              <div className="row align-items-center">
                <div className="col-md-6">
                  <div className="d-flex flex-column">
                    <div className="h4 mb-0 fw-bold">
                      Total: ${createdBill && !isNaN(Number(createdBill.total))
                        ? Number(createdBill.total).toFixed(2)
                        : totalAmount.toFixed(2)
                      }
                    </div>
                    <small className="text-white-50">
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
                          variant="light"
                          size="sm"
                          onClick={handleShowSubmitModal}
                          disabled={selectedItems.length === 0 || !currentStation || isSubmitting}
                          className="px-3 fw-bold text-success border-0"
                          style={{ backgroundColor: 'rgba(255,255,255,0.9)' }}
                        >
                          {isSubmitting ? (
                            <>
                              <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                              Submitting...
                            </>
                          ) : (
                            <>
                              <i className="bi bi-check-circle me-1"></i>
                              Create Bill
                            </>
                          )}
                        </Button>
                        <Button
                          variant="outline-light"
                          size="sm"
                          onClick={handleShowCancelModal}
                          disabled={selectedItems.length === 0 || isSubmitting}
                          className="fw-bold px-2"
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Clear
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          variant="success"
                          size="sm"
                          onClick={handleNewBill}
                          className="me-1 fw-bold px-2"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            border: '2px solid rgba(255, 255, 255, 0.8)',
                            color: 'white',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          New Bill
                        </Button>
                        <Button
                          variant="light"
                          size="sm"
                          onClick={handlePrint}
                          className="me-1 fw-medium text-dark px-2"
                          style={{
                            backgroundColor: 'rgba(255, 255, 255, 0.9)',
                            border: '2px solid rgba(255, 255, 255, 0.8)',
                            boxShadow: '0 2px 4px rgba(0, 0, 0, 0.1)'
                          }}
                        >
                          <i className="bi bi-printer me-1"></i>
                          Print
                        </Button>
                        <Button
                          variant="outline-light"
                          size="sm"
                          onClick={handleDownload}
                          className="fw-medium px-2"
                          style={{
                            borderColor: 'rgba(255, 255, 255, 0.8)',
                            color: 'white',
                            backgroundColor: 'rgba(255, 255, 255, 0.1)'
                          }}
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

      {/* Categories Section - Improved */}
      <div className="row mt-1">
        <div className="col-12">
          <div className="card border-0 shadow-sm">
            <div className="card-body py-1">
              <div className="mb-1">
                <h5 className="mb-0 text-dark fw-bold d-flex align-items-center">
                  <i className="bi bi-grid me-2 text-primary"></i>
                  Item Categories
                </h5>
              </div>
              <Categories
                categories={categories}
                onCategoryClick={(category) => {
                  setSelectedCategory(category);
                  fetchItems(category.id);
                }}
                fetchError={fetchCategoryError}
                showHeader={false}
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

      {/* Submit Confirmation Modal - Simple Bill Creation */}
      <Modal show={showSubmitModal} onHide={handleCloseSubmitModal} centered>
        <Modal.Header closeButton className="bg-primary text-white">
          <Modal.Title className="fw-bold">Confirm Billing</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          {billError && (
            <div className="alert alert-danger mb-3" role="alert">
              <i className="bi bi-exclamation-triangle me-2"></i>
              {billError}
            </div>
          )}
          <div className="text-center">
            {isSubmitting ? (
              <>
                <div className="spinner-border text-primary mb-3" role="status" style={{ width: '3rem', height: '3rem' }}>
                  <span className="visually-hidden">Loading...</span>
                </div>
                <p className="fs-5 text-primary">Creating bill...</p>
                <p className="text-muted">Please wait while we process your order</p>
              </>
            ) : (
              <>
                <i className="bi bi-receipt fs-1 text-primary mb-3 d-block"></i>
                <p className="fs-5">Create bill with total amount:</p>
                <h3 className="text-success fw-bold">${totalAmount.toFixed(2)}</h3>
                <p className="text-muted">You can submit this bill for payment later in My Sales</p>
              </>
            )}
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button
            variant="outline-secondary"
            onClick={handleCloseSubmitModal}
            className="fw-medium"
            disabled={isSubmitting}
          >
            Cancel
          </Button>
          <Button
            variant="success"
            onClick={handleConfirmSubmit}
            className="fw-medium"
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Creating...
              </>
            ) : (
              <>
                <i className="bi bi-check-circle me-1"></i>
                Create Bill
              </>
            )}
          </Button>
        </Modal.Footer>
      </Modal>

      {/* Cancel Confirmation Modal */}
      <Modal show={showCancelModal} onHide={handleCloseCancelModal} centered>
        <Modal.Header closeButton className="bg-warning text-dark">
          <Modal.Title className="fw-bold">Cancel Billing</Modal.Title>
        </Modal.Header>
        <Modal.Body className="py-4">
          <div className="text-center">
            <i className="bi bi-exclamation-triangle fs-1 text-warning mb-3 d-block"></i>
            <p className="fs-5">Are you sure you want to clear all items from the bill?</p>
          </div>
        </Modal.Body>
        <Modal.Footer className="border-0">
          <Button variant="outline-secondary" onClick={handleCloseCancelModal} className="fw-medium">
            No, Keep Items
          </Button>
          <Button variant="danger" onClick={handleConfirmCancel} className="fw-medium">
            <i className="bi bi-trash me-1"></i>
            Yes, Clear All
          </Button>
        </Modal.Footer>
      </Modal>
    </div>
  );
};

export default BillingSection;
