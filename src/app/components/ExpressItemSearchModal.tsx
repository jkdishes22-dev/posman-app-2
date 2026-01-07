"use client";
import React, { useState, useEffect, useRef } from "react";
import { Modal, Form, Button, Spinner, Alert, Badge, Card } from "react-bootstrap";
import { useApiCall } from "../utils/apiUtils";
import ErrorDisplay from "./ErrorDisplay";

interface ItemSearchResult {
  id: number;
  name: string;
  code: string;
  category: string;
  pricelists: Array<{
    pricelistId: number;
    pricelistName: string;
    price: number;
    currency: string;
    isDefault: boolean;
  }>;
  totalPricelists: number;
}

interface ExpressItemSearchModalProps {
  show: boolean;
  onHide: () => void;
  onPricelistSelect?: (pricelistId: number, pricelistName: string) => void;
  onItemSelect?: (item: ItemSearchResult) => void;
}

export default function ExpressItemSearchModal({
  show,
  onHide,
  onPricelistSelect,
  onItemSelect
}: ExpressItemSearchModalProps) {
  const apiCall = useApiCall();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<any>(null);
  const [selectedItem, setSelectedItem] = useState<ItemSearchResult | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);

  // Focus input when modal opens
  useEffect(() => {
    if (show && inputRef.current) {
      inputRef.current.focus();
    }
  }, [show]);

  // Clear state when modal closes
  useEffect(() => {
    if (!show) {
      setQuery("");
      setResults([]);
      setSelectedItem(null);
      setError(null);
    }
  }, [show]);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) {
      setResults([]);
      return;
    }

    setIsLoading(true);
    setError(null);
    setErrorDetails(null);

    const result = await apiCall(`/api/items/search?q=${encodeURIComponent(searchQuery)}&limit=20`);

    if (result.status === 200) {
      setResults(result.data.items || []);
    } else {
      setError(result.error || "Search failed");
      setErrorDetails(result.errorDetails);
      setResults([]);
    }

    setIsLoading(false);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setQuery(value);
    setError(null);

    // Debounced search
    const timeoutId = setTimeout(() => {
      performSearch(value);
    }, 300);

    return () => clearTimeout(timeoutId);
  };

  const handleItemClick = (item: ItemSearchResult) => {
    setSelectedItem(item);
  };

  const handlePricelistClick = (pricelistId: number, pricelistName: string) => {
    if (onPricelistSelect) {
      onPricelistSelect(pricelistId, pricelistName);
    }
    onHide();
  };

  const handleItemSelect = (item: ItemSearchResult) => {
    if (onItemSelect) {
      onItemSelect(item);
    }
    onHide();
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setSelectedItem(null);
    setError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <Modal show={show} onHide={onHide} size="lg" centered>
      <Modal.Header closeButton>
        <Modal.Title>
          <i className="bi bi-search me-2"></i>
          Express Item Search
        </Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: "500px", overflowY: "auto" }}>
        {/* Search Input */}
        <div className="mb-4">
          <Form.Label className="fw-semibold">Search for items by name</Form.Label>
          <div className="input-group">
            <Form.Control
              ref={inputRef}
              type="text"
              value={query}
              onChange={handleInputChange}
              placeholder="Type item name to search..."
              className="form-control-lg"
            />
            <Button
              variant="outline-secondary"
              onClick={clearSearch}
              disabled={!query}
            >
              <i className="bi bi-x"></i>
            </Button>
            {isLoading && (
              <div className="position-absolute top-50 end-0 translate-middle-y me-5">
                <Spinner size="sm" />
              </div>
            )}
          </div>
        </div>

        {/* Error Display */}
        <ErrorDisplay
          error={error}
          errorDetails={errorDetails}
          onDismiss={() => {
            setError(null);
            setErrorDetails(null);
          }}
        />

        {/* Search Results */}
        {query.length >= 2 && (
          <div className="mb-3">
            <div className="d-flex justify-content-between align-items-center mb-3">
              <h6 className="mb-0">
                {isLoading ? "Searching..." : `Found ${results.length} item${results.length !== 1 ? "s" : ""}`}
              </h6>
              {results.length > 0 && (
                <Button
                  variant="outline-primary"
                  size="sm"
                  onClick={() => setSelectedItem(null)}
                >
                  <i className="bi bi-arrow-left me-1"></i>
                  Back to Results
                </Button>
              )}
            </div>

            {!isLoading && results.length === 0 && (
              <div className="text-center py-4">
                <i className="bi bi-search text-muted" style={{ fontSize: "2rem" }}></i>
                <p className="text-muted mt-2 mb-0">No items found for "{query}"</p>
              </div>
            )}

            {!isLoading && results.length > 0 && !selectedItem && (
              <div className="list-group">
                {results.map((item) => (
                  <div
                    key={item.id}
                    className="list-group-item list-group-item-action"
                    onClick={() => handleItemClick(item)}
                    style={{ cursor: "pointer" }}
                  >
                    <div className="d-flex justify-content-between align-items-start">
                      <div className="flex-grow-1">
                        <h6 className="mb-1 fw-semibold">{item.name}</h6>
                        <small className="text-muted">
                          <i className="bi bi-tag me-1"></i>
                          {item.code} • {item.category}
                        </small>
                        <div className="mt-1">
                          <small className="text-success">
                            <i className="bi bi-list-ul me-1"></i>
                            Available in {item.totalPricelists} pricelist{item.totalPricelists !== 1 ? "s" : ""}
                          </small>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Selected Item Details */}
            {selectedItem && (
              <Card>
                <Card.Header className="bg-light">
                  <div className="d-flex justify-content-between align-items-center">
                    <h6 className="mb-0">{selectedItem.name}</h6>
                    <Button
                      variant="outline-secondary"
                      size="sm"
                      onClick={() => setSelectedItem(null)}
                    >
                      <i className="bi bi-x"></i>
                    </Button>
                  </div>
                </Card.Header>
                <Card.Body>
                  <div className="row mb-3">
                    <div className="col-md-6">
                      <strong>Code:</strong> {selectedItem.code}
                    </div>
                    <div className="col-md-6">
                      <strong>Category:</strong> {selectedItem.category}
                    </div>
                  </div>

                  <h6 className="mb-3">Available in Pricelists:</h6>
                  <div className="list-group">
                    {selectedItem.pricelists.map((pricelist, index) => (
                      <div
                        key={index}
                        className="list-group-item d-flex justify-content-between align-items-center"
                      >
                        <div>
                          <div className="fw-semibold">
                            {pricelist.pricelistName}
                            {pricelist.isDefault && (
                              <Badge bg="primary" className="ms-2">Default</Badge>
                            )}
                          </div>
                          <small className="text-muted">
                            {pricelist.currency} {pricelist.price}
                          </small>
                        </div>
                        <Button
                          variant="primary"
                          size="sm"
                          onClick={() => handlePricelistClick(pricelist.pricelistId, pricelist.pricelistName)}
                        >
                          <i className="bi bi-arrow-right me-1"></i>
                          Go to Pricelist
                        </Button>
                      </div>
                    ))}
                  </div>
                </Card.Body>
              </Card>
            )}
          </div>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          Close
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
