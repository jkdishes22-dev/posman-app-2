import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Item } from "../types/types";

interface QuantityModalProps {
  item: Item | null;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
  availableQuantity?: number;
  alreadyInBill?: number;
}

const QuantityModal: React.FC<QuantityModalProps> = ({
  item,
  onClose,
  onConfirm,
  availableQuantity,
  alreadyInBill = 0,
}) => {
  const [quantity, setQuantity] = useState<string>("");
  const [quantityError, setQuantityError] = useState<string>("");
  
  const maxAvailable = availableQuantity !== undefined 
    ? availableQuantity - alreadyInBill 
    : undefined;

  const handleNumberClick = (num: string) => {
    // Concatenate number button clicks
    setQuantity((prev) => prev + num);
  };

  const handleClear = () => {
    setQuantity(""); // Clear the input
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    // Update quantity if it’s a valid number or empty
    if (/^\d*$/.test(value)) {
      setQuantity(value);
    }
  };

  const handleConfirm = () => {
    const quantityNumber = parseInt(quantity, 10);
    
    if (isNaN(quantityNumber) || quantityNumber <= 0) {
      setQuantityError("Quantity must be greater than 0");
      return;
    }

    // Validate against available inventory
    if (maxAvailable !== undefined && quantityNumber > maxAvailable) {
      setQuantityError(
        `Cannot add ${quantityNumber} units. Only ${maxAvailable} available ` +
        `(${availableQuantity} total - ${alreadyInBill} already in bill).`
      );
      return;
    }

    setQuantityError("");
    onConfirm(quantityNumber);
    onClose(); // Close modal after confirming
  };

  return (
    <Modal show={!!item} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Specify Quantity for {item?.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center">
          <h5>Choose Quantity:</h5>
          {availableQuantity !== undefined && (
            <div className="alert alert-info mb-3">
              <strong>Available:</strong> {maxAvailable} units
              {alreadyInBill > 0 && (
                <span className="text-muted">
                  {" "}({availableQuantity} total - {alreadyInBill} already in bill)
                </span>
              )}
            </div>
          )}
          {quantityError && (
            <div className="alert alert-danger mb-3">{quantityError}</div>
          )}
          <div className="d-grid gap-2">
            {/* 3x3 grid for numbers */}
            <div className="row mb-2">
              {[1, 2, 3].map((num) => (
                <div className="col" key={num}>
                  <Button
                    variant="outline-primary"
                    onClick={() => handleNumberClick(num.toString())}
                    className="w-100"
                  >
                    {num}
                  </Button>
                </div>
              ))}
            </div>
            <div className="row mb-2">
              {[4, 5, 6].map((num) => (
                <div className="col" key={num}>
                  <Button
                    variant="outline-primary"
                    onClick={() => handleNumberClick(num.toString())}
                    className="w-100"
                  >
                    {num}
                  </Button>
                </div>
              ))}
            </div>
            <div className="row mb-2">
              {[7, 8, 9].map((num) => (
                <div className="col" key={num}>
                  <Button
                    variant="outline-primary"
                    onClick={() => handleNumberClick(num.toString())}
                    className="w-100"
                  >
                    {num}
                  </Button>
                </div>
              ))}
            </div>
            {/* "0" button below the grid */}
            <div className="row">
              <div className="col">
                <Button
                  variant="outline-primary"
                  onClick={() => handleNumberClick("0")}
                  className="w-100"
                >
                  0
                </Button>
              </div>
            </div>
          </div>
          <div className="row align-items-center">
            <div className="col col-8">
              <input
                type="text"
                value={quantity}
                onChange={handleInputChange}
                className="form-control"
                placeholder="Enter quantity (1 or more)"
                style={{ marginTop: "10px" }}
              />
            </div>
            <div className="col col-4 d-flex align-items-center">
              <Button
                variant="danger"
                onClick={handleClear}
                className="w-100"
                style={{ marginTop: "10px" }}
              >
                Clear
              </Button>
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="success"
          onClick={handleConfirm}
          disabled={quantity === "" || parseInt(quantity, 10) <= 0}
        >
          Confirm
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default QuantityModal;
