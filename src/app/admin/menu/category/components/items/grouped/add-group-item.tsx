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
import { useApiCall } from "../../../../../../utils/apiUtils";
import ErrorDisplay from "../../../../../../components/ErrorDisplay";

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
  const apiCall = useApiCall();
  const [selectedItem, setSelectedItem] = useState<ItemOption | null>(null);
  const [portionSize, setPortionSize] = useState<number | null>(null);
  const [initialItems, setInitialItems] = useState<ItemOption[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);

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
    const result = await apiCall(`/api/menu/items?search=a&excludeGrouped=true`);

    if (result.status === 200) {
      const items = result.data.slice(0, 20).map((item: Item) => ({
        label: item.name,
        value: item.id,
      }));
      setInitialItems(items);
    } else {
      setError(result.error || "Failed to fetch items");
      setErrorDetails(result.errorDetails);
      setInitialItems([]);
    }

    setIsLoading(false);
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

    const result = await apiCall(
      `/api/menu/items?search=${encodeURIComponent(inputValue)}&excludeGrouped=true`
    );

    if (result.status === 200) {
      return result.data.map((item: Item) => ({
        label: item.name,
        value: item.id,
      }));
    } else {
      setError(result.error || "Failed to fetch items");
      setErrorDetails(result.errorDetails);
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
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />
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
