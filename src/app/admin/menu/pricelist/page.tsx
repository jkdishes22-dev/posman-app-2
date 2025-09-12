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
      <div className="row">
        <div className="col-4">
          <button onClick={handleShowModal} className="btn btn-primary">
            Add Pricelist
          </button>
          <PricelistAdd
            showModal={showModal}
            handleCloseModal={handleCloseModal}
            handleAddPricelist={handleAddPricelist}
            addPricelistError={addPricelistError}
            setAddPricelistError={setAddPricelistError}
            addPricelistErrorDetails={addPricelistErrorDetails}
            setAddPricelistErrorDetails={setAddPricelistErrorDetails}
          />
          <ErrorDisplay
            error={pricelistError}
            onDismiss={() => setFetchPricelistError(null)}
          />
          <table className="table table-striped mt-3">
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {pricelists.map((pricelist) => (
                <tr
                  key={pricelist.id}
                  onClick={() => setSelectedPricelistId(pricelist.id)}
                >
                  <td>{pricelist.id}</td>
                  <td>{pricelist.name}</td>
                  <td>
                    {(!pricelist.status || pricelist.status === "inactive") && (
                      <Button variant="success" className="w-8">
                        Enable
                      </Button>
                    )}
                    {pricelist.status === "active" && (
                      <Button variant="danger" className="w-8">
                        Disable
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="col-8">
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
    </AdminLayout>
  );
}
