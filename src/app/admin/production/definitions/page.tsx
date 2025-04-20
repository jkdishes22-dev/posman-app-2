"use client";

import React, { useEffect, useState } from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import { Modal, Button } from "react-bootstrap";
import AdminLayout from "src/app/shared/AdminLayout";
import AddSubItemModal from "./new";

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
      if (!response.ok) throw new Error("Failed to fetch items");
      const data = await response.json();
      setItems(data);
      setFilteredItems(data);
    } catch (error: any) {
      console.error("Error fetching items:", error);
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
      return;
    }
    const token = localStorage.getItem("token");
    try {
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
      if (!response.ok) throw new Error("Failed to add sub-item");

      await fetchSubItemsFromBackend(selectedItem);
      closeModal();
    } catch (error: any) {
      console.error("Error adding sub-item to item:", error);
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
    <AdminLayout authError={null}>
      <div className="container my-5">
        <div className="row">
          <div className="col-md-4">
            <h4>Stock Menu Items</h4>
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

          <div className="col-md-8">
            <h4>Sub-Items for {selectedItem ? `: ${selectedItemName}` : ""}</h4>
            {selectedItem ? (
              <>
                <button className="btn btn-success mb-3" onClick={openModal}>
                  Add New Sub-Item
                </button>
                <table className="table table-striped">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Portion size</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {subItems.length > 0 ? (
                      subItems.map((subItem) => (
                        <tr key={subItem.id}>
                          <td>{subItem.name}</td>
                          <td>{subItem.portionSize}</td>
                          <td>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => confirmRemoveItem(subItem.id)}
                            >
                              Remove
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3}>No sub-items available.</td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </>
            ) : (
              <p>Select an item to view its sub-items.</p>
            )}
          </div>
        </div>
      </div>

      <AddSubItemModal
        isModalOpen={isModalOpen}
        closeModal={closeModal}
        selectedItem={selectedItem}
        selectedItemName={selectedItemName}
        addSubItemToItem={addSubItemToItem}
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
    </AdminLayout>
  );
}

export default InventoryItemsPage;
