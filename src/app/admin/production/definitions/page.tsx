"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button } from "react-bootstrap";
import RoleAwareLayout from "src/app/shared/RoleAwareLayout";
import AddSubItemModal from "./new";
import ErrorDisplay from "src/app/components/ErrorDisplay";

function InventoryItemsPage() {
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [selectedItem, setSelectedItem] = useState(null);
  const [selectedItemName, setSelectedItemName] = useState("");
  const [subItems, setSubItems] = useState([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [itemToRemove, setItemToRemove] = useState(null);
  const [fetchError, setFetchError] = useState<string | null>(null);
  const [addSubItemError, setAddSubItemError] = useState<string | null>(null);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    setFilteredItems(
      items.filter((item) =>
        item.name.toLowerCase().includes(searchTerm.toLowerCase()),
      ),
    );
  }, [searchTerm, items]);

  const fetchItems = async () => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch("/api/production", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 403) {
          // Handle permission errors with detailed information
          const errorMessage = errorData.message || "Access denied";
          const missingPermissions = errorData.missingPermissions || [];
          const userRoles = errorData.userRoles || [];
          const isAdmin = errorData.isAdmin || false;

          let detailedError = `${errorMessage}`;
          if (missingPermissions.length > 0) {
            detailedError += `\n\nMissing permissions: ${missingPermissions.join(', ')}`;
          }
          if (userRoles.length > 0) {
            detailedError += `\n\nYour roles: ${userRoles.join(', ')}`;
          }
          if (!isAdmin) {
            detailedError += `\n\nNote: You need admin privileges to access production definitions.`;
          }

          setFetchError(detailedError);
        } else {
          setFetchError(errorData.message || "Failed to fetch items");
        }
        setItems([]);
        setFilteredItems([]);
        return;
      }
      const data = await response.json();
      // Ensure data is an array before setting it
      const itemsArray = Array.isArray(data) ? data : [];
      setItems(itemsArray);
      setFilteredItems(itemsArray);
      setFetchError(null);
    } catch (error: any) {
      console.error("Error fetching items:", error);
      setFetchError("Error fetching items: " + error.message);
      setItems([]);
      setFilteredItems([]);
    }
  };

  const handleItemSelect = async (itemId) => {
    const itemData = items.find((item) => item.id === itemId);

    if (itemData) {
      setSelectedItem(itemId);
      setSelectedItemName(itemData.name);
      await fetchSubItemsFromBackend(itemId);
    }
  };

  const addSubItemToItem = async (subItemId, portionSize) => {
    if (!selectedItem) {
      setAddSubItemError("No item selected");
      return;
    }
    const token = localStorage.getItem("token");
    try {
      setAddSubItemError(null);
      const response = await fetch(
        `/api/production/${selectedItem}/sub-items`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            subItemId: subItemId,
            portionSize: portionSize,
          }),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        if (response.status === 403) {
          // Handle permission errors with detailed information
          const errorMessage = data.message || "Access denied";
          const missingPermissions = data.missingPermissions || [];
          const userRoles = data.userRoles || [];

          let detailedError = `${errorMessage}`;
          if (missingPermissions.length > 0) {
            detailedError += `\n\nMissing permissions: ${missingPermissions.join(', ')}`;
          }
          if (userRoles.length > 0) {
            detailedError += `\n\nYour roles: ${userRoles.join(', ')}`;
          }

          setAddSubItemError(detailedError);
        } else {
          setAddSubItemError(data.message || "Failed to add sub-item");
        }
        return;
      }

      await fetchSubItemsFromBackend(selectedItem);
      closeModal();
    } catch (error: any) {
      console.error("Error adding sub-item to item:", error);
      setAddSubItemError("Error adding sub-item: " + error.message);
    }
  };

  const fetchSubItemsFromBackend = async (itemId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(`/api/production/${itemId}/sub-items`, {
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      if (!response.ok) throw new Error("Failed to fetch sub-items");
      const data = await response.json();

      const items = data[0].subItems || [];
      setSubItems(items);
      updateItemsInState(itemId, items);
    } catch (error: any) {
      console.error("Error fetching sub-items:", error);
    }
  };

  const updateItemsInState = (itemId, updatedItems) => {
    const updatedItemsList = items.map((item) => {
      if (item.id === itemId) {
        return { ...item, subItems: updatedItems };
      }
      return item;
    });
    setItems(updatedItemsList);
    setFilteredItems(updatedItemsList);
  };

  const confirmRemoveItem = (subItemId) => {
    setItemToRemove(subItemId);
    setShowConfirmation(true);
  };

  const handleConfirmRemove = async () => {
    setShowConfirmation(false);
    if (itemToRemove !== null) {
      await removeSubItemFromItem(itemToRemove);
      setItemToRemove(null);
    }
  };

  const removeSubItemFromItem = async (subItemId) => {
    const token = localStorage.getItem("token");
    try {
      const response = await fetch(
        `/api/production/${selectedItem}/sub-items/${subItemId}`,
        {
          method: "DELETE",
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to remove sub-item");

      await fetchSubItemsFromBackend(selectedItem);
    } catch (error: any) {
      console.error("Error removing sub-item from item:", error);
    }
  };

  const openModal = () => {
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
  };

  return (
    <RoleAwareLayout>
      <div className="container-fluid">
        {/* Header */}
        <div className="bg-primary text-white p-3 mb-4">
          <h1 className="h4 mb-0 fw-bold">
            <i className="bi bi-box-seam me-2"></i>
            Production Definitions
          </h1>
        </div>

        {/* Error Display */}
        {fetchError && (
          <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
            <div className="d-flex align-items-start">
              <i className="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
              <div className="flex-grow-1">
                <strong>Access Error</strong>
                <div className="mt-2">
                  {fetchError.split('\n').map((line, index) => (
                    <div key={index} className={line.includes('Missing permissions:') || line.includes('Your roles:') || line.includes('Note:') ? 'small text-muted' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
                {fetchError.includes('Missing permissions:') && (
                  <div className="mt-3">
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Contact your administrator to add the required permissions to your role.
                    </small>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setFetchError(null)}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}
        {addSubItemError && (
          <div className="alert alert-danger alert-dismissible fade show mb-4" role="alert">
            <div className="d-flex align-items-start">
              <i className="bi bi-exclamation-triangle-fill me-2 mt-1"></i>
              <div className="flex-grow-1">
                <strong>Add Sub-Item Error</strong>
                <div className="mt-2">
                  {addSubItemError.split('\n').map((line, index) => (
                    <div key={index} className={line.includes('Missing permissions:') || line.includes('Your roles:') ? 'small text-muted' : ''}>
                      {line}
                    </div>
                  ))}
                </div>
                {addSubItemError.includes('Missing permissions:') && (
                  <div className="mt-3">
                    <small className="text-muted">
                      <i className="bi bi-info-circle me-1"></i>
                      Contact your administrator to add the required permissions to your role.
                    </small>
                  </div>
                )}
              </div>
              <button
                type="button"
                className="btn-close"
                onClick={() => setAddSubItemError(null)}
                aria-label="Close"
              ></button>
            </div>
          </div>
        )}

        {/* Main Content */}
        <div className="row g-4">
          <div className="col-md-4">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <h5 className="mb-0 fw-bold">
                  <i className="bi bi-box-seam me-2 text-primary"></i>
                  Stock Menu Items
                </h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search Items"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div
                  className="list-group"
                  style={{ maxHeight: "400px", overflowY: "auto" }}
                >
                  {filteredItems.length > 0 ? (
                    filteredItems.map((item) => (
                      <li
                        key={item.id}
                        className="list-group-item list-group-item-action"
                        onClick={() => handleItemSelect(item.id)}
                        style={{ cursor: "pointer" }}
                      >
                        {item.name}
                      </li>
                    ))
                  ) : (
                    <li className="list-group-item">No items found</li>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-8">
            <div className="card shadow-sm">
              <div className="card-header bg-light">
                <div className="d-flex justify-content-between align-items-center">
                  <h5 className="mb-0 fw-bold">
                    <i className="bi bi-list-ul me-2 text-primary"></i>
                    Sub-Items for {selectedItem ? selectedItemName : "Selected Item"}
                  </h5>
                  {selectedItem && (
                    <button className="btn btn-success btn-sm" onClick={openModal}>
                      <i className="bi bi-plus-circle me-1"></i>
                      Add New Sub-Item
                    </button>
                  )}
                </div>
              </div>
              <div className="card-body">
                {selectedItem ? (
                  <div className="table-responsive">
                    <table className="table table-hover">
                      <thead className="table-light">
                        <tr>
                          <th className="fw-semibold">Name</th>
                          <th className="fw-semibold">Portion Size</th>
                          <th className="fw-semibold text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {subItems.length > 0 ? (
                          subItems.map((subItem) => (
                            <tr key={subItem.id}>
                              <td>{subItem.name}</td>
                              <td>{subItem.portionSize}</td>
                              <td className="text-center">
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => confirmRemoveItem(subItem.id)}
                                >
                                  <i className="bi bi-trash me-1"></i>
                                  Remove
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={3} className="text-center py-4">
                              <i className="bi bi-inbox text-muted" style={{ fontSize: '2rem' }}></i>
                              <p className="text-muted mt-2 mb-0">No sub-items available</p>
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-4">
                    <i className="bi bi-cursor text-muted" style={{ fontSize: '3rem' }}></i>
                    <p className="text-muted mt-3 mb-0">Select an item to view its sub-items</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      <AddSubItemModal
        isModalOpen={isModalOpen}
        closeModal={closeModal}
        addSubItemToItem={addSubItemToItem}
        addSubItemError={addSubItemError}
        setAddSubItemError={setAddSubItemError}
      />

      <Modal show={showConfirmation} onHide={() => setShowConfirmation(false)}>
        <Modal.Header closeButton>
          <Modal.Title>Confirm Action</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to remove this sub-item from the stock item?
        </Modal.Body>
        <Modal.Footer>
          <Button
            variant="secondary"
            onClick={() => setShowConfirmation(false)}
          >
            Cancel
          </Button>
          <Button variant="danger" onClick={handleConfirmRemove}>
            Confirm
          </Button>
        </Modal.Footer>
      </Modal>
    </RoleAwareLayout>
  );
}

export default InventoryItemsPage;
