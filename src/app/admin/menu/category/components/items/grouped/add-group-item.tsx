import React, { useState } from "react";
import {
  Modal,
  Button,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "react-bootstrap";
import AsyncSelect from "react-select/async";
import { Item } from "src/app/types/types";

interface AddGroupItemModalProps {
  isModalOpen: boolean;
  closeModal: () => void;
  selectedGroupName: string;
  addItemToGroup: (itemId: number, portionSize: number) => void;
}

interface ItemOption {
  label: string;
  value: number;
}

const AddGroupItemModal = ({
  isModalOpen,
  closeModal,
  selectedGroupName,
  addItemToGroup,
}: AddGroupItemModalProps) => {
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [portionSize, setPortionSize] = useState<number | null>(null);

  const fetchModalItems = async (inputValue: string) => {
    if (inputValue.length <= 2) {
      return [];
    }
    try {
      const token = localStorage.getItem("token");
      const excludeGrouped = true;
      const response = await fetch(
        `/api/menu/items?search=${encodeURIComponent(inputValue)}&excludeGrouped=${excludeGrouped}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch items");
      const data = await response.json();
      return data.map((item: Item) => ({
        label: item.name,
        value: item.id,
      }));
    } catch (error: any) {
      console.error("Error fetching items:", error);
      return [];
    }
  };

  const handleAddItem = () => {
    if (!selectedItem || !portionSize) {
      alert("Please fill in both fields.");
      return;
    }
    addItemToGroup(selectedItem.value, portionSize);
    closeModal();
  };

  return (
    <Modal show={isModalOpen} onHide={closeModal}>
      <ModalHeader closeButton>
        <ModalTitle>Add New Item to {selectedGroupName}</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <div className="form-group">
          <label htmlFor="item-select">Select Item</label>
          <AsyncSelect
            id="item-select"
            cacheOptions
            loadOptions={fetchModalItems}
            onChange={setSelectedItem}
            value={selectedItem}
            getOptionLabel={(e) => e.label}
            getOptionValue={(e) => e.value.toString()}
            placeholder="Search for an item"
          />
        </div>
        <div className="form-group">
          <label htmlFor="portion-size">Portion Size</label>
          <input
            type="number"
            id="portion-size"
            className="form-control"
            value={portionSize?.toString()}
            onChange={(e) => setPortionSize(Number(e.target.value))}
            placeholder="Enter portion size"
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <Button variant="secondary" onClick={closeModal}>
          Close
        </Button>
        <Button variant="primary" onClick={handleAddItem}>
          Add Item
        </Button>
      </ModalFooter>
    </Modal>
  );
};

export default AddGroupItemModal;
