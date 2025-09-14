"use client";
import React, { useState, useEffect, useRef } from "react";
import { Form, Button, Spinner, Alert, Badge, Card } from "react-bootstrap";

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

interface InlineItemSearchProps {
  onItemSelect?: (item: ItemSearchResult) => void;
  onPricelistSelect?: (pricelistId: number, pricelistName: string) => void;
  className?: string;
}

export default function InlineItemSearch({
  onItemSelect,
  onPricelistSelect,
  className = ""
}: InlineItemSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<ItemSearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showResults, setShowResults] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      setShowResults(false);
      return;
    }

    const timeoutId = setTimeout(() => {
      performSearch(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  // Close results when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowResults(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const performSearch = async (searchQuery: string) => {
    if (searchQuery.length < 2) return;

    setIsLoading(true);
    setError(null);

    try {
      const token = localStorage.getItem("token");
      const response = await fetch(`/api/items/search?q=${encodeURIComponent(searchQuery)}&limit=10`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        setResults(data.items || []);
        setShowResults(true);
      } else {
        const errorData = await response.json();
        setError(errorData.message || "Search failed");
        setResults([]);
        setShowResults(false);
      }
    } catch (err: any) {
      setError("Network error occurred while searching");
      setResults([]);
      setShowResults(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    setError(null);
  };

  const handleItemSelect = (item: ItemSearchResult) => {
    setQuery(item.name);
    setShowResults(false);
    if (onItemSelect) {
      onItemSelect(item);
    }
  };

  const handlePricelistSelect = (pricelistId: number, pricelistName: string) => {
    setShowResults(false);
    if (onPricelistSelect) {
      onPricelistSelect(pricelistId, pricelistName);
    }
  };

  const clearSearch = () => {
    setQuery("");
    setResults([]);
    setShowResults(false);
    setError(null);
    if (inputRef.current) {
      inputRef.current.focus();
    }
  };

  return (
    <div ref={searchRef} className={`position-relative ${className}`}>
      <div className="input-group mb-3">
        <Form.Control
          ref={inputRef}
          type="text"
          value={query}
          onChange={handleInputChange}
          onFocus={() => query.length >= 2 && setShowResults(true)}
          placeholder="Search items to display in current view..."
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

      {error && (
        <Alert variant="danger" className="mb-3">
          <i className="bi bi-exclamation-triangle me-2"></i>
          {error}
        </Alert>
      )}

      {/* Search Results */}
      {showResults && results.length > 0 && (
        <Card className="mb-3">
          <Card.Header className="bg-light">
            <h6 className="mb-0">
              <i className="bi bi-search me-2"></i>
              Search Results ({results.length} item{results.length !== 1 ? 's' : ''})
            </h6>
          </Card.Header>
          <Card.Body className="p-0">
            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {results.map((item) => (
                <div key={item.id} className="border-bottom p-3">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="flex-grow-1">
                      <h6 className="mb-1 fw-semibold">{item.name}</h6>
                      <small className="text-muted">
                        <i className="bi bi-tag me-1"></i>
                        {item.code} • {item.category}
                      </small>
                    </div>
                    <Button
                      variant="outline-primary"
                      size="sm"
                      onClick={() => handleItemSelect(item)}
                    >
                      <i className="bi bi-eye me-1"></i>
                      Show Item
                    </Button>
                  </div>
                  
                  {item.pricelists.length > 0 && (
                    <div>
                      <small className="text-success mb-2 d-block">
                        <i className="bi bi-list-ul me-1"></i>
                        Available in {item.totalPricelists} pricelist{item.totalPricelists !== 1 ? 's' : ''}:
                      </small>
                      <div className="d-flex flex-wrap gap-2">
                        {item.pricelists.map((pricelist, index) => (
                          <Button
                            key={index}
                            variant="outline-secondary"
                            size="sm"
                            onClick={() => handlePricelistSelect(pricelist.pricelistId, pricelist.pricelistName)}
                            className="d-flex align-items-center"
                          >
                            <span className="me-1">{pricelist.pricelistName}</span>
                            {pricelist.isDefault && (
                              <Badge bg="primary" className="ms-1">Default</Badge>
                            )}
                            <small className="ms-1 text-muted">
                              {pricelist.currency} {pricelist.price}
                            </small>
                          </Button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </Card.Body>
        </Card>
      )}

      {showResults && query.length >= 2 && results.length === 0 && !isLoading && (
        <Card className="mb-3">
          <Card.Body className="text-center py-4">
            <i className="bi bi-search text-muted" style={{ fontSize: '2rem' }}></i>
            <p className="text-muted mt-2 mb-0">No items found for "{query}"</p>
          </Card.Body>
        </Card>
      )}
    </div>
  );
}
