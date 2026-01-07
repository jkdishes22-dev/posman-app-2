"use client";

import React, { useState, useEffect, useRef } from "react";
import { Modal, Button, Form, InputGroup } from "react-bootstrap";
import { MaterialButton } from "./MaterialComponents";

interface Item {
    id: string;
    name: string;
    price: number;
    description?: string;
}

interface QuantityModalProps {
    item: Item | null;
    onClose: () => void;
    onConfirm: (quantity: number) => void;
}

const QuantityModal: React.FC<QuantityModalProps> = ({ item, onClose, onConfirm }) => {
    const [quantity, setQuantity] = useState(1);
    const [isValid, setIsValid] = useState(true);
    const inputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        if (item) {
            setQuantity(1);
            setIsValid(true);
            // Focus the input when modal opens
            setTimeout(() => {
                inputRef.current?.focus();
                inputRef.current?.select();
            }, 100);
        }
    }, [item]);

    useEffect(() => {
        setIsValid(quantity > 0 && quantity <= 999);
    }, [quantity]);

    const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = parseInt(e.target.value) || 0;
        setQuantity(value);
    };

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === "Enter" && isValid) {
            handleConfirm();
        } else if (e.key === "Escape") {
            onClose();
        }
    };

    const handleConfirm = () => {
        if (isValid && quantity > 0) {
            onConfirm(quantity);
            onClose();
        }
    };

    const handleIncrement = () => {
        if (quantity < 999) {
            setQuantity(prev => prev + 1);
        }
    };

    const handleDecrement = () => {
        if (quantity > 1) {
            setQuantity(prev => prev - 1);
        }
    };

    if (!item) return null;

    const subtotal = item.price * quantity;

    return (
        <Modal show={true} onHide={onClose} centered>
            <Modal.Header closeButton className="border-0 pb-0">
                <Modal.Title className="fw-bold">
                    <i className="bi bi-plus-circle me-2 text-primary"></i>
                    Add to Bill
                </Modal.Title>
            </Modal.Header>

            <Modal.Body className="pt-0">
                {/* Item Details */}
                <div className="item-preview mb-4">
                    <div className="d-flex align-items-center">
                        <div className="item-icon me-3">
                            <i className="bi bi-box-seam fs-1 text-primary"></i>
                        </div>
                        <div className="item-details">
                            <h5 className="mb-1 fw-bold">{item.name}</h5>
                            <p className="text-muted mb-1">{item.description}</p>
                            <div className="price-display">
                                <span className="h5 text-success mb-0">${item.price.toFixed(2)} each</span>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Quantity Input */}
                <div className="quantity-section">
                    <Form.Label className="fw-medium mb-3">Quantity</Form.Label>
                    <InputGroup className="mb-3">
                        <Button
                            variant="outline-secondary"
                            onClick={handleDecrement}
                            disabled={quantity <= 1}
                            className="quantity-btn"
                        >
                            <i className="bi bi-dash"></i>
                        </Button>

                        <Form.Control
                            ref={inputRef}
                            type="number"
                            value={quantity}
                            onChange={handleQuantityChange}
                            onKeyDown={handleKeyPress}
                            min="1"
                            max="999"
                            className={`text-center fw-bold ${!isValid ? "is-invalid" : ""}`}
                            style={{ fontSize: "1.25rem" }}
                        />

                        <Button
                            variant="outline-secondary"
                            onClick={handleIncrement}
                            disabled={quantity >= 999}
                            className="quantity-btn"
                        >
                            <i className="bi bi-plus"></i>
                        </Button>
                    </InputGroup>

                    {!isValid && (
                        <div className="invalid-feedback d-block">
                            Please enter a valid quantity (1-999)
                        </div>
                    )}
                </div>

                {/* Subtotal Display */}
                <div className="subtotal-section bg-light rounded p-3">
                    <div className="d-flex justify-content-between align-items-center">
                        <span className="fw-medium">Subtotal:</span>
                        <span className="h4 text-success mb-0 fw-bold">
                            ${subtotal.toFixed(2)}
                        </span>
                    </div>
                    <div className="text-muted small text-center mt-1">
                        {quantity} × ${item.price.toFixed(2)}
                    </div>
                </div>
            </Modal.Body>

            <Modal.Footer className="border-0 pt-0">
                <div className="d-flex gap-2 w-100">
                    <MaterialButton
                        variant="secondary"
                        onClick={onClose}
                        className="flex-fill"
                    >
                        <i className="bi bi-x-circle me-2"></i>
                        Cancel
                    </MaterialButton>

                    <MaterialButton
                        variant="success"
                        onClick={handleConfirm}
                        disabled={!isValid}
                        className="flex-fill"
                    >
                        <i className="bi bi-check-circle me-2"></i>
                        Add to Bill
                    </MaterialButton>
                </div>
            </Modal.Footer>
        </Modal>
    );
};

export default QuantityModal;
