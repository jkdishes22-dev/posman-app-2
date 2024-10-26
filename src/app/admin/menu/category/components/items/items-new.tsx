import React, { useState } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { Category } from "../../types";
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
  const [defaultUnitId, setDefaultUnitId] = useState<number | "">("");
  const [isGroup, setIsGroup] = useState(false);
  const [addItemError, setAddItemError] = useState("");

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !itemName ||
      !itemCode ||
      !itemPrice ||
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
      defaultUnitId,
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
        setDefaultUnitId("");
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
            <label>Item Price</label>
            <input
              type="text"
              className="form-control"
              value={itemPrice}
              onChange={(e) => setItemPrice(parseFloat(e.target.value))}
            />
          </div>

          <div className="form-group">
            <label>Default Unit ID</label>
            <input
              type="number"
              className="form-control"
              value={defaultUnitId}
              onChange={(e) => setDefaultUnitId(parseInt(e.target.value))}
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
