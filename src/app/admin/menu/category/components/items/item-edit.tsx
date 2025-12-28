import React, { useEffect, useState } from "react";
import {
  Modal,
  Button,
  ModalHeader,
  ModalTitle,
  ModalBody,
  ModalFooter,
} from "react-bootstrap";
import { Item } from "../../../../../types/types";
import { Pricelist } from "@backend/entities/Pricelist";
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
  const [error, setError] = useState<string | null>(null); // Error state
  const [pricelists, setPricelists] = useState([]);
  const [pricelistId, setPricelistId] = useState<number | null>(
    item?.pricelistId || null,
  );
  const [loadingPricelists, setLoadingPricelists] = useState(true);
  const [addItemError, setAddItemError] = useState("");
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  const apiCall = useApiCall();

  useEffect(() => {
    async function fetchPricelists() {
      try {
        const result = await apiCall("/api/menu/pricelists");
        if (result.status === 200) {
          setPricelists(result.data);
          setError(null);
          setErrorDetails(null);
        } else {
          setAddItemError(result.error || "Failed to fetch pricelists");
          setErrorDetails(result.errorDetails);
        }
      } catch (error: any) {
        setAddItemError("Network error occurred");
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      } finally {
        setLoadingPricelists(false); // Set loading to false after fetching
      }
    }
    fetchPricelists();
  }, [apiCall]);

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
      try {
        const result = await apiCall(`/api/menu/items/${editedItem.id}`, {
          method: "PATCH",
          body: JSON.stringify({ ...editedItem, pricelistId }),
        });

        if (result.status === 200) {
          onSave(result.data); // Call save function with the updated item
          onClose(); // Close modal
        } else {
          setError(result.error || "Failed to update item");
          setErrorDetails(result.errorDetails);
        }
      } catch (error: any) {
        setError("Network error occurred");
        setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
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
                  value={Number(pricelistId)} // Controlled component
                  onChange={(e) => setPricelistId(parseInt(e.target.value))}
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
              <div className="form-group">
                <label>
                  Allow Negative Inventory{" "}
                  <i
                    className="bi bi-question-circle text-muted"
                    data-bs-toggle="tooltip"
                    data-bs-placement="right"
                    data-bs-html="true"
                    title="When enabled, this item can be sold even when inventory is zero or negative. Use with caution - this bypasses normal inventory validation."
                  ></i>
                </label>
                <input
                  type="checkbox"
                  name="allowNegativeInventory"
                  checked={editedItem.allowNegativeInventory || false}
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
