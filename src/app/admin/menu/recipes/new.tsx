import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";

function AddSubItemModal({ isModalOpen, closeModal, addSubItemToItem, addSubItemError, setAddSubItemError }) {
  const [pricelists, setPricelists] = useState([]);
  const [selectedPricelistId, setSelectedPricelistId] = useState("");
  const [items, setItems] = useState([]);
  const [subItemId, setSubItemId] = useState("");
  const [deductiblePortion, setDeductiblePortion] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [loadingItems, setLoadingItems] = useState(false);

  const apiCall = useApiCall();

  // Fetch pricelists when modal opens
  useEffect(() => {
    if (isModalOpen) {
      fetchPricelists();
    } else {
      // Reset form when modal closes
      setSelectedPricelistId("");
      setItems([]);
      setSubItemId("");
      setDeductiblePortion("");
    }
  }, [isModalOpen]);

  // Fetch items when pricelist is selected
  useEffect(() => {
    if (selectedPricelistId) {
      fetchItemsFromPricelist(selectedPricelistId);
    } else {
      setItems([]);
    }
  }, [selectedPricelistId]);

  const fetchPricelists = async () => {
    try {
      const result = await apiCall("/api/menu/pricelists");
      if (result.status === 200) {
        const pricelistsData = result.data || [];
        setPricelists(Array.isArray(pricelistsData) ? pricelistsData : []);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch pricelists");
        setErrorDetails(result.errorDetails);
        setPricelists([]);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setPricelists([]);
    }
  };

  const fetchItemsFromPricelist = async (pricelistId: string) => {
    setLoadingItems(true);
    try {
      const result = await apiCall(`/api/menu/items/pricelist?pricelistId=${pricelistId}`);
      if (result.status === 200) {
        // Filter to only show stock items (isStock: true) for ingredients
        const allItems = result.data?.items || [];
        const stockItems = allItems.filter((item: any) => item.isStock === true || item.isGroup === true);
        setItems(Array.isArray(stockItems) ? stockItems : []);
        setError(null);
        setErrorDetails(null);
      } else {
        setError(result.error || "Failed to fetch items");
        setErrorDetails(result.errorDetails);
        setItems([]);
      }
    } catch (error: any) {
      setError("Network error occurred");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!subItemId || !deductiblePortion) {
      setAddSubItemError("Please fill in all fields");
      return;
    }
    await addSubItemToItem(subItemId, deductiblePortion);
  };

  return (
    <Modal show={isModalOpen} onHide={closeModal}>
      <Modal.Header closeButton>
        <Modal.Title>Add Ingredient</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <ErrorDisplay
          error={addSubItemError}
          onDismiss={() => setAddSubItemError("")}
        />
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />
        <Form onSubmit={handleSubmit}>
          <Form.Group controlId="formPricelistId" className="mb-3">
            <Form.Label>Pricelist <span className="text-muted small">(Select pricelist to view items)</span></Form.Label>
            <Form.Control
              as="select"
              value={selectedPricelistId}
              onChange={(e) => setSelectedPricelistId(e.target.value)}
            >
              <option value="">Select Pricelist</option>
              {pricelists.map((pricelist: any) => (
                <option key={pricelist.id} value={pricelist.id}>
                  {pricelist.name}
                </option>
              ))}
            </Form.Control>
          </Form.Group>

          <Form.Group controlId="formSubItemId">
            <Form.Label>Stock Item (Ingredient) <span className="text-muted small">(Only stock items from pricelist can be ingredients)</span></Form.Label>
            {loadingItems ? (
              <div className="text-center py-3">
                <div className="spinner-border spinner-border-sm" role="status">
                  <span className="visually-hidden">Loading...</span>
                </div>
              </div>
            ) : (
              <Form.Control
                as="select"
                value={subItemId}
                onChange={(e) => setSubItemId(e.target.value)}
                disabled={!selectedPricelistId || items.length === 0}
              >
                <option value="">
                  {!selectedPricelistId
                    ? "Select a pricelist first"
                    : items.length === 0
                    ? "No stock items in this pricelist"
                    : "Select Stock Item (Ingredient)"}
                </option>
                {items.map((item: any) => (
                  <option key={item.id} value={item.id}>
                    {item.name} {item.code ? `(${item.code})` : ""}
                  </option>
                ))}
              </Form.Control>
            )}
          </Form.Group>

          <Form.Group controlId="formDeductiblePortion">
            <Form.Label>Portion Size <span className="text-muted small">(Amount deducted per unit sold)</span></Form.Label>
            <Form.Control
              type="number"
              step="0.01"
              min="0"
              placeholder="e.g., 2 for 2 units, 0.5 for 0.5 units"
              value={deductiblePortion}
              onChange={(e) => setDeductiblePortion(e.target.value)}
            />
            <Form.Text className="text-muted">
              When 1 unit of this composite item is sold, this amount will be deducted from the stock item inventory.
            </Form.Text>
          </Form.Group>
          <Button variant="primary" type="submit">
            Add Ingredient
          </Button>
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={closeModal}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}

export default AddSubItemModal;

