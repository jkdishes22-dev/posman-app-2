import React, { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { Category, ItemType } from "../../types";
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
  const [itemType, setItemType] = useState<string>("");
  const [defaultUnitId, setDefaultUnitId] = useState<number | "">("");
  const [isGroup, setIsGroup] = useState(false);
  const [itemTypes, setItemTypes] = useState<ItemType[]>([]);
  const [addItemError, setAddItemError] = useState("");

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (
      !itemName ||
      !itemCode ||
      !itemPrice ||
      !itemType ||
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
      itemType: itemType,
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
        setItemType("");
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

  useEffect(() => {
    const fetchItemTypes = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/items/types", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setItemTypes(data);
        } else {
          setAddItemError("Failed to fetch item types");
        }
      } catch (e) {
        setAddItemError("Failed to fetch item types: " + e.message);
      }
    };
    fetchItemTypes();
  }, []);

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
            <label>Item Type</label>
            <select
              className="form-control"
              value={itemType}
              onChange={(e) => setItemType(e.target.value)}
            >
              <option value="">Select Item Type</option>
              {itemTypes.map((type) => (
                <option key={type.id} value={type.id}>
                  {type.name}
                </option>
              ))}
            </select>
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
