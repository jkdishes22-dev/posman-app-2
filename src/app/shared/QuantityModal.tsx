import React, { useState } from "react";
import { Modal, Button } from "react-bootstrap";
import { Item } from "../admin/menu/category/types";

interface QuantityModalProps {
  item: Item | null;
  onClose: () => void;
  onConfirm: (quantity: number) => void;
}

const QuantityModal: React.FC<QuantityModalProps> = ({
  item,
  onClose,
  onConfirm,
}) => {
  const [quantity, setQuantity] = useState<string>("");

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
    if (!isNaN(quantityNumber) && quantityNumber > 0) {
      onConfirm(quantityNumber);
      onClose(); // Close modal after confirming
    }
  };

  return (
    <Modal show={!!item} onHide={onClose}>
      <Modal.Header closeButton>
        <Modal.Title>Specify Quantity for {item?.name}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="text-center">
          <h5>Choose Quantity:</h5>
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
          <input
            type="text"
            value={quantity}
            onChange={handleInputChange}
            className="form-control mt-3"
            placeholder="Enter quantity (1 or more)"
          />
          <Button variant="danger" onClick={handleClear} className="mt-2 w-100">
            Clear
          </Button>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onClose}>
          Close
        </Button>
        <Button
          variant="primary"
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
