"use client";

import React, { useEffect, useState } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import { Button } from "react-bootstrap";
import AuditLog from "../activity-log";
import InventoryModal from "./new";
import { InventoryItem } from "src/app/types/types";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";

export default function InventoryPage() {
  const [showModal, setShowModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  const apiCall = useApiCall();

  useEffect(() => {
    async function fetchInventoryItems() {
      try {
        setFetchError(null);
        setErrorDetails(null);

        const result = await apiCall("/api/production");
        if (result.status === 200) {
          setInventoryItems(result.data);
        } else {
          setFetchError(result.error || "Failed to fetch inventory items");
          setErrorDetails(result.errorDetails);
        }
      } catch (error: any) {
        setFetchError("Network error occurred");
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      }
    }

    fetchInventoryItems();
  }, [apiCall]);

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
      if (result.status === 200) {
        setInventoryItems([...inventoryItems, result.data]);
        handleCloseModal();
      } else {
        setFetchError(result.error || "Failed to add inventory item");
        setErrorDetails(result.errorDetails);
      }
    } catch (error: any) {
      setFetchError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
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
            errorDetails={errorDetails}
            onDismiss={() => {
              setFetchError(null);
              setErrorDetails(null);
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
