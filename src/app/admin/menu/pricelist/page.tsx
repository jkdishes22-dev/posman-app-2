"use client";

import React, { useEffect, useState, useCallback } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import PricelistAdd from "./pricelist-new";
import ViewItems from "../category/components/items/items-view";
import ItemAdd from "../category/components/items/items-new";
import { Button, Form } from "react-bootstrap";
import { AuthError } from "src/app/types/types";
import ErrorDisplay from "../../../components/ErrorDisplay";
import PageHeaderStrip from "../../../components/PageHeaderStrip";
import ExpressItemSearchModal from "../../../components/ExpressItemSearchModal";
import PricelistUploadModal from "../../../components/PricelistUploadModal";
import PricelistAuditLog from "../../../components/PricelistAuditLog";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import { useTooltips } from "../../../hooks/useTooltips";

export default function PricelistPage() {
  useTooltips();
  const [showModal, setShowModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
  const [showExpressSearch, setShowExpressSearch] = useState(false);
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  interface Pricelist {
    id: number;
    name: string;
    status?: string;
    description?: string;
    station?: {
      id: number;
      name: string;
    };
  }
  interface Station {
    id: number;
    name: string;
    status: string;
  }
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [stationScopedPricelists, setStationScopedPricelists] = useState<Pricelist[]>([]);
  const [filteredPricelists, setFilteredPricelists] = useState<Pricelist[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState<{ type: "activate" | "deactivate", pricelistId: number, pricelistName: string } | null>(null);
  const [pricelistItems, setPricelistItems] = useState([]);
  const [selectedPricelistId, setSelectedPricelistId] = useState<number | null>(null);
  const [isRefreshingItems, setIsRefreshingItems] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [pricelistError, setFetchPricelistError] = useState<string | null>(null);
  const [addPricelistError, setAddPricelistError] = useState<string | null>(null);
  const [addPricelistErrorDetails, setAddPricelistErrorDetails] = useState<any>(null);
  const [itemError, setItemError] = useState<string>("");
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const apiCall = useApiCall();

  useEffect(() => {
    async function fetchPricelists() {
      try {
        const result = await apiCall("/api/menu/pricelists");
        if (result.status >= 200 && result.status < 300) {
          // Success - apiCall handles all 2XX codes
          setPricelists(result.data || []);
          setFilteredPricelists(result.data || []);
          setFetchPricelistError(null);
        } else {
          // Error - apiCall already standardizes all non-2XX errors
          setFetchPricelistError(result.error || "Failed to fetch pricelists");
          setErrorDetails(result.errorDetails);
        }
      } catch (error: any) {
        console.error("Failed to fetch pricelists", error);
        setFetchPricelistError("Failed to fetch pricelists: " + error.message);
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      }
    }

    async function fetchStations() {
      try {
        const result = await apiCall("/api/stations");
        if (result.status >= 200 && result.status < 300) {
          // Success - apiCall handles all 2XX codes
          setStations(result.data || []);
        } else {
          // Error - apiCall already standardizes all non-2XX errors
          console.error("Failed to fetch stations:", result.error);
        }
      } catch (error: any) {
        console.error("Failed to fetch stations", error);
      }
    }

    fetchPricelists();
    fetchStations();
  }, []);

  const fetchPricelistsForStation = useCallback(async (stationId: number) => {
    try {
      const result = await apiCall(`/api/stations/${stationId}/pricelists`);
      if (result.status >= 200 && result.status < 300) {
        setStationScopedPricelists(result.data?.pricelists || []);
        setFetchPricelistError(null);
      } else {
        // Error - apiCall already standardizes all non-2XX errors
        setFetchPricelistError(result.error || "Failed to fetch pricelists for station");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Failed to fetch pricelists for station", error);
      setFetchPricelistError("Failed to fetch pricelists for station: " + error.message);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  }, [apiCall]);

  useEffect(() => {
    if (selectedPricelistId) {
      fetchPricelistItems(selectedPricelistId);
      setCurrentPage(1); // Reset to first page when selecting new pricelist
    }
  }, [selectedPricelistId]);

  // Refresh station-scoped dataset when station filter changes
  useEffect(() => {
    setSelectedPricelistId(null);
    setPricelistItems([]);
    setItemError("");

    if (selectedStationId === null) {
      setStationScopedPricelists([]);
    } else {
      fetchPricelistsForStation(selectedStationId);
    }
  }, [selectedStationId, fetchPricelistsForStation]);

  // Apply status + search filters on whichever dataset is active
  useEffect(() => {
    const sourcePricelists =
      selectedStationId === null ? pricelists : stationScopedPricelists;
    let filtered = Array.isArray(sourcePricelists) ? [...sourcePricelists] : [];

    if (statusFilter !== "all") {
      filtered = filtered.filter(pricelist => pricelist.status === statusFilter);
    }

    const normalizedSearchTerm = searchTerm.trim().toLowerCase();
    if (normalizedSearchTerm.length > 0) {
      filtered = filtered.filter((pricelist) =>
        pricelist.name.toLowerCase().includes(normalizedSearchTerm)
      );
    }

    setFilteredPricelists(filtered);
  }, [pricelists, stationScopedPricelists, selectedStationId, statusFilter, searchTerm]);

  const fetchPricelistItems = async (pricelistId: number, forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshingItems(true);
    }

    try {
      const url = forceRefresh
        ? `/api/menu/pricelists/${pricelistId}/items?t=${Date.now()}`
        : `/api/menu/pricelists/${pricelistId}/items`;

      const result = await apiCall(url);

      if (result.status >= 200 && result.status < 300) {
        // Success - apiCall handles all 2XX codes
        setPricelistItems(result.data || []);
      } else {
        // Error - apiCall already standardizes all non-2XX errors
        console.error(`Failed to fetch pricelist items: ${result.error}`);
        setPricelistItems([]);
      }
    } catch (error: any) {
      console.error("Failed to fetch pricelist items", error);
      setPricelistItems([]);
    } finally {
      if (forceRefresh) {
        setIsRefreshingItems(false);
      }
    }
  };

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);
  const handleShowItemModal = () => setShowItemModal(true);
  const handleCloseItemModal = () => setShowItemModal(false);

  const handleStationFilterChange = (stationId: string) => {
    if (stationId === "") {
      setSelectedStationId(null);
    } else {
      setSelectedStationId(Number(stationId));
    }
  };

  interface PricelistParams {
    name: string;
    code?: string;
    station: string;
  }

  const handleAddPricelist = async ({ name, code, station }: PricelistParams) => {
    try {
      setAddPricelistError(null);
      setAddPricelistErrorDetails(null);
      const result = await apiCall("/api/menu/pricelists", {
        method: "POST",
        body: JSON.stringify({ name, code, description: "", station }),
      });

      if (result.status >= 200 && result.status < 300) {
        // Success - apiCall handles all 2XX codes (200, 201, etc.)
        setPricelists([...pricelists, result.data]);
        handleCloseModal();
        setAddPricelistError(null);
        setAddPricelistErrorDetails(null);
      } else {
        // Error - apiCall already standardizes all non-2XX errors
        setAddPricelistError(result.error || "Failed to add pricelist");
        setAddPricelistErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      console.error("Failed to add pricelist", error);
      setAddPricelistError("Failed to add pricelist: " + error.message);
      setAddPricelistErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  const handleAddItem = async (itemData: any) => {
    try {
      setItemError("");
      const result = await apiCall("/api/menu/items", {
        method: "POST",
        body: JSON.stringify(itemData),
      });

      if (result.status >= 200 && result.status < 300) {
        // Success - apiCall handles all 2XX codes (200, 201, etc.)
        // Refresh pricelist items if a pricelist is selected
        if (selectedPricelistId) {
          // Delay to ensure database transaction is committed
          setTimeout(async () => {
            try {
              await fetchPricelistItems(selectedPricelistId, true); // Force refresh
            } catch (error) {
              console.error("Error refreshing pricelist items:", error);
            }
          }, 500); // Increased delay
        }
        handleCloseItemModal();
        setItemError("");
      } else {
        // Error - apiCall already standardizes all non-2XX errors
        setItemError(result.error || "Failed to add item");
      }
    } catch (error: any) {
      console.error("Failed to add item", error);
      setItemError("Failed to add item: " + error.message);
    }
  };

  const handleDeleteItem = async (itemId: number) => {
    if (!selectedPricelistId) {
      setItemError("No pricelist selected");
      return;
    }

    try {
      setItemError("");
      // Delete item from pricelist by disabling the pricelist_item relationship
      const result = await apiCall(`/api/menu/pricelists/${selectedPricelistId}/items/${itemId}`, {
        method: "DELETE",
      });

      if (result.status >= 200 && result.status < 300) {
        // Success - refresh pricelist items
        await fetchPricelistItems(selectedPricelistId, true);
        setItemError("");
      } else {
        // Error - apiCall already standardizes all non-2XX errors
        setItemError(result.error || "Failed to delete item from pricelist");
      }
    } catch (error: any) {
      console.error("Failed to delete item from pricelist", error);
      setItemError("Failed to delete item: " + error.message);
    }
  };

  const handleTogglePricelistStatus = (pricelistId: number, currentStatus: string, pricelistName: string) => {
    const action = currentStatus === "active" ? "deactivate" : "activate";
    setConfirmAction({ type: action, pricelistId, pricelistName });
    setShowConfirmModal(true);
  };

  const confirmTogglePricelistStatus = async () => {
    if (!confirmAction) return;

    try {
      const result = await apiCall(`/api/menu/pricelists/${confirmAction.pricelistId}/status`, {
        method: "PATCH",
        body: JSON.stringify({ action: confirmAction.type }),
      });

      if (result.status >= 200 && result.status < 300) {
        // Success - apiCall handles all 2XX codes
        console.log("Pricelist status updated successfully, refreshing data...");
        // Refresh pricelists list
        const refreshResult = await apiCall("/api/menu/pricelists");
        console.log("Refreshed pricelists data:", refreshResult.data);
        if (refreshResult.status >= 200 && refreshResult.status < 300) {
          // Success - apiCall handles all 2XX codes
          setPricelists(refreshResult.data || []);
          // Don't set filteredPricelists here - let the useEffect handle it
          // This ensures proper filtering by both station and status
          console.log("Pricelists updated, useEffect will handle filtering");
        } else {
          // Error - apiCall already standardizes all non-2XX errors
          console.error("Failed to refresh pricelists:", refreshResult.error);
        }
        setShowConfirmModal(false);
        setConfirmAction(null);
        setFetchPricelistError(null);
      } else {
        // Error - apiCall already standardizes all non-2XX errors
        setFetchPricelistError(result.error || `Failed to ${confirmAction.type} pricelist`);
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setFetchPricelistError(error.message || `Error ${confirmAction.type === "activate" ? "activating" : "deactivating"} pricelist`);
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    }
  };

  // Pagination logic
  const totalPages = Math.ceil(pricelistItems.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = pricelistItems.slice(startIndex, endIndex);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        <PageHeaderStrip
          actions={
            <button
              type="button"
              onClick={() => setShowExpressSearch(true)}
              className="btn btn-outline-light btn-sm"
              data-bs-toggle="tooltip"
              data-bs-placement="bottom"
              title="Search for items across all pricelists"
            >
              <i className="bi bi-lightning me-1"></i>
              Pricelist Item Quick Search
            </button>
          }
        >
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-tags me-2" aria-hidden></i>
            Pricelist Management
            <i
              className="bi bi-question-circle ms-2"
              style={{ cursor: "help", fontSize: "0.9rem" }}
              data-bs-toggle="tooltip"
              data-bs-placement="bottom"
              title="Configure pricing for different stations or customer groups"
            ></i>
          </h1>
        </PageHeaderStrip>

        {/* Error Display */}
        <ErrorDisplay
          error={pricelistError}
          onDismiss={() => setFetchPricelistError(null)}
        />
        <ErrorDisplay
          error={errorDetails?.message || null}
          errorDetails={errorDetails}
          onDismiss={() => setErrorDetails(null)}
        />



        {/* Main Content */}
        <div className="row g-2">
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
                    onClick={handleShowModal}
                  >
                    <i className="bi bi-plus-circle me-1"></i>
                    Add Pricelist
                  </Button>
                </div>
              </div>
              <div className="card-body p-0">
                <div className="p-3 border-bottom">
                  <div className="row g-3 align-items-end">
                    <div className="col-12 col-sm-6 col-xl-4">
                      <Form.Label className="fw-semibold small mb-1 d-block">
                        <i className="bi bi-building me-1 text-primary"></i>
                        Station
                      </Form.Label>
                      <Form.Select
                        value={selectedStationId || ""}
                        onChange={(e) => setSelectedStationId(e.target.value ? Number(e.target.value) : null)}
                        size="sm"
                        className="w-100"
                      >
                        <option value="">All Stations</option>
                        {stations.map((station) => (
                          <option key={station.id} value={station.id}>
                            {station.name}
                          </option>
                        ))}
                      </Form.Select>
                    </div>
                    <div className="col-12 col-sm-6 col-xl-4">
                      <Form.Label className="fw-semibold small mb-1 d-block">
                        <i className="bi bi-funnel me-1 text-primary"></i>
                        Status
                      </Form.Label>
                      <Form.Select
                        value={statusFilter}
                        onChange={(e) => setStatusFilter(e.target.value)}
                        size="sm"
                        className="w-100"
                      >
                        <option value="all">All Status</option>
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                      </Form.Select>
                    </div>
                    <div className="col-12 col-xl-4 d-flex justify-content-xl-end pb-1">
                      {(selectedStationId || statusFilter !== "all" || searchTerm.trim().length > 0) && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          className="w-100 d-xl-inline-block"
                          onClick={() => {
                            setSelectedStationId(null);
                            setStatusFilter("all");
                            setSearchTerm("");
                          }}
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Clear filters
                        </Button>
                      )}
                    </div>
                  </div>
                  <div className="row g-3 mt-1">
                    <div className="col-12">
                      <Form.Label className="fw-semibold small mb-1 d-block">
                        <i className="bi bi-search me-1 text-primary"></i>
                        Search
                      </Form.Label>
                      <Form.Control
                        type="text"
                        size="sm"
                        className="w-100"
                        placeholder="Search by pricelist name..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
                <div className="table-responsive" style={{ maxHeight: "400px", overflowY: "auto" }}>
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="fw-semibold">#</th>
                        <th className="fw-semibold">Name</th>
                        <th className="fw-semibold text-center">Status</th>
                        <th className="fw-semibold text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(filteredPricelists) && filteredPricelists.map((pricelist, index) => (
                        <tr
                          key={pricelist.id}
                          onClick={() => setSelectedPricelistId(pricelist.id)}
                          style={{ cursor: "pointer" }}
                          className={selectedPricelistId === pricelist.id ? "table-primary" : ""}
                        >
                          <td className="fw-medium">{index + 1}</td>
                          <td>{pricelist.name}</td>
                          <td className="text-center">
                            <span className={`badge ${pricelist.status === "active" ? "bg-success" : "bg-secondary"}`}>
                              {pricelist.status === "active" ? "Active" : "Inactive"}
                            </span>
                          </td>
                          <td className="text-center">
                            {(!pricelist.status || pricelist.status === "inactive") && (
                              <Button
                                variant="outline-success"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePricelistStatus(pricelist.id, pricelist.status || "inactive", pricelist.name);
                                }}
                              >
                                <i className="bi bi-play-circle me-1"></i>
                                Activate
                              </Button>
                            )}
                            {pricelist.status === "active" && (
                              <Button
                                variant="outline-danger"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleTogglePricelistStatus(pricelist.id, pricelist.status, pricelist.name);
                                }}
                              >
                                <i className="bi bi-pause-circle me-1"></i>
                                Deactivate
                              </Button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
          <div className="col-12 col-lg-8">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-box-seam me-2 text-primary"></i>
                    {selectedPricelistId ? (
                      <>
                        <span className="fw-normal text-muted me-2">Selected pricelist:</span>
                        {filteredPricelists.find(p => p.id === selectedPricelistId)?.name || "Unknown"}
                      </>
                    ) : (
                      "Items"
                    )}
                  </h5>
                  {selectedPricelistId && (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleShowItemModal}
                        disabled={filteredPricelists.find(p => p.id === selectedPricelistId)?.status === "inactive"}
                        title={filteredPricelists.find(p => p.id === selectedPricelistId)?.status === "inactive" ? "Cannot add items to inactive pricelist" : ""}
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        Add Item
                      </button>
                      <button
                        className="btn btn-success btn-sm"
                        onClick={() => setShowUploadModal(true)}
                        disabled={filteredPricelists.find(p => p.id === selectedPricelistId)?.status === "inactive"}
                        title={filteredPricelists.find(p => p.id === selectedPricelistId)?.status === "inactive" ? "Cannot upload items to inactive pricelist" : "Upload items from CSV/Excel"}
                      >
                        <i className="bi bi-upload me-1"></i>
                        Upload
                      </button>
                      <button
                        className="btn btn-info btn-sm"
                        onClick={() => setShowAuditModal(true)}
                        title="View audit log"
                      >
                        <i className="bi bi-clock-history me-1"></i>
                        Audit Log
                      </button>
                      <button
                        className="btn btn-outline-secondary btn-sm"
                        onClick={() => fetchPricelistItems(selectedPricelistId, true)}
                        title="Refresh items"
                        disabled={isRefreshingItems}
                      >
                        {isRefreshingItems ? (
                          <>
                            <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                            Refreshing...
                          </>
                        ) : (
                          <>
                            <i className="bi bi-arrow-clockwise me-1"></i>
                            Refresh
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <div className="card-body">
                {selectedPricelistId && filteredPricelists.find(p => p.id === selectedPricelistId)?.status === "inactive" && (
                  <div className="alert alert-warning alert-sm mb-3" role="alert">
                    <i className="bi bi-exclamation-triangle me-1"></i>
                    <strong>Pricelist Inactive:</strong> Cannot add or manage items on inactive pricelists.
                  </div>
                )}
                <ViewItems
                  selectedCategory={null}
                  items={[]}
                  pricelistItems={paginatedItems}
                  itemError={itemError}
                  setItems={setPricelistItems}
                  onItemPick={() => { }}
                  isBillingSection={false}
                  isPricelistSection={true}
                  isCategoryItemsSection={false}
                  handleDeleteItem={handleDeleteItem}
                  onItemUpdated={() => {
                    if (selectedPricelistId) {
                      fetchPricelistItems(selectedPricelistId, true);
                    }
                  }}
                />

                {/* Pagination Controls */}
                {pricelistItems.length > itemsPerPage && (
                  <div className="d-flex justify-content-between align-items-center mt-3 pt-3 border-top">
                    <div className="text-muted">
                      Showing {startIndex + 1} to {Math.min(endIndex, pricelistItems.length)} of {pricelistItems.length} items
                    </div>
                    <nav aria-label="Pricelist items pagination">
                      <ul className="pagination pagination-sm mb-0">
                        <li className={`page-item ${currentPage === 1 ? "disabled" : ""}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(currentPage - 1)}
                            disabled={currentPage === 1}
                          >
                            Previous
                          </button>
                        </li>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                          <li key={page} className={`page-item ${currentPage === page ? "active" : ""}`}>
                            <button
                              className="page-link"
                              onClick={() => handlePageChange(page)}
                            >
                              {page}
                            </button>
                          </li>
                        ))}
                        <li className={`page-item ${currentPage === totalPages ? "disabled" : ""}`}>
                          <button
                            className="page-link"
                            onClick={() => handlePageChange(currentPage + 1)}
                            disabled={currentPage === totalPages}
                          >
                            Next
                          </button>
                        </li>
                      </ul>
                    </nav>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <PricelistAdd
          showModal={showModal}
          handleCloseModal={handleCloseModal}
          handleAddPricelist={handleAddPricelist}
          addPricelistError={addPricelistError}
          setAddPricelistError={setAddPricelistError}
          addPricelistErrorDetails={addPricelistErrorDetails}
          setAddPricelistErrorDetails={setAddPricelistErrorDetails}
        />

        <ItemAdd
          showModal={showItemModal}
          handleModalClose={handleCloseItemModal}
          handleAddItem={handleAddItem}
          itemError={itemError}
          setItemError={setItemError}
          selectedCategory={null}
          selectedPricelistId={selectedPricelistId}
        />

        <ExpressItemSearchModal
          show={showExpressSearch}
          onHide={() => setShowExpressSearch(false)}
          onPricelistSelect={(pricelistId, pricelistName) => {
            console.log("Express search selected pricelist:", pricelistId, pricelistName);
            setSelectedPricelistId(pricelistId);
            setShowExpressSearch(false);
          }}
          onItemSelect={(item) => {
            console.log("Express search selected item:", item);
            // You can add logic here to show the item in the current view
          }}
        />
        {selectedPricelistId && (
          <>
            <PricelistUploadModal
              pricelistId={selectedPricelistId}
              show={showUploadModal}
              onHide={() => setShowUploadModal(false)}
              onUploadComplete={() => {
                if (selectedPricelistId) {
                  fetchPricelistItems(selectedPricelistId, true);
                }
              }}
            />
            <PricelistAuditLog
              pricelistId={selectedPricelistId}
              show={showAuditModal}
              onHide={() => setShowAuditModal(false)}
            />
          </>
        )}

        {/* Confirmation Modal */}
        {showConfirmModal && confirmAction && (
          <div className="modal show d-block" style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content">
                <div className="modal-header">
                  <h5 className="modal-title">
                    <i className={`bi ${confirmAction.type === "activate" ? "bi-play-circle text-success" : "bi-pause-circle text-danger"} me-2`}></i>
                    {confirmAction.type === "activate" ? "Activate" : "Deactivate"} Pricelist
                  </h5>
                  <button
                    type="button"
                    className="btn-close"
                    onClick={() => {
                      setShowConfirmModal(false);
                      setConfirmAction(null);
                    }}
                  ></button>
                </div>
                <div className="modal-body">
                  <p>
                    Are you sure you want to <strong>{confirmAction.type}</strong> the pricelist
                    <strong> "{confirmAction.pricelistName}"</strong>?
                  </p>
                  {confirmAction.type === "deactivate" && (
                    <div className="alert alert-warning" role="alert">
                      <i className="bi bi-exclamation-triangle me-2"></i>
                      <strong>Warning:</strong> Deactivating this pricelist will prevent adding items to it and will disable all related operations.
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setShowConfirmModal(false);
                      setConfirmAction(null);
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    className={`btn ${confirmAction.type === "activate" ? "btn-success" : "btn-danger"}`}
                    onClick={confirmTogglePricelistStatus}
                  >
                    <i className={`bi ${confirmAction.type === "activate" ? "bi-play-circle" : "bi-pause-circle"} me-1`}></i>
                    {confirmAction.type === "activate" ? "Activate" : "Deactivate"} Pricelist
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
