"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "../../../shared/AdminLayout";
import PricelistAdd from "./pricelist-new";
import ViewItems from "../category/components/items/items-view";
import { Button } from "react-bootstrap";
import { AuthError } from "src/app/types/types";
import ErrorDisplay from "../../../components/ErrorDisplay";

export default function PricelistPage() {
  const [showModal, setShowModal] = useState(false);
  interface Pricelist {
    id: number;
    name: string;
    status?: string;
    description?: string;
    station?: string;
  }
  const [pricelists, setPricelists] = useState<Pricelist[]>([]);
  const [pricelistItems, setPricelistItems] = useState([]);
  const [selectedPricelistId, setSelectedPricelistId] = useState<number | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [pricelistError, setFetchPricelistError] = useState<string | null>(null);
  const [addPricelistError, setAddPricelistError] = useState<string | null>(null);
  const [addPricelistErrorDetails, setAddPricelistErrorDetails] = useState<any>(null);

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

    fetchPricelists();
  }, []);

  useEffect(() => {
    if (selectedPricelistId) {
      fetchPricelistItems(selectedPricelistId);
    }
  }, [selectedPricelistId]);

  const fetchPricelistItems = async (pricelistId: number) => {
    try {
      const token = localStorage.getItem("token");
      const response = await fetch(
        `/api/menu/pricelists/${pricelistId}/items`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        },
      );
      const pricelistItems = await response.json();
      setPricelistItems(response.ok ? pricelistItems : []);
    } catch (error: any) {
      console.error("Failed to fetch pricelist items", error);
    }
  };

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

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
                        <th className="fw-semibold text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {Array.isArray(pricelists) && pricelists.map((pricelist) => (
                        <tr
                          key={pricelist.id}
                          onClick={() => setSelectedPricelistId(pricelist.id)}
                          style={{ cursor: 'pointer' }}
                          className={selectedPricelistId === pricelist.id ? 'table-primary' : ''}
                        >
                          <td>{pricelist.id}</td>
                          <td>{pricelist.name}</td>
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
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-box-seam me-2 text-primary"></i>
                  Pricelist Items
                </h5>
              </div>
              <div className="card-body">
                <ViewItems
                  selectedCategory={null}
                  items={[]}
                  pricelistItems={pricelistItems}
                  itemError=""
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
      </div>
    </AdminLayout>
  );
}
