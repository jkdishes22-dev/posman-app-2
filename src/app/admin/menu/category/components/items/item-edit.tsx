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
  const [pricelists, setPricelists] = useState([]);
  const [pricelistId, setPricelistId] = useState<number>(
    item?.pricelistId || null,
  );
  const [loadingPricelists, setLoadingPricelists] = useState(true);
  const [addItemError, setAddItemError] = useState("");

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
        setPricelists(data);
      } catch (error) {
        setAddItemError("Failed to fetch pricelists: " + error.message);
      } finally {
        setLoadingPricelists(false); // Set loading to false after fetching
      }
    }
    fetchPricelists();
  }, []);

  useEffect(() => {
    if (item) {
      setEditedItem(item);
      if (item.pricelistId) {
        setPricelistId(item.pricelistId);
      }
    } else {
      setEditedItem(null);
      setPricelistId(null);
    }
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
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ ...editedItem, pricelistId }),
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
        {addItemError && <p style={{ color: "red" }}>{addItemError}</p>}
        {loadingPricelists ? (
          <p>Loading Pricelists...</p>
        ) : (
          editedItem && (
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
                  value={editedItem.code || ""}
                  onChange={handleChange}
                />
              </div>
              <div className="form-group">
                <label>Pricelist</label>
                <select
                  className="form-control"
                  value={pricelistId} // Controlled component
                  onChange={(e) => setPricelistId(parseInt(e.target.value))}
                >
                  <option value="">Select Pricelist</option>
                  {pricelists.map((pricelist) => (
                    <option key={pricelist.id} value={pricelist.id}>
                      {pricelist.name}
                    </option>
                  ))}
                </select>
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
          )
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
