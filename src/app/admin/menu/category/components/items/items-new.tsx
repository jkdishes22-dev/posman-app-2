import React, { useState, useEffect } from "react";
import Modal from "react-bootstrap/Modal";
import Button from "react-bootstrap/Button";
import { AuthError, Category } from "../../../../../types/types";
import {
  ModalBody,
  ModalFooter,
  ModalHeader,
  ModalTitle,
} from "react-bootstrap";
import ErrorDisplay from "../../../../../components/ErrorDisplay";
import { useApiCall } from "../../../../../utils/apiUtils";

interface NewItemModalProps {
  selectedCategory: Category | null;
  showModal: boolean;
  handleModalClose: () => void;
  fetchItems?: (categoryId: string) => void;
  handleAddItem?: (itemData: any) => void;
  itemError?: string;
  setItemError?: (error: string) => void;
  selectedPricelistId?: number | null;
}

const NewItemModal: React.FC<NewItemModalProps> = ({
  selectedCategory,
  showModal,
  handleModalClose,
  fetchItems,
  handleAddItem,
  itemError,
  setItemError,
  selectedPricelistId,
}) => {
  const apiCall = useApiCall();
  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemPrice, setItemPrice] = useState<number | "">("");
  const [pricelistId, setPricelistId] = useState<string>("");
  const [isGroup, setIsGroup] = useState(false);
  const [pricelists, setPricelists] = useState([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [authError, setAuthError] = useState<AuthError>(null);

  // Determine context for conditional rendering
  const isFromPricelistPage = !selectedCategory && selectedPricelistId;
  const isFromCategoryPage = selectedCategory && !selectedPricelistId;

  useEffect(() => {
    async function fetchPricelists() {
      const result = await apiCall("/api/menu/pricelists");

      if (result.status === 200) {
        // Ensure data is an array
        setPricelists(Array.isArray(result.data) ? result.data : []);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch pricelists");
        setErrorDetails(result.errorDetails);
      }
    }
    fetchPricelists();
  }, []);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      const result = await apiCall("/api/menu/categories");

      if (result.status === 200) {
        setCategories(Array.isArray(result.data) ? result.data : []);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch categories");
        setErrorDetails(result.errorDetails);
      }
    }

    fetchCategories();
  }, []);

  // Auto-select pricelist when from pricelist page
  useEffect(() => {
    if (selectedPricelistId && pricelists.length > 0) {
      setPricelistId(selectedPricelistId.toString());
    }
  }, [selectedPricelistId, pricelists]);

  const handleItemSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isFromPricelistPage) {
      // Validation for pricelist page (category required, pricelist auto-selected)
      if (!itemName || !itemCode || !itemPrice || !selectedCategoryId) {
        setError("Please fill in Item Name, Item Code, Item Price, and Category");
        return;
      }
    } else if (isFromCategoryPage) {
      // Validation for category page (both category and pricelist required)
      if (!itemName || !itemCode || !itemPrice || !pricelistId || !selectedCategory) {
        setError("Please fill in all fields");
        return;
      }
    } else {
      setError("Invalid context: missing required parameters");
      return;
    }

    const itemData = {
      name: itemName,
      code: itemCode,
      price: itemPrice,
      category: isFromCategoryPage ? selectedCategory?.id : (selectedCategoryId || null),
      pricelistId: isFromPricelistPage ? selectedPricelistId : pricelistId,
      isGroup,
    };

    // Use custom handler if provided (for pricelist page), otherwise use default API call
    if (handleAddItem) {
      try {
        await handleAddItem(itemData);
        handleModalClose();
        setItemName("");
        setItemCode("");
        setItemPrice("");
        setPricelistId("");
        setSelectedCategoryId("");
        setIsGroup(false);
        setError(null);
      } catch (error: any) {
        setError("Failed to create item: " + error.message);
      }
    } else {
      // Default API call for category page
      const result = await apiCall("/api/menu/items", {
        method: "POST",
        body: JSON.stringify(itemData),
      });

      if (result.status === 200 || result.status === 201) {
        if (selectedCategory?.id && fetchItems) fetchItems(selectedCategory.id);
        handleModalClose();
        setItemName("");
        setItemCode("");
        setItemPrice("");
        setPricelistId("");
        setSelectedCategoryId("");
        setIsGroup(false);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to create item");
        setErrorDetails(result.errorDetails);
      }
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
        <ErrorDisplay
          error={itemError || error}
          errorDetails={errorDetails}
          onDismiss={() => {
            if (setItemError) setItemError("");
            setError(null);
            setErrorDetails(null);
          }}
        />
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

          {/* Category selection - only show when adding from pricelist page */}
          {isFromPricelistPage && (
            <div className="form-group">
              <label>Category <span className="text-danger">*</span></label>
              <select
                className="form-control"
                value={selectedCategoryId}
                onChange={(e) => setSelectedCategoryId(e.target.value)}
                required
              >
                <option value="">Select Category</option>
                {Array.isArray(categories) && categories.map((category: Category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {!selectedPricelistId && (
            <div className="form-group">
              <label>Pricelist</label>
              <select
                className="form-control"
                value={pricelistId}
                onChange={(e) => setPricelistId(e.target.value)}
              >
                <option value="">Select Pricelist</option>
                {Array.isArray(pricelists) && pricelists.map((pricelist: any) => (
                  <option key={pricelist.id} value={pricelist.id}>
                    {pricelist.name}
                  </option>
                ))}
              </select>
            </div>
          )}
          {selectedPricelistId && (
            <div className="form-group">
              <label>Pricelist</label>
              <input
                type="text"
                className="form-control"
                value={pricelists.find((p: any) => p.id === selectedPricelistId)?.name || "Selected Pricelist"}
                disabled
                style={{ backgroundColor: "#f8f9fa" }}
              />
            </div>
          )}

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
