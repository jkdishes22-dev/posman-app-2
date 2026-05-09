import React, { useState, useEffect, type CSSProperties } from "react";
import { Modal, Button, Form, Spinner, Row, Col } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import { ApiErrorResponse } from "../../utils/errorUtils";
import { touchFriendlyInputStyle } from "../../utils/touchInput";
import {
  computePendingAmount,
  computeTotalPaidFromPaymentFields,
  isSubmitBillPaymentBalanced,
} from "../../utils/submitBillPaymentTotals";
import SubmitBillVirtualKeyboard, {
  type SubmitBillKeyboardMode,
} from "../../components/SubmitBillVirtualKeyboard";

type SubmitBillActiveField = "cash" | "mpesaAmount" | "mpesaCode";

/** Full width within the form column — avoids tiny fields floating in empty space */
const billPaymentInputStyle: CSSProperties = {
  ...touchFriendlyInputStyle,
  width: "100%",
};

const SubmitBillModal = ({ show, onHide, selectedBill, onBillSubmitted }) => {
  const [paymentMethod, setPaymentMethod] = useState("cash");
  const [cashAmount, setCashAmount] = useState("");
  const [mpesaAmount, setMpesaAmount] = useState("");
  const [mpesaCode, setMpesaCode] = useState("");
  /** Which field receives keys from the fallback virtual keyboard */
  const [activeField, setActiveField] = useState<SubmitBillActiveField>("cash");
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
    setActiveField("cash");
    setErrorMessage("");
    setPaymentValidationError("");
    setErrorDetails(null);
  };

  const handleClose = () => {
    resetForm();
    onHide();
  };

  const normalizedTotalAmount = Number(totalAmount) || 0;
  const normalizedTotalPaid =
    Number(computeTotalPaidFromPaymentFields(paymentMethod, cashAmount, mpesaAmount)) || 0;
  const pendingAmount = computePendingAmount(normalizedTotalAmount, normalizedTotalPaid);

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

  useEffect(() => {
    if (!show) return;
    if (paymentMethod === "mpesa") setActiveField((f) => (f === "mpesaCode" ? f : "mpesaAmount"));
    else if (paymentMethod === "cash") setActiveField((f) => (f === "mpesaCode" ? f : "cash"));
  }, [show, paymentMethod]);

  const keyboardMode: SubmitBillKeyboardMode =
    activeField === "mpesaCode" ? "alpha" : "numeric";

  const effectiveNumericTarget = (): "cash" | "mpesaAmount" | null => {
    if (activeField === "mpesaCode") return null;
    if (paymentMethod === "cash") return "cash";
    if (paymentMethod === "mpesa") return "mpesaAmount";
    if (activeField === "cash") return "cash";
    if (activeField === "mpesaAmount") return "mpesaAmount";
    return "cash";
  };

  const applyNumericValue = (field: "cash" | "mpesaAmount", value: string) => {
    const synthetic = {
      target: { value },
      currentTarget: { value },
    } as React.ChangeEvent<HTMLInputElement>;
    if (field === "cash") handleCashChange(synthetic);
    else handleMpesaChange(synthetic);
  };

  const handleVirtualCharacter = (ch: string) => {
    if (keyboardMode === "alpha") {
      setMpesaCode((prev) => prev + ch);
      setPaymentValidationError("");
      return;
    }
    const target = effectiveNumericTarget();
    if (!target) return;
    const cur = target === "cash" ? cashAmount : mpesaAmount;
    if (ch === ".") {
      if (cur.includes(".")) return;
    }
    applyNumericValue(target, cur + ch);
  };

  const handleVirtualSpecialKey = (key: "Backspace" | "Clear" | "Space") => {
    if (keyboardMode === "alpha") {
      if (key === "Backspace") setMpesaCode((c) => c.slice(0, -1));
      else if (key === "Clear") setMpesaCode("");
      else if (key === "Space") setMpesaCode((c) => c + " ");
      setPaymentValidationError("");
      return;
    }
    const target = effectiveNumericTarget();
    if (!target) return;
    const cur = target === "cash" ? cashAmount : mpesaAmount;
    let next: string;
    if (key === "Backspace") next = cur.slice(0, -1);
    else if (key === "Clear") next = "";
    else return;
    applyNumericValue(target, next);
  };

  const activeRing = (field: SubmitBillActiveField) =>
    activeField === field ? "border-primary border-2 shadow-sm" : "";

  const handleCashChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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

  const handleMpesaChange = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      if (!isSubmitBillPaymentBalanced(normalizedTotalAmount, normalizedTotalPaid)) {
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
    <Modal show={show} onHide={handleClose} size="lg" centered dialogClassName="submit-bill-modal-dialog">
      <Modal.Header closeButton className="py-2 px-3">
        <Modal.Title className="fs-6">
          {selectedBill?.status === "reopened" ? "Resubmit" : "Submit"} Bill — Total <strong>{totalAmount}</strong>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body className="py-2 px-3">
        {selectedBill ? (
          <Row className="g-3 flex-lg-nowrap align-items-start">
            <Col lg={6} className="mb-2 mb-lg-0">
              <div className="rounded-3 border bg-white shadow-sm p-2 p-lg-3 h-100">
                <Form className="submit-bill-payment-form">
                  <ErrorDisplay
                    error={errorMessage}
                    errorDetails={errorDetails}
                    onDismiss={() => {
                      setErrorMessage("");
                      setErrorDetails(null);
                    }}
                  />

                  {paymentValidationError && (
                    <div className="alert alert-danger py-2 px-3 mb-3" role="alert">
                      {paymentValidationError}
                    </div>
                  )}

                  <Form.Group className="mb-2">
                    <Form.Label className="fw-semibold small text-body-secondary text-uppercase mb-1">
                      Payment method
                    </Form.Label>
                    <div
                      className="btn-group btn-group-sm w-100"
                      role="group"
                      aria-label="Payment method"
                    >
                      <input
                        type="radio"
                        className="btn-check"
                        name="paymentMethodUi"
                        id="submit-bill-pm-cash"
                        autoComplete="off"
                        checked={paymentMethod === "cash"}
                        onChange={() => {
                          setPaymentMethod("cash");
                          setPaymentValidationError("");
                          setActiveField("cash");
                        }}
                      />
                      <label className="btn btn-outline-primary py-1 px-1" htmlFor="submit-bill-pm-cash">
                        Cash
                      </label>
                      <input
                        type="radio"
                        className="btn-check"
                        name="paymentMethodUi"
                        id="submit-bill-pm-mpesa"
                        autoComplete="off"
                        checked={paymentMethod === "mpesa"}
                        onChange={() => {
                          setPaymentMethod("mpesa");
                          setPaymentValidationError("");
                          setActiveField("mpesaAmount");
                        }}
                      />
                      <label className="btn btn-outline-primary py-1 px-1 lh-sm text-wrap" htmlFor="submit-bill-pm-mpesa">
                        M-Pesa
                      </label>
                      <input
                        type="radio"
                        className="btn-check"
                        name="paymentMethodUi"
                        id="submit-bill-pm-both"
                        autoComplete="off"
                        checked={paymentMethod === "cash_mpesa"}
                        onChange={() => {
                          setPaymentMethod("cash_mpesa");
                          setPaymentValidationError("");
                          setActiveField("cash");
                        }}
                      />
                      <label className="btn btn-outline-primary py-1 px-1 lh-sm text-wrap" htmlFor="submit-bill-pm-both" title="Cash and M-Pesa">
                        Cash&nbsp;+&nbsp;M-Pesa
                      </label>
                    </div>
                  </Form.Group>

                  <Form.Group className="mb-2">
                    <Form.Label className="fw-semibold small">Cash amount</Form.Label>
                    <Form.Control
                      type="text"
                      size="sm"
                      inputMode="decimal"
                      enterKeyHint="done"
                      autoComplete="off"
                      autoCorrect="off"
                      spellCheck={false}
                      style={billPaymentInputStyle}
                      className={activeRing("cash")}
                      value={cashAmount}
                      onChange={handleCashChange}
                      onFocus={() => setActiveField("cash")}
                      disabled={paymentMethod === "mpesa"}
                    />
                  </Form.Group>

                <Form.Group className="mb-2">
                  <Form.Label className="fw-semibold small">M-Pesa amount</Form.Label>
                  <Form.Control
                    type="text"
                    size="sm"
                    inputMode="decimal"
                    enterKeyHint="done"
                    autoComplete="off"
                    autoCorrect="off"
                    spellCheck={false}
                    style={billPaymentInputStyle}
                    className={activeRing("mpesaAmount")}
                    value={mpesaAmount}
                    onChange={handleMpesaChange}
                    onFocus={() => setActiveField("mpesaAmount")}
                    disabled={paymentMethod === "cash"}
                  />
                </Form.Group>

                {(paymentMethod === "mpesa" || paymentMethod === "cash_mpesa") && (
                  <Form.Group className="mb-2">
                    <Form.Label className="fw-semibold small">M-Pesa payment code</Form.Label>
                    <div className="position-relative">
                      <Form.Control
                        type="text"
                        size="sm"
                        inputMode="text"
                        enterKeyHint="done"
                        autoComplete="off"
                        autoCorrect="off"
                        spellCheck={false}
                        style={billPaymentInputStyle}
                        className={[
                          mpesaCode && !isValidatingReference && !paymentValidationError ? "is-valid" : "",
                          paymentValidationError && mpesaCode ? "is-invalid" : "",
                          activeRing("mpesaCode"),
                        ]
                          .filter(Boolean)
                          .join(" ")}
                        value={mpesaCode}
                        onChange={(e) => {
                          setMpesaCode(e.target.value);
                          setPaymentValidationError("");
                        }}
                        onFocus={() => setActiveField("mpesaCode")}
                        placeholder="Enter M-Pesa payment code"
                        required
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

                  <div className="mt-2 pt-2 border-top">
                    <div className="fw-semibold small text-body-secondary text-uppercase mb-1">
                      Summary
                    </div>
                    <div className="rounded-2 bg-light px-2 py-2 small">
                      <div className="d-flex flex-wrap align-items-center justify-content-between gap-2 gap-sm-3 column-gap-3">
                        <span>
                          <span className="text-muted">Paid</span>{" "}
                          <strong>KES {normalizedTotalPaid.toFixed(2)}</strong>
                        </span>
                        <span className="text-muted d-none d-sm-inline">·</span>
                        <span>
                          <span className="text-muted">Pending</span>{" "}
                          <strong className={pendingAmount > 0 ? "text-danger" : ""}>
                            KES {pendingAmount > 0 ? pendingAmount : "0"}
                          </strong>
                        </span>
                        <span className="text-muted d-none d-sm-inline">·</span>
                        <span>
                          <span className="text-muted">Status</span>{" "}
                          {isSubmitBillPaymentBalanced(normalizedTotalAmount, normalizedTotalPaid) && !paymentValidationError && !isValidatingReference ? (
                            <strong className="text-success">OK</strong>
                          ) : (
                            <strong className="text-danger">Invalid</strong>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </Form>
              </div>
            </Col>
            <Col lg={6} className="ps-lg-2">
              <div className="sticky-lg-top" style={{ top: 4 }}>
                <SubmitBillVirtualKeyboard
                  mode={keyboardMode}
                  alphaSpacing="comfortable"
                  onCharacter={handleVirtualCharacter}
                  onSpecialKey={handleVirtualSpecialKey}
                />
              </div>
            </Col>
          </Row>
        ) : (
          <p>No bill selected. Please select a bill to continue.</p>
        )}
      </Modal.Body>
      <Modal.Footer className="py-2 px-3">
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
            !isSubmitBillPaymentBalanced(normalizedTotalAmount, normalizedTotalPaid) ||
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
