import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "react-bootstrap";
import { Item } from "../../types";

interface EditItemModalProps {
  show: boolean;
  item: Item | null;
  onClose: () => void;
  onSave: (item: Item) => void; // Callback to save the edited item
}

const EditItemModal: React.FC<EditItemModalProps> = ({
  show,
  item,
  onClose,
  onSave,
}) => {
  const [editedItem, setEditedItem] = useState<Item | null>(item);
  const [error, setError] = useState<string | null>(null); // Error state

  useEffect(() => {
    setEditedItem(item); // Update edited item when modal opens
  }, [item]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (editedItem) {
      const { name, value, type, checked } = e.target;

      setEditedItem({
        ...editedItem,
        [name]: type === "checkbox" ? checked : value, // Handle checkbox for isGroup
      });
    }
  };

  const handleSave = async () => {
    if (editedItem) {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch(`/api/menu/items/${editedItem.id}`, {
          method: "PATCH", // Use PATCH to update specific fields
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify(editedItem), // Convert the edited item to JSON
        });

        if (!response.ok) {
          throw new Error("Failed to update item");
        }

        const updatedItem = await response.json(); // Get the updated item from the response
        onSave(updatedItem); // Call save function with the updated item
        onClose(); // Close modal
      } catch (error) {
        console.error("Error updating item:", error);
        setError("Error updating item: " + error.message);
      }
    }
  };

  if (error) {
    return <p>{error}</p>; // Display error message
  }

  return (
    <Modal show={show} onHide={onClose}>
      <ModalHeader closeButton>
        <ModalTitle>Edit Item</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {editedItem && (
          <>
            <div className="mb-3">
              <label className="form-label">Item Name</label>
              <input
                type="text"
                className="form-control"
                name="name"
                value={editedItem.name || ""} // Use empty string if null
                onChange={handleChange}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Item Code</label>
              <input
                type="text"
                className="form-control"
                name="code"
                value={editedItem.code || ""} // Use empty string if null
                onChange={handleChange}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Item Price</label>
              <input
                type="text"
                className="form-control"
                name="price"
                value={editedItem.price || 0}
                onChange={handleChange}
              />
            </div>
            <div className="mb-3">
              <label className="form-label">Is Group</label>
              <input
                type="checkbox"
                name="isGroup"
                checked={editedItem.isGroup}
                onChange={handleChange}
              />
            </div>
          </>
        )}
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button variant="primary" onClick={handleSave}>
          Save Changes
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default EditItemModal;
