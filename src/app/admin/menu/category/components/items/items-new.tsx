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
  const [itemName, setItemName] = useState("");
  const [itemCode, setItemCode] = useState("");
  const [itemPrice, setItemPrice] = useState<number | "">("");
  const [pricelistId, setPricelistId] = useState<string>("");
  const [isGroup, setIsGroup] = useState(false);
  const [pricelists, setPricelists] = useState([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [addItemError, setAddItemError] = useState<string | null>(null);
  const [authError, setAuthError] = useState<AuthError>(null);
  const [priceListError, setFetchPricelistError] = useState(null);

  // Determine context for conditional rendering
  const isFromPricelistPage = !selectedCategory && selectedPricelistId;
  const isFromCategoryPage = selectedCategory && !selectedPricelistId;

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
          // Ensure data is an array
          setPricelists(Array.isArray(data) ? data : []);
        } else if (response.status === 401) {
          // Invalid token, logout and redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/";
        } else if (response.status === 403) {
          setAuthError(data);
        } else {
          setFetchPricelistError(data);
        }
      } catch (error: any) {
        console.error("Failed to fetch pricelists", error);
        setAddItemError("Network error: Failed to fetch pricelists");
        setPricelists([]); // Ensure pricelists is always an array
      }
    }
    fetchPricelists();
  }, []);

  // Fetch categories
  useEffect(() => {
    async function fetchCategories() {
      try {
        const token = localStorage.getItem("token");
        const response = await fetch("/api/menu/categories", {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.ok) {
          const data = await response.json();
          setCategories(Array.isArray(data) ? data : []);
        } else if (response.status === 401) {
          localStorage.removeItem("token");
          localStorage.removeItem("user");
          window.location.href = "/";
        } else if (response.status === 403) {
          const errorData = await response.json();
          setAuthError(errorData);
        } else {
          const errorData = await response.json().catch(() => ({ message: "Failed to fetch categories" }));
          setAuthError(errorData);
        }
      } catch (error: any) {
        console.error("Failed to fetch categories", error);
        setAuthError({ message: "Network error: Failed to fetch categories" });
        setCategories([]);
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
        setAddItemError("Please fill in Item Name, Item Code, Item Price, and Category");
        return;
      }
    } else if (isFromCategoryPage) {
      // Validation for category page (both category and pricelist required)
      if (!itemName || !itemCode || !itemPrice || !pricelistId || !selectedCategory) {
        setAddItemError("Please fill in all fields");
        return;
      }
    } else {
      setAddItemError("Invalid context: missing required parameters");
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
        setAddItemError(null);
      } catch (error: any) {
        setAddItemError("Failed to create item: " + error.message);
      }
    } else {
      // Default API call for category page
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
          if (selectedCategory?.id && fetchItems) fetchItems(selectedCategory.id);
          handleModalClose();
          setItemName("");
          setItemCode("");
          setItemPrice("");
          setPricelistId("");
          setSelectedCategoryId("");
          setIsGroup(false);
          setAddItemError(null);
        } else {
          setAddItemError("Failed to create item");
        }
      } catch (error: any) {
        if (error) {
          setAddItemError("Failed to create item: " + error.message);
        }
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
          error={itemError || addItemError}
          onDismiss={() => {
            if (setItemError) setItemError("");
            setAddItemError(null);
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
