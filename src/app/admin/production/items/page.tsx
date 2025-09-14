"use client";

import React, { useEffect, useState } from "react";
import AdminLayout from "src/app/shared/AdminLayout";
import { Button } from "react-bootstrap";
import AuditLog from "../activity-log";
import InventoryModal from "./new";
import { InventoryItem } from "src/app/types/types";

export default function InventoryPage() {
  const [showModal, setShowModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [fetchError, setFetchError] = useState(null);

  useEffect(() => {
    async function fetchInventoryItems() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/production", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        const data = await response.json();
        if (response.ok) {
          setInventoryItems(data);
        } else if (response.status === 403) {
          setAuthError(data);
        } else {
          setFetchError(data);
        }
      } catch (error: any) {
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
      const token = localStorage.getItem("token");
      const response = await fetch("/api/production", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name, code, isStock }),
      });
      if (response.ok) {
        const newItem = await response.json();
        setInventoryItems([...inventoryItems, newItem]);
        handleCloseModal();
      } else {
        console.error("Failed to add inventory item");
      }
    } catch (error: any) {
      console.error("Failed to add inventory item", error);
    }
  };

  return (
    <AdminLayout authError={authError}>
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
          {fetchError ? (
            <div className="alert alert-danger mt-3" role="alert">
              Failed to fetch inventory items: {fetchError}
            </div>
          ) : (
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
    </AdminLayout>
  );
}
