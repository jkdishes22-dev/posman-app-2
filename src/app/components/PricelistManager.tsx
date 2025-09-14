"use client";

import React, { useState, useEffect } from 'react';
import { Card, Row, Col, Button } from 'react-bootstrap';
import { Item, Pricelist, Station } from '../types/types';
import ViewItems from '../admin/menu/category/components/items/items-view';

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
}

const PricelistManager: React.FC<PricelistManagerProps> = ({
    pricelists,
    selectedPricelist,
    onPricelistSelect,
    onAddItem,
    onRefresh,
    isAdmin = false,
    className = ''
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
        <Row className={className}>
            <Col md={4}>
                <Card>
                    <Card.Header>
                        <h6 className="mb-0">Available Pricelists</h6>
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
                                        className={`list-group-item list-group-item-action ${selectedPricelist?.id === pricelist.id ? 'active' : ''}`}
                                        onClick={() => onPricelistSelect(pricelist)}
                                    >
                                        <div className="fw-bold">{pricelist.name}</div>
                                        {pricelist.description && (
                                            <div className="text-muted small">{pricelist.description}</div>
                                        )}
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
                                {selectedPricelist ? selectedPricelist.name : 'Select a Pricelist'}
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
                                setItems={() => { }} // Read-only for non-admin, controlled for admin
                                isBillingSection={false}
                                isPricelistSection={true}
                                isCategoryItemsSection={false}
                                onItemPick={() => { }} // Read-only for non-admin, controlled for admin
                            />
                        )}
                    </Card.Body>
                </Card>
            </Col>
        </Row>
    );
};

export default PricelistManager;
