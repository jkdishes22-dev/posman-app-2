import React, { useState, useEffect } from "react";
import { Modal, Button, Form, Spinner } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../utils/errorUtils";

const SubmitBillModal = ({ show, onHide, selectedBill, onBillSubmitted }) => {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [mpesaAmount, setMpesaAmount] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>("");
  const [paymentValidationError, setPaymentValidationError] = useState<string>("");
  const [isValidatingReference, setIsValidatingReference] = useState(false);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);

  const apiCall = useApiCall();

  const totalAmount = selectedBill?.total || 0;

  const resetForm = () => {
    setPaymentMethod("cash");
    setCashAmount("");
    setMpesaAmount("");
    setMpesaCode("");
    setErrorMessage("");
    setPaymentValidationError("");
    setErrorDetails(null);
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  const totalPaid =
    (paymentMethod === "cash" || paymentMethod === "cash_mpesa"
      ? Number(cashAmount) || 0
      : 0) +
    (paymentMethod === "mpesa" || paymentMethod === "cash_mpesa"
      ? Number(mpesaAmount) || 0
      : 0);

  const normalizedTotalAmount = Number(totalAmount) || 0;
  const normalizedTotalPaid = Number(totalPaid) || 0;
  const pendingAmount = normalizedTotalAmount - normalizedTotalPaid;

  // Debounced M-Pesa reference validation
  useEffect(() => {
    if (mpesaCode && (paymentMethod === "mpesa" || paymentMethod === "cash_mpesa")) {
      const timeoutId = setTimeout(async () => {
        setIsValidatingReference(true);
        setPaymentValidationError("");

        try {
          const result = await apiCall("/api/payments/check-reference", {
            method: "POST",
            body: JSON.stringify({
              reference: mpesaCode.trim(),
              billId: selectedBill?.id
            })
          });
          if (result.status === 200) {
            if (result.data.exists) {
              setPaymentValidationError("M-Pesa reference code already exists. Please use a different code.");
            } else {
              setPaymentValidationError("");
            }
          } else {
            setPaymentValidationError("Failed to validate M-Pesa reference code.");
          }
        } catch (error) {
          setPaymentValidationError("Network error while validating M-Pesa reference code.");
        } finally {
          setIsValidatingReference(false);
        }
      }, 500);

      return () => clearTimeout(timeoutId);
    } else {
      setPaymentValidationError("");
    }
  }, [mpesaCode, paymentMethod, apiCall]);

  const handleCashChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      const newCashAmount = value;
      const newTotalPaid =
        (paymentMethod === "mpesa" || paymentMethod === "cash_mpesa"
          ? Number(mpesaAmount)
          : 0) + Number(newCashAmount);

      if (newTotalPaid <= totalAmount) {
        setCashAmount(newCashAmount);
      } else {
        setCashAmount(
          (
            totalAmount -
            (paymentMethod === "mpesa" || paymentMethod === "cash_mpesa"
              ? Number(mpesaAmount)
              : 0)
          ).toString(),
        );
      }
    }
  };

  const handleMpesaChange = (e) => {
    const value = e.target.value;
    if (/^\d*\.?\d*$/.test(value)) {
      const newMpesaAmount = value;
      const newTotalPaid =
        (paymentMethod === "cash" || paymentMethod === "cash_mpesa"
          ? Number(cashAmount)
          : 0) + Number(newMpesaAmount);

      if (newTotalPaid <= totalAmount) {
        setMpesaAmount(newMpesaAmount);
      } else {
        setMpesaAmount(
          (
            totalAmount -
            (paymentMethod === "cash" || paymentMethod === "cash_mpesa"
              ? Number(cashAmount)
              : 0)
          ).toString(),
        );
      }
    }
  };

  const handleSubmit = async () => {
    // Clear previous errors
    setErrorMessage("");
    setPaymentValidationError("");
    setErrorDetails(null);

    // Validation 1: M-Pesa reference code required
    if (
      (paymentMethod === "mpesa" || paymentMethod === "cash_mpesa") &&
      !mpesaCode &&
      Number(mpesaAmount) > 0
    ) {
      setPaymentValidationError("M-Pesa reference code is required for M-Pesa payments.");
      return;
    }

    // Validation 2: M-Pesa reference code uniqueness (if validation is in progress, wait)
    if (isValidatingReference) {
      setPaymentValidationError("Please wait while validating M-Pesa reference code...");
      return;
    }

    if (paymentValidationError) {
      return;
    }

    // Validation 3: For reopened bills, check if payments already exist
    // If bill is reopened and has existing payments, allow resubmission without new payments
    const isReopened = selectedBill?.status === "reopened";
    const existingPayments = selectedBill?.bill_payments || [];
    const existingTotalPaid = existingPayments.reduce(
      (sum, bp) => sum + (bp.payment?.creditAmount || 0),
      0
    );

    if (isReopened && existingTotalPaid >= normalizedTotalAmount) {
      // Reopened bill already has full payment - no new payment required
      // Allow submission with 0 payment
    } else {
      // For pending bills or reopened bills with partial/no payments, require full payment
      if (Math.abs(normalizedTotalPaid - normalizedTotalAmount) > 0.01) {
        setPaymentValidationError(`Total paid (KES ${normalizedTotalPaid.toFixed(2)}) must equal bill total (KES ${normalizedTotalAmount.toFixed(2)}).`);
        return;
      }
    }

    if (selectedBill.bill_items.length === 0) {
      setErrorMessage("Cannot submit bill with no items.");
      return;
    }

    // For reopened bills with existing full payment, allow 0 payment
    const paymentDetails = {
      paymentMethod: isReopened && existingTotalPaid >= normalizedTotalAmount ? "cash" : paymentMethod,
      cashAmount:
        isReopened && existingTotalPaid >= normalizedTotalAmount
          ? 0
          : paymentMethod === "cash" || paymentMethod === "cash_mpesa"
            ? Number(cashAmount)
            : 0,
      mpesaAmount:
        isReopened && existingTotalPaid >= normalizedTotalAmount
          ? 0
          : paymentMethod === "mpesa" || paymentMethod === "cash_mpesa"
            ? Number(mpesaAmount)
            : 0,
      mpesaCode:
        isReopened && existingTotalPaid >= normalizedTotalAmount
          ? null
          : paymentMethod === "mpesa" || paymentMethod === "cash_mpesa"
            ? mpesaCode
            : null,
      pendingAmount: pendingAmount > 0 ? pendingAmount : 0,
      billId: selectedBill?.id,
    };

    try {
      setIsSubmitting(true);

      const result = await apiCall("/api/bills/submit", {
        method: "POST",
        body: JSON.stringify(paymentDetails),
      });

      if (result.status === 200) {
        onBillSubmitted(result.data.bill);
        handleClose();
      } else {
        // Handle payment validation errors from backend
        if (result.error && (result.error.includes("M-Pesa") || result.error.includes("Total paid") || result.error.includes("reference code"))) {
          setPaymentValidationError(result.error);
        } else {
          setErrorMessage(result.error || "Failed to submit bill");
          setErrorDetails(result.errorDetails);
        }
      }
    } catch (error: any) {
      setErrorMessage("Network error occurred while submitting bill");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal show={show} onHide={handleClose}>
      <Modal.Header closeButton>
        <Modal.Title>
          {selectedBill?.status === "reopened" ? "Resubmit" : "Submit"} Bill - Total: <strong>{totalAmount}</strong>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {selectedBill ? (
          <Form>
            <ErrorDisplay
              error={errorMessage}
              errorDetails={errorDetails}
              onDismiss={() => {
                setErrorMessage("");
                setErrorDetails(null);
              }}
            />

            {paymentValidationError && (
              <div className="alert alert-danger" role="alert">
                {paymentValidationError}
              </div>
            )}

            <Form.Group>
              <Form.Label>Select Payment Method</Form.Label>
              <div>
                <Form.Check
                  type="radio"
                  label="Cash"
                  name="paymentMethod"
                  value="cash"
                  checked={paymentMethod === "cash"}
                  onChange={() => {
                    setPaymentMethod("cash");
                    setPaymentValidationError("");
                  }}
                  style={{ fontSize: "18px" }}
                />
                <Form.Check
                  type="radio"
                  label="M-Pesa"
                  name="paymentMethod"
                  value="mpesa"
                  checked={paymentMethod === "mpesa"}
                  onChange={() => {
                    setPaymentMethod("mpesa");
                    setPaymentValidationError("");
                  }}
                  style={{ fontSize: "18px" }}
                />
                <Form.Check
                  type="radio"
                  label="Cash_mpesa (Cash & M-Pesa)"
                  name="paymentMethod"
                  value="cash_mpesa"
                  checked={paymentMethod === "cash_mpesa"}
                  onChange={() => {
                    setPaymentMethod("cash_mpesa");
                    setPaymentValidationError("");
                  }}
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
                disabled={paymentMethod === "mpesa"}
              />
            </Form.Group>

            <Form.Group>
              <Form.Label>M-Pesa Amount</Form.Label>
              <Form.Control
                type="text"
                value={mpesaAmount}
                onChange={handleMpesaChange}
                disabled={paymentMethod === "cash"}
              />
            </Form.Group>

            {(paymentMethod === "mpesa" || paymentMethod === "cash_mpesa") && (
              <Form.Group>
                <Form.Label>M-Pesa Payment Code</Form.Label>
                <div className="position-relative">
                  <Form.Control
                    type="text"
                    value={mpesaCode}
                    onChange={(e) => {
                      setMpesaCode(e.target.value);
                      setPaymentValidationError("");
                    }}
                    placeholder="Enter M-Pesa payment code"
                    required
                    className={
                      mpesaCode && !isValidatingReference && !paymentValidationError
                        ? "is-valid"
                        : paymentValidationError && mpesaCode
                          ? "is-invalid"
                          : ""
                    }
                  />
                  {isValidatingReference && (
                    <div className="position-absolute top-50 end-0 translate-middle-y me-2">
                      <Spinner animation="border" size="sm" />
                    </div>
                  )}
                </div>
                {mpesaCode && !isValidatingReference && !paymentValidationError && (
                  <div className="valid-feedback">M-Pesa reference code is valid</div>
                )}
              </Form.Group>
            )}

            <div className="card bg-light p-3 mt-3">
              <h6 className="card-title">Payment Summary</h6>
              <div className="row">
                <div className="col-6">
                  <strong>Total Paid:</strong> KES {normalizedTotalPaid.toFixed(2)}
                </div>
                <div className="col-6">
                  <strong>Bill Total:</strong> KES {normalizedTotalAmount.toFixed(2)}
                </div>
              </div>
              <div className="row mt-2">
                <div className="col-6">
                  <strong>Pending Amount:</strong>{" "}
                  <span className={pendingAmount > 0 ? "text-danger fw-bold" : ""}>
                    KES {pendingAmount > 0 ? pendingAmount : "0"}
                  </span>
                </div>
                <div className="col-6">
                  <strong>Validation Status:</strong>{" "}
                  {Math.abs(normalizedTotalPaid - normalizedTotalAmount) <= 0.01 && !paymentValidationError && !isValidatingReference ? (
                    <span className="text-success">✓ Valid</span>
                  ) : (
                    <span className="text-danger">✗ Invalid</span>
                  )}
                </div>
              </div>
            </div>
          </Form>
        ) : (
          <p>No bill selected. Please select a bill to continue.</p>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button
          variant="secondary"
          onClick={handleClose}
          disabled={isSubmitting}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSubmit}
          disabled={
            isSubmitting ||
            !selectedBill ||
            Math.abs(normalizedTotalPaid - normalizedTotalAmount) > 0.01 ||
            paymentValidationError !== "" ||
            isValidatingReference
          }
        >
          {isSubmitting ? (
            <Spinner animation="border" size="sm" />
          ) : (
            "Submit Bill"
          )}
        </Button>
      </Modal.Footer>
    </Modal>
  );
};

export default SubmitBillModal;
