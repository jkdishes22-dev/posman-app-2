import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "react-bootstrap";
import { Category, Item } from "../../../../../types/types";
import { useApiCall } from "../../../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../../../utils/errorUtils";
import ErrorDisplay from "../../../../../components/ErrorDisplay";

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
  const [error, setError] = useState<string | null>(null);
  const [pricelists, setPricelists] = useState([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [pricelistId, setPricelistId] = useState<number | null>(
    item?.pricelistId || null,
  );
  const [pricelistItemId, setPricelistItemId] = useState<number | undefined>(
    item?.pricelistItemId,
  );
  const [categoryId, setCategoryId] = useState<string>(
    item?.category?.id || "",
  );
  const [loadingPricelists, setLoadingPricelists] = useState(true);
  const [addItemError, setAddItemError] = useState("");
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  const apiCall = useApiCall();

  useEffect(() => {
    async function fetchFormData() {
      try {
        const [pricelistsResult, categoriesResult] = await Promise.all([
          apiCall("/api/menu/pricelists"),
          apiCall("/api/menu/categories"),
        ]);
        if (pricelistsResult.status === 200) {
          setPricelists(pricelistsResult.data);
        } else {
          setAddItemError(pricelistsResult.error || "Failed to fetch pricelists");
          setErrorDetails(pricelistsResult.errorDetails);
        }
        if (categoriesResult.status === 200) {
          setCategories(categoriesResult.data);
        }
      } catch (error: any) {
        setAddItemError("Network error occurred");
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      } finally {
        setLoadingPricelists(false);
      }
    }
    fetchFormData();
  }, [apiCall]);

  useEffect(() => {
    if (item) {
      const itemWithDefaults = {
        ...item,
        isGroup: item.isGroup ?? false,
        isStock: (item as any).isStock ?? false,
        allowNegativeInventory: item.allowNegativeInventory ?? false,
      };
      setEditedItem(itemWithDefaults);
      setPricelistId(item.pricelistId || null);
      setPricelistItemId(item.pricelistItemId);
      setCategoryId(item.category?.id || "");
      setError(null);
      setErrorDetails(null);
    } else {
      setEditedItem(null);
      setPricelistId(null);
      setPricelistItemId(undefined);
      setCategoryId("");
    }
  }, [item]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    if (editedItem) {
      const { name, value, type } = e.target;
      const checked = (e.target as HTMLInputElement).checked;

      setEditedItem({
        ...editedItem,
        [name]: type === "checkbox" ? checked : value, // Handle checkbox for isGroup
      });
    }
  };

  const handleSave = async () => {
    if (editedItem) {
      // Clear previous errors
      setError(null);
      setErrorDetails(null);

      // Validate required fields
      if (!editedItem.name || !editedItem.name.trim()) {
        setError("Item name is required");
        return;
      }

      if (!editedItem.code || !editedItem.code.trim()) {
        setError("Item code is required");
        return;
      }

      if (!categoryId) {
        setError("Category is required");
        return;
      }

      if (!pricelistId) {
        setError("Pricelist is required");
        return;
      }

      if (!editedItem.price || editedItem.price <= 0) {
        setError("Item price is required and must be greater than 0");
        return;
      }

      try {
        const requestBody: any = {
          id: editedItem.id,
          name: editedItem.name,
          code: editedItem.code,
          category: { id: categoryId },
          price: editedItem.price,
          isGroup: editedItem.isGroup ?? false,
          isStock: (editedItem as any).isStock ?? false,
          allowNegativeInventory: editedItem.allowNegativeInventory ?? false,
          pricelistId,
        };

        if (pricelistItemId !== undefined && pricelistItemId > 0) {
          requestBody.pricelistItemId = pricelistItemId;
        }

        const result = await apiCall(`/api/menu/items/${editedItem.id}`, {
          method: "PATCH",
          body: JSON.stringify(requestBody),
        });

        if (result.status === 200) {
          // Clear errors on success
          setError(null);
          setErrorDetails(null);
          onSave(result.data); // Call save function with the updated item
          onClose(); // Close modal
        } else {
          // Error - apiCall already standardizes all non-2XX errors
          setError(result.error || "Failed to update item");
          setErrorDetails(result.errorDetails);
          // Don't close modal on error - let user see the error and try again
        }
      } catch (error: any) {
        setError("Network error occurred");
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
        // Don't close modal on error - let user see the error and try again
      }
    }
  };

  return (
    <Modal show={show} onHide={onClose}>
      <ModalHeader closeButton>
        <ModalTitle>Edit Item</ModalTitle>
      </ModalHeader>
      <ModalBody>
        <ErrorDisplay
          error={addItemError}
          errorDetails={errorDetails}
          onDismiss={() => {
            setAddItemError("");
            setErrorDetails(null);
          }}
        />
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />
        {loadingPricelists ? (
          <p>Loading...</p>
        ) : (
          editedItem && (
            <>
              <div className="mb-3">
                <label className="form-label">Item Name <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  name="name"
                  value={editedItem.name || ""}
                  onChange={(e) => {
                    handleChange(e);
                    if (error && error.includes("Item name")) {
                      setError(null);
                    }
                  }}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Item Code <span className="text-danger">*</span></label>
                <input
                  type="text"
                  className="form-control"
                  name="code"
                  value={editedItem.code || ""}
                  onChange={(e) => {
                    handleChange(e);
                    if (error && error.includes("Item code")) {
                      setError(null);
                    }
                  }}
                  required
                />
              </div>
              <div className="mb-3">
                <label className="form-label">Category <span className="text-danger">*</span></label>
                <select
                  className="form-control"
                  value={categoryId}
                  onChange={(e) => {
                    setCategoryId(e.target.value);
                    if (error && error.includes("Category")) {
                      setError(null);
                    }
                  }}
                  required
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Pricelist <span className="text-danger">*</span></label>
                <select
                  className="form-control"
                  value={pricelistId ? Number(pricelistId) : ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    setPricelistId(value ? parseInt(value) : null);
                    setPricelistItemId(undefined);
                    if (error && error.includes("Pricelist")) {
                      setError(null);
                    }
                  }}
                  required
                >
                  <option value="">Select Pricelist</option>
                  {Array.isArray(pricelists) && pricelists.map((pricelist: any) => (
                    <option key={pricelist.id} value={pricelist.id}>
                      {pricelist.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="mb-3">
                <label className="form-label">Item Price <span className="text-danger">*</span></label>
                <input
                  type="number"
                  className="form-control"
                  name="price"
                  value={editedItem.price || ""}
                  onChange={(e) => {
                    const value = e.target.value;
                    if (editedItem) {
                      setEditedItem({
                        ...editedItem,
                        price: value ? parseFloat(value) : 0,
                      });
                    }
                    if (error && error.includes("Item price")) {
                      setError(null);
                    }
                  }}
                  min="0"
                  step="0.01"
                  required
                />
              </div>
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="isGroup"
                    id="editIsGroup"
                    checked={editedItem.isGroup || false}
                    onChange={handleChange}
                  />
                  <label className="form-check-label d-flex align-items-center justify-content-between w-100" htmlFor="editIsGroup">
                    <span>
                      Is Group
                    </span>
                    <span className="ms-2">
                      <small className="text-muted">Current: </small>
                      <span className={`badge ${editedItem.isGroup ? "bg-success" : "bg-secondary"}`}>
                        {editedItem.isGroup ? "Enabled" : "Disabled"}
                      </span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="isStock"
                    id="editIsStock"
                    checked={(editedItem as any).isStock || false}
                    onChange={handleChange}
                  />
                  <label className="form-check-label d-flex align-items-center justify-content-between w-100" htmlFor="editIsStock">
                    <span>
                      Is Stock Item (Suppliable)
                      <i
                        className="bi bi-question-circle ms-1 text-muted"
                        style={{ cursor: "help" }}
                        data-bs-toggle="tooltip"
                        data-bs-placement="right"
                        data-bs-html="true"
                        title="<strong>Stock Items (isStock: true):</strong> Items purchased/supplied (e.g., Eggs, Milk, Flour). Can be used as ingredients in recipes and are received via purchase orders.<br/><br/><strong>Sellable Items (isStock: false):</strong> Items produced and sold (e.g., Tortilla, Coffee, Omelette). Composite items (isGroup: true) can have recipes that specify how much stock items are deducted when sold.<br/><br/><strong>Note:</strong> Items can be both stock and sellable (e.g., Milk can be purchased AND produced). The system handles both inventory pools separately."
                      ></i>
                    </span>
                    <span className="ms-2">
                      <small className="text-muted">Current: </small>
                      <span className={`badge ${(editedItem as any).isStock ? "bg-success" : "bg-secondary"}`}>
                        {(editedItem as any).isStock ? "Enabled" : "Disabled"}
                      </span>
                    </span>
                  </label>
                </div>
              </div>
              <div className="mb-3">
                <div className="form-check">
                  <input
                    className="form-check-input"
                    type="checkbox"
                    name="allowNegativeInventory"
                    id="editAllowNegativeInventory"
                    checked={editedItem.allowNegativeInventory || false}
                    onChange={handleChange}
                  />
                  <label className="form-check-label d-flex align-items-center justify-content-between w-100" htmlFor="editAllowNegativeInventory">
                    <span>
                      Allow Negative Inventory{" "}
                      <i
                        className="bi bi-question-circle text-muted"
                        data-bs-toggle="tooltip"
                        data-bs-placement="right"
                        data-bs-html="true"
                        title="When enabled, this item can be sold even when inventory is zero or negative. Use with caution - this bypasses normal inventory validation."
                      ></i>
                    </span>
                    <span className="ms-2">
                      <small className="text-muted">Current: </small>
                      <span className={`badge ${editedItem.allowNegativeInventory ? "bg-success" : "bg-secondary"}`}>
                        {editedItem.allowNegativeInventory ? "Enabled" : "Disabled"}
                      </span>
                    </span>
                  </label>
                </div>
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
