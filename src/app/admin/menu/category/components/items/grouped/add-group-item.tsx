import React, { useState, useEffect } from "react";
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
  const [initialItems, setInitialItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Load initial items when modal opens
  useEffect(() => {
    if (isModalOpen) {
      loadInitialItems();
    } else {
      // Reset form when modal closes
      setSelectedItem(null);
      setPortionSize(null);
    }
  }, [isModalOpen]);

  const loadInitialItems = async () => {
    setIsLoading(true);
    try {
      const token = localStorage.getItem("token");
      // Use a generic search term to get initial items
      const response = await fetch(
        `/api/menu/items?search=a&excludeGrouped=true`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );
      if (!response.ok) throw new Error("Failed to fetch items");
      const data = await response.json();
      const items = data.slice(0, 20).map((item: Item) => ({
        label: item.name,
        value: item.id,
      }));
      setInitialItems(items);
    } catch (error: any) {
      console.error("Error fetching initial items:", error);
      setInitialItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchModalItems = async (inputValue: string) => {
    // If no input, return initial items
    if (!inputValue || inputValue.length === 0) {
      return initialItems;
    }

    // If input is too short, return initial items filtered by input
    if (inputValue.length <= 2) {
      return initialItems.filter(item =>
        item.label.toLowerCase().includes(inputValue.toLowerCase())
      );
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
    if (!selectedItem || !portionSize || portionSize <= 0) {
      alert("Please select an item and enter a valid portion size greater than 0.");
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
            placeholder={isLoading ? "Loading items..." : "Search for an item or select from list"}
            isLoading={isLoading}
            noOptionsMessage={({ inputValue }) =>
              inputValue.length > 0
                ? `No items found for "${inputValue}"`
                : "Type to search for items"
            }
            loadingMessage={() => "Loading items..."}
          />
        </div>
        <div className="form-group">
          <label htmlFor="portion-size">Portion Size</label>
          <input
            type="number"
            id="portion-size"
            className="form-control"
            value={portionSize?.toString() || ""}
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
