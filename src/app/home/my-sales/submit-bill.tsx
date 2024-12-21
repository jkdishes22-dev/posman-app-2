import React, { useState } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";

const SubmitBillModal = ({ show, onHide, selectedBill }) => {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [mpesaAmount, setMpesaAmount] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  const totalAmount = selectedBill?.total;

  const resetForm = () => {
    setPaymentMethod("cash");
    setCashAmount("");
    setMpesaAmount("");
    setMpesaCode("");
    setErrorMessage(null);
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  const totalPaid =
    (paymentMethod === "cash" || paymentMethod === "both" ? Number(cashAmount) : 0) +
    (paymentMethod === "mpesa" || paymentMethod === "both" ? Number(mpesaAmount) : 0);

  const pendingAmount = totalAmount - totalPaid;

  const handleCashChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      const newCashAmount = value;
      const newTotalPaid =
        (paymentMethod === "mpesa" || paymentMethod === "both" ? Number(mpesaAmount) : 0) +
        Number(newCashAmount);

      if (newTotalPaid <= totalAmount) {
        setCashAmount(newCashAmount);
      } else {
        setCashAmount(
          (
            totalAmount -
            (paymentMethod === "mpesa" || paymentMethod === "both" ? Number(mpesaAmount) : 0)
          ).toString()
        );
      }
    }
  };

  const handleMpesaChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      const newMpesaAmount = value;
      const newTotalPaid =
        (paymentMethod === "cash" || paymentMethod === "both" ? Number(cashAmount) : 0) +
        Number(newMpesaAmount);

      if (newTotalPaid <= totalAmount) {
        setMpesaAmount(newMpesaAmount);
      } else {
        setMpesaAmount(
          (
            totalAmount -
            (paymentMethod === "cash" || paymentMethod === "both" ? Number(cashAmount) : 0)
          ).toString()
        );
      }
    }
  };

  const handleSubmit = async () => {
    if ((paymentMethod === "mpesa" || paymentMethod === "both") && !mpesaCode && Number(mpesaAmount) > 0) {
      setErrorMessage("Please enter an M-Pesa payment code.");
      return;
    }

    const paymentDetails = {
      paymentMethod,
      cashAmount: paymentMethod === "cash" || paymentMethod === "both" ? Number(cashAmount) : 0,
      mpesaAmount: paymentMethod === "mpesa" || paymentMethod === "both" ? Number(mpesaAmount) : 0,
      mpesaCode: paymentMethod === "mpesa" || paymentMethod === "both" ? mpesaCode : null,
      pendingAmount: pendingAmount > 0 ? pendingAmount : 0,
      billId: selectedBill?.id
    };

    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const token = localStorage.getItem("token");
      const response = await fetch("/api/bills/submit", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(paymentDetails),
      });

      if (!response.ok) {
        throw new Error(`Failed to submit bill: ${response.statusText}`);
      }

      handleClose();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const isCashFullPayment = Number(cashAmount) >= totalAmount;

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          Submit Bill - Total: <strong>{totalAmount}</strong>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form>
          <Form.Group>
            <Form.Label>Select Payment Method</Form.Label>
            <div>
              <Form.Check
                type="radio"
                label="Cash"
                name="paymentMethod"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
                custom
                style={{ fontSize: "18px" }}
              />
              <Form.Check
                type="radio"
                label="M-Pesa"
                name="paymentMethod"
                value="mpesa"
                checked={paymentMethod === "mpesa"}
                onChange={() => setPaymentMethod("mpesa")}
                custom
                style={{ fontSize: "18px" }}
              />
              <Form.Check
                type="radio"
                label="Both (Cash & M-Pesa)"
                name="paymentMethod"
                value="both"
                checked={paymentMethod === "both"}
                onChange={() => setPaymentMethod("both")}
                custom
                style={{ fontSize: "18px" }}
              />
            </div>
          </Form.Group>

          <Form.Group>
            <Form.Label>Cash Amount</Form.Label>
            <Form.Control
              type="text"
              value={cashAmount}
              onChange={handleCashChange}
              disabled={isCashFullPayment}
            />
          </Form.Group>

          <Form.Group>
            <Form.Label>M-Pesa Amount</Form.Label>
            <Form.Control
              type="text"
              value={mpesaAmount}
              onChange={handleMpesaChange}
              disabled={isCashFullPayment || paymentMethod === "cash"}
            />
          </Form.Group>

          {(paymentMethod === "mpesa" || paymentMethod === "both") && !isCashFullPayment && (
            <Form.Group>
              <Form.Label>M-Pesa Payment Code</Form.Label>
              <Form.Control
                type="text"
                value={mpesaCode}
                onChange={(e) => setMpesaCode(e.target.value)}
                placeholder="Enter M-Pesa payment code"
                required
              />
            </Form.Group>
          )}

          <p>
            <strong>Total Paid:</strong> KES {totalPaid}
          </p>
          <p>
            <strong>Pending Amount:</strong> KES {pendingAmount > 0 ? pendingAmount : "0"}
          </p>

          {errorMessage && <p className="text-danger">{errorMessage}</p>}
        </Form>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={handleClose} disabled={isSubmitting}>
          Cancel
        </Button>
        <Button variant="primary" onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? <Spinner animation="border" size="sm" /> : "Submit Bill"}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SubmitBillModal;
