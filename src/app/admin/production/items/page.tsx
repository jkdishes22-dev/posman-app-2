"use client";

import React, { useEffect, useState } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import { Button } from "react-bootstrap";
import AuditLog from "../activity-log";
import InventoryModal from "./new";
import { InventoryItem } from "src/app/types/types";
import { useApiCall } from "../../../utils/apiUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";

export default function InventoryPage() {
  const apiCall = useApiCall();
  const [showModal, setShowModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [authErrorDetails, setAuthErrorDetails] = useState(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [fetchErrorDetails, setFetchErrorDetails] = useState(null);

  useEffect(() => {
    async function fetchInventoryItems() {
      try {
        const result = await apiCall("/api/production");
        if (result.status === 200) {
          setInventoryItems(result.data);
          setAuthError(null);
          setAuthErrorDetails(null);
          setFetchError(null);
          setFetchErrorDetails(null);
        } else {
          setAuthError(result.data);
          setAuthErrorDetails(result.errorDetails);
          setFetchError(result.error || "Failed to fetch inventory items");
          setFetchErrorDetails(result.errorDetails);
        }
      } catch (error: any) {
        setFetchError("Network error occurred");
        setFetchErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        console.error("Failed to fetch inventory items", error);
      }
    }

    fetchInventoryItems();
  }, []);

  useEffect(() => {
    if (selectedItemId) {
      // fetchInventoryItems(selectedItemId);
    }
  }, [selectedItemId]);

  const handleShowModal = () => setShowModal(true);
  const handleCloseModal = () => setShowModal(false);

  const handleAddInventoryItem = async ({
    name,
    code,
    isStock,
  }: InventoryItem) => {
    try {
      const result = await apiCall("/api/production", {
        method: "POST",
        body: JSON.stringify({ name, code, isStock }),
      });
      if (result.status === 200 || result.status === 201) {
        setInventoryItems([...inventoryItems, result.data]);
        handleCloseModal();
      } else {
        console.error("Failed to add inventory item:", result.error);
      }
    } catch (error: any) {
      console.error("Failed to add inventory item", error);
    }
  };

  return (
    <RoleAwareLayout>
      <div className="row mt-2">
        <div className="col-4">
          <Button onClick={handleShowModal} className="btn btn-primary">
            Create Stock Item
          </Button>
          <InventoryModal
            showModal={showModal}
            handleCloseModal={handleCloseModal}
            handleAddInventoryItem={handleAddInventoryItem}
          />
          <ErrorDisplay
            error={fetchError}
            errorDetails={fetchErrorDetails}
            onDismiss={() => {
              setFetchError(null);
              setFetchErrorDetails(null);
            }}
          />
          {!fetchError && (
            <table className="table table-striped mt-3">
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
                  <tr key={item.id} onClick={() => setSelectedItemId(item.id)}>
                    <td>{item.id}</td>
                    <td>{item.name}</td>
                    <td>{item.code}</td>
                    <td>{item.isStock}</td>
                    <td>
                      <Button
                        variant="secondary"
                        className="w-8"
                        onClick={() => { }}
                      >
                        Adjust Stock
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="col-8">
          <AuditLog />
        </div>
      </div>
    </RoleAwareLayout>
  );
}
