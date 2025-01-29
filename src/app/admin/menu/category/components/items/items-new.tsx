import React, { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { Category } from "../../../../../types/types";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "react-bootstrap";

interface NewItemModalProps {
  selectedCategory: Category | null;
  showModal: boolean;
  handleModalClose: () => void;
  fetchItems: (categoryId: string) => void;
}

const NewItemModal: React.FC<NewItemModalProps> = ({
  selectedCategory,
  showModal,
  handleModalClose,
  fetchItems,
}) => {
  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemPrice, setItemPrice] = useState<number | "">("");
  const [pricelistId, setPricelistId] = useState<string>("");
  const [isGroup, setIsGroup] = useState(false);
  const [pricelists, setPricelists] = useState([]);
  const [addItemError, setAddItemError] = useState("");
  const [authError, setAuthError] = useState<AuthError>(null);

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
        }
        else if (response.status === 403) {
          setAuthError(data)
        } else {
          setFetchPricelistError(data);
        }

      } catch (error) {
        setAddItemError("Failed to fetch pricelists: " + error.message);
      }
    }
    fetchPricelists();
  }, []);

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !itemName ||
      !itemCode ||
      !itemPrice ||
      !pricelistId ||
      !selectedCategory
    ) {
      setAddItemError("Please fill in all fields");
      return;
    }

    const itemData = {
      name: itemName,
      code: itemCode,
      price: itemPrice,
      category: selectedCategory.id,
      pricelistId,
      isGroup,
    };

    try {
      const token = localStorage.getItem("token");
      const response = await fetch("/api/menu/items", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(itemData),
      });

      if (response.status === 201) {
        if (selectedCategory?.id) fetchItems(selectedCategory.id);
        handleModalClose();
        setItemName("");
        setItemCode("");
        setItemPrice("");
        setPricelistId("");
        setIsGroup(false);
        setAddItemError("");
      } else {
        setAddItemError("Failed to create item");
      }
    } catch (e) {
      setAddItemError("Failed to create item: " + e.message);
    }
  };

  return (
    <Modal show={showModal} onHide={handleModalClose}>
       {authError && (
      <div className="alert alert-danger">
        <strong>Error:</strong> {authError.message}
        {authError.missingPermissions && (
          <ul>
            {authError.missingPermissions.map((perm) => (
              <li key={perm}>{perm}</li>
            ))}
          </ul>
        )}
      </div>
    )}
      <ModalHeader closeButton>
        <ModalTitle>Add Item</ModalTitle>
      </ModalHeader>
      <ModalBody>
        {addItemError && <p style={{ color: "red" }}>{addItemError}</p>}
        <form onSubmit={handleItemSubmit} className="row g-3">
          <div className="form-group">
            <label>Item Name</label>
            <input
              type="text"
              className="form-control"
              value={itemName}
              onChange={(e) => setItemName(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Item Code</label>
            <input
              type="text"
              className="form-control"
              value={itemCode}
              onChange={(e) => setItemCode(e.target.value)}
            />
          </div>
          <div className="form-group">
            <label>Pricelist</label>
            <select
              className="form-control"
              value={pricelistId}
              onChange={(e) => setPricelistId(e.target.value)}
            >
              <option value="">Select Pricelist</option>
              {pricelists.map((pricelist) => (
                <option key={pricelist.id} value={pricelist.id}>
                  {pricelist.name}
                </option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label>Item Price</label>
            <input
              type="text"
              className="form-control"
              value={itemPrice}
              onChange={(e) => setItemPrice(parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Is Group</label>
            <input
              type="checkbox"
              checked={isGroup}
              onChange={(e) => setIsGroup(e.target.checked)}
            />
          </div>
          <ModalFooter>
            <Button variant="secondary" onClick={handleModalClose}>
              Close
            </Button>
            <Button variant="primary" type="submit">
              Save
            </Button>
          </ModalFooter>
        </form>
      </ModalBody>
    </Modal>
  );
};

export default NewItemModal;
