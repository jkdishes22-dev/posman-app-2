"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "../../../shared/AdminLayout";
import PricelistAdd from "./pricelist-new";
import ViewItems from "../category/components/items/items-view";
import ItemAdd from "../category/components/items/items-new";
import { Button, Form } from "react-bootstrap";
import { AuthError } from "src/app/types/types";
import ErrorDisplay from "../../../components/ErrorDisplay";

export default function PricelistPage() {
  const [showModal, setShowModal] = useState(false);
  const [showItemModal, setShowItemModal] = useState(false);
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
  const [filteredPricelists, setFilteredPricelists] = useState<Pricelist[]>([]);
  const [stations, setStations] = useState<Station[]>([]);
  const [selectedStationId, setSelectedStationId] = useState<number | null>(null);
  const [pricelistItems, setPricelistItems] = useState([]);
  const [selectedPricelistId, setSelectedPricelistId] = useState<number | null>(null);
  const [isRefreshingItems, setIsRefreshingItems] = useState(false);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [pricelistError, setFetchPricelistError] = useState<string | null>(null);
  const [addPricelistError, setAddPricelistError] = useState<string | null>(null);
  const [addPricelistErrorDetails, setAddPricelistErrorDetails] = useState<any>(null);
  const [itemError, setItemError] = useState<string>("");

  useEffect(() => {
    async function fetchPricelists() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/pricelists", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setPricelists(data);
          setFilteredPricelists(data);
          setFetchPricelistError(null);
        } else if (response.status === 403) {
          setAuthError(data);
          setFetchPricelistError(null);
        } else {
          setFetchPricelistError(data.message || "Failed to fetch pricelists");
        }
      } catch (error: any) {
        console.error("Failed to fetch pricelists", error);
        setFetchPricelistError("Failed to fetch pricelists: " + error.message);
      }
    }

    async function fetchStations() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/stations", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setStations(data);
        }
      } catch (error: any) {
        console.error("Failed to fetch stations", error);
      }
    }

    fetchPricelists();
    fetchStations();
  }, []);

  useEffect(() => {
    if (selectedPricelistId) {
      fetchPricelistItems(selectedPricelistId);
    }
  }, [selectedPricelistId]);

  // Filter pricelists when station filter changes
  useEffect(() => {
    if (selectedStationId === null) {
      // Show all pricelists when no filter is selected
      setFilteredPricelists(pricelists);
    } else {
      // Filter pricelists by selected station
      const filtered = pricelists.filter(pricelist =>
        pricelist.station && pricelist.station.id === selectedStationId
      );
      setFilteredPricelists(filtered);
    }
  }, [selectedStationId, pricelists]);

  const fetchPricelistItems = async (pricelistId: number, forceRefresh = false) => {
    if (forceRefresh) {
      setIsRefreshingItems(true);
    }

    try {
      const token = localStorage.getItem("token");
      const url = forceRefresh
        ? `/api/menu/pricelists/${pricelistId}/items?t=${Date.now()}`
        : `/api/menu/pricelists/${pricelistId}/items`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          ...(forceRefresh && { "Cache-Control": "no-cache" }),
        },
      });

      console.log(`Fetching pricelist items for ID ${pricelistId}:`, response.status);

      if (response.ok) {
        const pricelistItems = await response.json();
        console.log(`Loaded ${pricelistItems.length} items for pricelist ${pricelistId}:`, pricelistItems);
        setPricelistItems(pricelistItems);
      } else {
        console.error(`Failed to fetch pricelist items: ${response.status}`);
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
    description: string;
    station: string;
  }

  const handleAddPricelist = async ({ name, description, station }: PricelistParams) => {
    try {
      setAddPricelistError(null);
      setAddPricelistErrorDetails(null);
      const token = localStorage.getItem("token");
      const response = await fetch("/api/menu/pricelists", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, description, station }),
      });

      const data = await response.json();

      if (response.ok) {
        setPricelists([...pricelists, data]);
        handleCloseModal();
        setAddPricelistError(null);
        setAddPricelistErrorDetails(null);
      } else if (response.status === 403) {
        setAddPricelistError(data.message || "Access denied: You don't have permission to add pricelists");
        setAddPricelistErrorDetails({
          missingPermissions: data.missingPermissions,
          isAdmin: data.isAdmin,
          userRoles: data.userRoles,
          requiredPermissions: data.requiredPermissions
        });
      } else {
        setAddPricelistError(data.message || data.error || "Failed to add pricelist");
        setAddPricelistErrorDetails(null);
      }
    } catch (error: any) {
      console.error("Failed to add pricelist", error);
      setAddPricelistError("Failed to add pricelist: " + error.message);
      setAddPricelistErrorDetails(null);
    }
  };

  const handleAddItem = async (itemData: any) => {
    try {
      setItemError("");
      const token = localStorage.getItem("token");
      const response = await fetch("/api/menu/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(itemData),
      });

      const data = await response.json();

      if (response.ok) {
        console.log("Item added successfully, refreshing pricelist items...");
        // Refresh pricelist items if a pricelist is selected
        if (selectedPricelistId) {
          // Delay to ensure database transaction is committed
          setTimeout(async () => {
            try {
              console.log(`Refreshing items for pricelist ${selectedPricelistId}...`);
              await fetchPricelistItems(selectedPricelistId, true); // Force refresh
            } catch (error) {
              console.error("Error refreshing pricelist items:", error);
            }
          }, 500); // Increased delay
        }
        handleCloseItemModal();
        setItemError("");
      } else if (response.status === 403) {
        setItemError(data.message || "Access denied: You don't have permission to add items");
      } else {
        setItemError(data.message || data.error || "Failed to add item");
      }
    } catch (error: any) {
      console.error("Failed to add item", error);
      setItemError("Failed to add item: " + error.message);
    }
  };

  return (
    <AdminLayout authError={authError}>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <div className="d-flex justify-content-between align-items-center">
            <h1 className="h4 mb-0 fw-bold">
              <i className="bi bi-tags me-2"></i>
              Pricelist Management
            </h1>
            <button onClick={handleShowModal} className="btn btn-light btn-sm">
              <i className="bi bi-plus-circle me-1"></i>
              Add Pricelist
            </button>
          </div>
        </div>

        {/* Error Display */}
        <ErrorDisplay
          error={pricelistError}
          onDismiss={() => setFetchPricelistError(null)}
        />

        {/* Station Filter */}
        <div className="row mb-3">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-body">
                <div className="row align-items-center">
                  <div className="col-md-4">
                    <Form.Label className="fw-semibold">
                      <i className="bi bi-funnel me-2 text-primary"></i>
                      Filter by Station
                    </Form.Label>
                    <Form.Select
                      value={selectedStationId || ""}
                      onChange={(e) => handleStationFilterChange(e.target.value)}
                      className="form-control-lg"
                    >
                      <option value="">All Stations</option>
                      {stations.map((station) => (
                        <option key={station.id} value={station.id}>
                          {station.name}
                        </option>
                      ))}
                    </Form.Select>
                  </div>
                  <div className="col-md-8">
                    <div className="d-flex align-items-center gap-3">
                      <div className="text-muted">
                        <i className="bi bi-info-circle me-1"></i>
                        Showing {filteredPricelists.length} pricelist{filteredPricelists.length !== 1 ? 's' : ''}
                        {selectedStationId && (
                          <span className="ms-2">
                            for <strong>{stations.find(s => s.id === selectedStationId)?.name}</strong>
                          </span>
                        )}
                      </div>
                      {selectedStationId && (
                        <Button
                          variant="outline-secondary"
                          size="sm"
                          onClick={() => setSelectedStationId(null)}
                        >
                          <i className="bi bi-x-circle me-1"></i>
                          Clear Filter
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="row g-4">
          <div className="col-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-list-ul me-2 text-primary"></i>
                  Pricelists
                </h5>
              </div>
              <div className="card-body p-0">
                <div className="table-responsive">
                  <table className="table table-hover mb-0">
                    <thead className="table-light">
                      <tr>
                        <th className="fw-semibold">ID</th>
                        <th className="fw-semibold">Name</th>
                        <th className="fw-semibold">Station</th>
                        <th className="fw-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(filteredPricelists) && filteredPricelists.map((pricelist) => (
                        <tr
                          key={pricelist.id}
                          onClick={() => setSelectedPricelistId(pricelist.id)}
                          style={{ cursor: 'pointer' }}
                          className={selectedPricelistId === pricelist.id ? 'table-primary' : ''}
                        >
                          <td>{pricelist.id}</td>
                          <td>{pricelist.name}</td>
                          <td>
                            {pricelist.station ? (
                              <span className="badge bg-info text-dark">
                                <i className="bi bi-hdd me-1"></i>
                                {pricelist.station.name}
                              </span>
                            ) : (
                              <span className="text-muted">No station</span>
                            )}
                          </td>
                          <td className="text-center">
                            {(!pricelist.status || pricelist.status === "inactive") && (
                              <Button variant="success" size="sm">
                                Enable
                              </Button>
                            )}
                            {pricelist.status === "active" && (
                              <Button variant="danger" size="sm">
                                Disable
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
          <div className="col-8">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-box-seam me-2 text-primary"></i>
                    {selectedPricelistId ?
                      `Items - ${filteredPricelists.find(p => p.id === selectedPricelistId)?.name || 'Unknown'}` :
                      'Items'
                    }
                  </h5>
                  {selectedPricelistId && (
                    <div className="d-flex gap-2">
                      <button
                        className="btn btn-primary btn-sm"
                        onClick={handleShowItemModal}
                      >
                        <i className="bi bi-plus-circle me-1"></i>
                        Add Item
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
                <ViewItems
                  selectedCategory={null}
                  items={[]}
                  pricelistItems={pricelistItems}
                  itemError={itemError}
                  setItems={setPricelistItems}
                  onItemPick={(item) => console.log("Picked item", item)}
                  isBillingSection={false}
                  isPricelistSection={true}
                  isCategoryItemsSection={false}
                />
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
      </div>
    </AdminLayout>
  );
}
