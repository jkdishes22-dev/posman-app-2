"use client";
import React, { useState, useEffect, useRef } from "react";
import { Form, Button, Spinner, Alert } from "react-bootstrap";

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

interface GlobalItemSearchProps {
    onItemSelect?: (item: ItemSearchResult) => void;
    placeholder?: string;
    showResults?: boolean;
    className?: string;
}

export default function GlobalItemSearch({
    onItemSelect,
    placeholder = "Search items by name...",
    showResults = true,
    className = ""
}: GlobalItemSearchProps) {
    const [query, setQuery] = useState("");
    const [results, setResults] = useState<ItemSearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [showDropdown, setShowDropdown] = useState(false);
    const [selectedIndex, setSelectedIndex] = useState(-1);

    const searchRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Debounced search
    useEffect(() => {
        if (query.length < 2) {
            setResults([]);
            setShowDropdown(false);
            return;
        }

        const timeoutId = setTimeout(() => {
            performSearch(query);
        }, 300);

        return () => clearTimeout(timeoutId);
    }, [query]);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
                setSelectedIndex(-1);
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
                setShowDropdown(true);
                setSelectedIndex(-1);
            } else {
                const errorData = await response.json();
                setError(errorData.message || "Search failed");
                setResults([]);
                setShowDropdown(false);
            }
        } catch (err: any) {
            setError("Network error occurred while searching");
            setResults([]);
            setShowDropdown(false);
        } finally {
            setIsLoading(false);
        }
    };

    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setQuery(e.target.value);
        setError(null);
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (!showDropdown || results.length === 0) return;

        switch (e.key) {
            case "ArrowDown":
                e.preventDefault();
                setSelectedIndex(prev =>
                    prev < results.length - 1 ? prev + 1 : prev
                );
                break;
            case "ArrowUp":
                e.preventDefault();
                setSelectedIndex(prev => prev > 0 ? prev - 1 : -1);
                break;
            case "Enter":
                e.preventDefault();
                if (selectedIndex >= 0 && selectedIndex < results.length) {
                    handleItemSelect(results[selectedIndex]);
                }
                break;
            case "Escape":
                setShowDropdown(false);
                setSelectedIndex(-1);
                break;
        }
    };

    const handleItemSelect = (item: ItemSearchResult) => {
        setQuery(item.name);
        setShowDropdown(false);
        setSelectedIndex(-1);
        if (onItemSelect) {
            onItemSelect(item);
        }
    };

    const clearSearch = () => {
        setQuery("");
        setResults([]);
        setShowDropdown(false);
        setSelectedIndex(-1);
        setError(null);
        if (inputRef.current) {
            inputRef.current.focus();
        }
    };

    return (
        <div ref={searchRef} className={`position-relative ${className}`}>
            <div className="input-group">
                <Form.Control
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    onFocus={() => query.length >= 2 && setShowDropdown(true)}
                    placeholder={placeholder}
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
                <Alert variant="danger" className="mt-2 mb-0">
                    <i className="bi bi-exclamation-triangle me-2"></i>
                    {error}
                </Alert>
            )}

            {showResults && showDropdown && results.length > 0 && (
                <div className="dropdown-menu show w-100" style={{ maxHeight: '400px', overflowY: 'auto' }}>
                    <div className="dropdown-header">
                        <i className="bi bi-search me-2"></i>
                        Found {results.length} item{results.length !== 1 ? 's' : ''}
                    </div>
                    {results.map((item, index) => (
                        <div
                            key={item.id}
                            className={`dropdown-item d-flex justify-content-between align-items-start ${index === selectedIndex ? 'active' : ''
                                }`}
                            onClick={() => handleItemSelect(item)}
                            style={{ cursor: 'pointer' }}
                        >
                            <div className="flex-grow-1">
                                <div className="fw-semibold">{item.name}</div>
                                <small className="text-muted">
                                    <i className="bi bi-tag me-1"></i>
                                    {item.code} • {item.category}
                                </small>
                                {item.totalPricelists > 0 && (
                                    <div className="mt-1">
                                        <small className="text-success">
                                            <i className="bi bi-list-ul me-1"></i>
                                            Available in {item.totalPricelists} pricelist{item.totalPricelists !== 1 ? 's' : ''}
                                        </small>
                                    </div>
                                )}
                            </div>
                            <div className="text-end">
                                {item.pricelists.map((pricelist, idx) => (
                                    <div key={idx} className="small">
                                        <span className={`badge ${pricelist.isDefault ? 'bg-primary' : 'bg-secondary'} me-1`}>
                                            {pricelist.pricelistName}
                                        </span>
                                        <span className="text-muted">
                                            {pricelist.currency} {pricelist.price}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showResults && showDropdown && query.length >= 2 && results.length === 0 && !isLoading && (
                <div className="dropdown-menu show w-100">
                    <div className="dropdown-item text-center text-muted py-3">
                        <i className="bi bi-search me-2"></i>
                        No items found for "{query}"
                    </div>
                </div>
            )}
        </div>
    );
}
