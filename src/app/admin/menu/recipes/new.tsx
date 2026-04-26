import React, { useState, useEffect } from "react";
import { Modal, Button, Form } from "react-bootstrap";
import { useApiCall } from "../../../utils/apiUtils";
import { ApiErrorResponse } from "../../../utils/errorUtils";
import ErrorDisplay from "../../../components/ErrorDisplay";

function AddSubItemModal({
  isModalOpen,
  closeModal,
  addSubItemToItem,
  addSubItemError,
  setAddSubItemError,
  selectedGroupItemId,
}) {
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
        const normalizedPricelists = Array.isArray(pricelistsData) ? pricelistsData : [];
        setPricelists(normalizedPricelists);
        await setPricelistForSelectedGroupItem(normalizedPricelists);
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

  const setPricelistForSelectedGroupItem = async (availablePricelists: any[]) => {
    if (!selectedGroupItemId || availablePricelists.length === 0) {
      setSelectedPricelistId("");
      return;
    }

    for (const pricelist of availablePricelists) {
      const result = await apiCall(`/api/menu/items/pricelist?pricelistId=${pricelist.id}`);
      if (result.status === 200) {
        const pricelistItems = result.data?.items || [];
        const hasSelectedGroupItem = pricelistItems.some((item: any) => item.id === selectedGroupItemId);

        if (hasSelectedGroupItem) {
          setSelectedPricelistId(String(pricelist.id));
          return;
        }
      }
    }

    setSelectedPricelistId("");
  };

  const fetchItemsFromPricelist = async (pricelistId: string) => {
    setLoadingItems(true);
    try {
      const result = await apiCall(`/api/menu/items/pricelist?pricelistId=${pricelistId}`);
      if (result.status === 200) {
        // Ingredients should be sellable leaf items (non-group) from this pricelist
        const allItems = result.data?.items || [];
        const sellableItems = allItems.filter(
          (item: any) => item.isGroup !== true && item.id !== selectedGroupItemId,
        );
        setItems(Array.isArray(sellableItems) ? sellableItems : []);
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
            <Form.Label>Pricelist <span className="text-muted small">(Auto-selected from the composite item)</span></Form.Label>
            <Form.Control
              as="select"
              value={selectedPricelistId}
              onChange={(e) => setSelectedPricelistId(e.target.value)}
              disabled
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
            <Form.Label>Ingredient Item <span className="text-muted small">(Any sellable non-group item in this pricelist)</span></Form.Label>
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
                    ? "No pricelist linked to selected composite item"
                    : items.length === 0
                    ? "No eligible sellable items in this pricelist"
                    : "Select Ingredient Item"}
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
              When 1 unit of this composite item is sold, this amount will be deducted from each selected ingredient item.
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

