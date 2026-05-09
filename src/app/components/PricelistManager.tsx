"use client";

import React, { useState, useEffect } from "react";
import { Card, Row, Col, Button } from "react-bootstrap";
import { Item, Pricelist, Station } from "../types/types";
import ViewItems from "../admin/menu/category/components/items/items-view";

interface PricelistWithItems extends Pricelist {
    items: Item[];
    station_id?: number;
    station_name?: string;
}

interface PricelistManagerProps {
    pricelists: PricelistWithItems[];
    selectedPricelist: PricelistWithItems | null;
    onPricelistSelect: (pricelist: PricelistWithItems | null) => void;
    onAddItem?: () => void;
    onRefresh?: () => void;
    isAdmin?: boolean;
    className?: string;
    highlightedItemId?: number | null;
    onHighlightClear?: () => void;
}

const PricelistManager: React.FC<PricelistManagerProps> = ({
    pricelists,
    selectedPricelist,
    onPricelistSelect,
    onAddItem,
    onRefresh,
    isAdmin = false,
    className = "",
    highlightedItemId,
    onHighlightClear
}) => {
    const [isRefreshing, setIsRefreshing] = useState(false);

    const handleRefresh = async () => {
        if (onRefresh) {
            setIsRefreshing(true);
            try {
                await onRefresh();
            } finally {
                setIsRefreshing(false);
            }
        }
    };

    return (
        <Row className={`gx-2 gy-3 ${className}`.trim()}>
            <Col md={4}>
                <Card>
                    <Card.Header className="bg-primary text-white py-2">
                        <h6 className="mb-0">
                            <i className="bi bi-list-ul me-2"></i>
                            Available Pricelists
                        </h6>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {pricelists.length === 0 ? (
                            <div className="p-3 text-muted text-center">
                                No pricelists available
                            </div>
                        ) : (
                            <div className="list-group list-group-flush">
                                {pricelists.map((pricelist, index) => (
                                    <button
                                        key={`${pricelist.id}-${index}`}
                                        className={`list-group-item list-group-item-action ${selectedPricelist?.id === pricelist.id ? "active" : ""}`}
                                        onClick={() => onPricelistSelect(pricelist)}
                                    >
                                        <div className="fw-bold">{pricelist.name}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </Card.Body>
                </Card>
            </Col>

            <Col md={8}>
                <Card>
                    <Card.Header>
                        <div className="d-flex justify-content-between align-items-center">
                            <h6 className="mb-0">
                                {selectedPricelist ? (
                                    <>
                                        <span className="text-muted fw-normal me-2">Selected pricelist:</span>
                                        <span className="fw-semibold">{selectedPricelist.name}</span>
                                    </>
                                ) : (
                                    <span className="text-muted">Select a pricelist</span>
                                )}
                            </h6>
                            {isAdmin && selectedPricelist && (
                                <div className="d-flex gap-2">
                                    {onAddItem && (
                                        <Button
                                            variant="primary"
                                            size="sm"
                                            onClick={onAddItem}
                                        >
                                            <i className="bi bi-plus-circle me-1"></i>
                                            Add Item
                                        </Button>
                                    )}
                                    {onRefresh && (
                                        <Button
                                            variant="outline-secondary"
                                            size="sm"
                                            onClick={handleRefresh}
                                            disabled={isRefreshing}
                                        >
                                            {isRefreshing ? (
                                                <span className="spinner-border spinner-border-sm me-1" role="status" aria-hidden="true"></span>
                                            ) : (
                                                <i className="bi bi-arrow-clockwise me-1"></i>
                                            )}
                                            Refresh
                                        </Button>
                                    )}
                                </div>
                            )}
                        </div>
                    </Card.Header>
                    <Card.Body className="p-0">
                        {!selectedPricelist ? (
                            <div className="text-center text-muted p-4">
                                <i className="bi bi-arrow-left me-2"></i>
                                Select a pricelist to view items
                            </div>
                        ) : (
                            <ViewItems
                                selectedCategory={null}
                                items={selectedPricelist.items || []}
                                pricelistItems={selectedPricelist.items || []}
                                itemError=""
                                setItems={() => { }}
                                isBillingSection={false}
                                isPricelistSection={true}
                                isCategoryItemsSection={false}
                                canEdit={false}
                                onItemPick={() => { }}
                                highlightedItemId={highlightedItemId}
                                onHighlightClear={onHighlightClear}
                            />
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default PricelistManager;
