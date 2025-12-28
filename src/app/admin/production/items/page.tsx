"use client";

import React, { useEffect, useState } from "react";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import { Button, Form, Badge, Card, Alert } from "react-bootstrap";
import AuditLog from "../activity-log";
import InventoryModal from "./new";
import { InventoryItem } from "src/app/types/types";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";
import { useTooltips } from "../../../hooks/useTooltips";

type ItemFilter = "all" | "stock" | "sellable" | "both";

export default function InventoryPage() {
  const [showModal, setShowModal] = useState(false);
  const [inventoryItems, setInventoryItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItemId, setSelectedItemId] = useState(null);
  const [authError, setAuthError] = useState(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [itemFilter, setItemFilter] = useState<ItemFilter>("all");

  const apiCall = useApiCall();
  useTooltips();

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

  useEffect(() => {
    filterItems();
  }, [inventoryItems, itemFilter]);

  const filterItems = () => {
    let filtered = [...inventoryItems];

    if (itemFilter === "stock") {
      filtered = filtered.filter((item) => item.isStock === true);
    } else if (itemFilter === "sellable") {
      filtered = filtered.filter((item) => item.isStock === false);
    } else if (itemFilter === "both") {
      // Items that are both stock and sellable would need a different check
      // For now, show all items
      filtered = filtered;
    }
    // "all" shows everything

    setFilteredItems(filtered);
  };

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
      <div className="container-fluid">
        <div className="bg-primary text-white p-3 mb-4">
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-box-seam me-2"></i>
            Stock Menu Items
          </h1>
          <p className="mb-0 small">Manage stock items (suppliable) and sellable items (produced)</p>
        </div>


        <div className="row mt-2">
          <div className="col-4">
            <Card className="shadow-sm mb-4">
              <Card.Header className="bg-light fw-bold">
                <i className="bi bi-funnel me-2"></i>
                Filters
                <i 
                  className="bi bi-question-circle ms-2 text-muted" 
                  style={{ cursor: "help" }}
                  data-bs-toggle="tooltip" 
                  data-bs-placement="top"
                  title="Stock Items: purchased/supplied items (e.g., Eggs, Milk). Sellable Items: produced items (e.g., Tortilla, Coffee). Items can be both types."
                ></i>
              </Card.Header>
              <Card.Body>
                <Form.Group className="mb-3">
                  <Form.Label>
                    Item Type
                    <i 
                      className="bi bi-question-circle ms-1 text-muted" 
                      style={{ cursor: "help" }}
                      data-bs-toggle="tooltip" 
                      data-bs-placement="top"
                      title="Filter items by type: Stock (purchased), Sellable (produced), or Both"
                    ></i>
                  </Form.Label>
                  <Form.Select
                    value={itemFilter}
                    onChange={(e) => setItemFilter(e.target.value as ItemFilter)}
                  >
                    <option value="all">All Items</option>
                    <option value="stock">Stock Items Only</option>
                    <option value="sellable">Sellable Items Only</option>
                    <option value="both">Both Types</option>
                  </Form.Select>
                </Form.Group>
              </Card.Body>
            </Card>

            <Button onClick={handleShowModal} className="btn btn-primary w-100 mb-3">
              <i className="bi bi-plus-circle me-2"></i>
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
              <Card className="shadow-sm">
                <Card.Header className="bg-light fw-bold">
                  Items ({filteredItems.length})
                </Card.Header>
                <Card.Body>
                  {filteredItems.length === 0 ? (
                    <Alert variant="info">No items found matching the selected filter.</Alert>
                  ) : (
                    <table className="table table-striped">
                      <thead>
                        <tr>
                          <th>ID</th>
                          <th>Name</th>
                          <th>Code</th>
                          <th>Type</th>
                          <th>Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredItems.map((item) => (
                          <tr key={item.id} onClick={() => setSelectedItemId(item.id)}>
                            <td>{item.id}</td>
                            <td>{item.name}</td>
                            <td>{item.code}</td>
                            <td>
                              {item.isStock ? (
                                <Badge bg="primary">Stock Item</Badge>
                              ) : (
                                <Badge bg="success">Sellable Item</Badge>
                              )}
                            </td>
                            <td>
                              <Button
                                variant="secondary"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  // TODO: Implement adjust stock
                                }}
                              >
                                <i className="bi bi-sliders me-1"></i>
                                Adjust Stock
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </Card.Body>
              </Card>
            )}
          </div>
          <div className="col-8">
            <AuditLog />
          </div>
        </div>
      </div>
    </RoleAwareLayout>
  );
}
