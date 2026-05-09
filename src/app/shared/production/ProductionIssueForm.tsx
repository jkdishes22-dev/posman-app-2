"use client";
import { todayEAT } from "../eatDate";
import FilterDatePicker from "../FilterDatePicker";

import React, { useState, useEffect, useCallback } from "react";
import { Form, Button, Spinner, Alert } from "react-bootstrap";
import { useApiCall } from "../../utils/apiUtils";
import ErrorDisplay from "../../components/ErrorDisplay";
import HelpPopover from "../../components/HelpPopover";
import { ApiErrorResponse } from "../../utils/errorUtils";
import {
  loadIssueProductionItemOptions,
  type IssueProductionItemOption,
} from "./loadIssueProductionOptions";

type ProductionIssueFormProps = {
  onIssued?: () => void;
  submitLabel?: string;
  className?: string;
};

export default function ProductionIssueForm({
  onIssued,
  submitLabel = "Issue Production",
  className,
}: ProductionIssueFormProps) {
  const apiCall = useApiCall();

  const [options, setOptions] = useState<IssueProductionItemOption[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [listError, setListError] = useState<string | null>(null);
  const [listErrorDetails, setListErrorDetails] = useState<ApiErrorResponse | null>(null);

  const [selectedId, setSelectedId] = useState<string>("");
  const [quantity, setQuantity] = useState("");
  const [issueDate, setIssueDate] = useState(() => todayEAT());
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [errorDetails, setErrorDetails] = useState<ApiErrorResponse | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const selected = options.find((o) => String(o.id) === selectedId) ?? null;

  const loadItems = useCallback(async () => {
    setLoadingItems(true);
    setListError(null);
    setListErrorDetails(null);
    const { options: next, error: err, errorDetails: det } = await loadIssueProductionItemOptions(
      apiCall,
    );
    if (err) {
      setOptions([]);
      setListError(err);
      setListErrorDetails(det);
    } else {
      setOptions(next);
    }
    setLoadingItems(false);
  }, [apiCall]);

  useEffect(() => {
    void loadItems();
  }, [loadItems]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setError(null);
    setErrorDetails(null);
    setSuccessMessage(null);

    if (!selected) {
      setFormError("Please select an item to issue.");
      return;
    }
    if (!quantity || Number(quantity) <= 0) {
      setFormError("Quantity must be a positive number.");
      return;
    }
    if (!issueDate) {
      setFormError("Please select an issue date.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        item_id: selected.id,
        quantity_prepared: Number(quantity),
        notes: notes.trim() || null,
        issue_date: issueDate,
      };

      const result = await apiCall("/api/production/preparations/issue-directly", {
        method: "POST",
        body: JSON.stringify(payload),
      });

      if (result.status >= 200 && result.status < 300) {
        setSuccessMessage(
          `Successfully issued ${quantity} units of ${selected.name} to inventory.`,
        );
        setSelectedId("");
        setQuantity("");
        setNotes("");
        setIssueDate(todayEAT());
        void loadItems();
        onIssued?.();
      } else if (result.status === 403) {
        setError(result.error || "Access denied: Missing permissions");
        setErrorDetails(result.errorDetails ?? null);
      } else {
        setFormError(result.error || "Failed to issue production.");
        setErrorDetails(result.errorDetails ?? null);
      }
    } catch {
      setFormError("Network error occurred.");
      setErrorDetails({ message: "Network error occurred", networkError: true, status: 0 });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={className}>
      <ErrorDisplay
        error={listError}
        errorDetails={listErrorDetails}
        onDismiss={() => {
          setListError(null);
          setListErrorDetails(null);
        }}
      />
      <ErrorDisplay
        error={error || formError}
        errorDetails={errorDetails}
        onDismiss={() => {
          setError(null);
          setErrorDetails(null);
          setFormError(null);
        }}
      />

      {successMessage && (
        <Alert variant="success" dismissible onClose={() => setSuccessMessage(null)}>
          {successMessage}
        </Alert>
      )}

      <Form onSubmit={handleSubmit}>
        <Form.Group controlId="issue-form-item" className="mb-3">
          <div className="d-flex align-items-center gap-1 mb-1">
            <Form.Label className="mb-0">
              Item to Issue <span className="text-danger">*</span>
            </Form.Label>
            <HelpPopover id="issue-form-item-help" title="Eligible items">
              Only active sellable <strong>leaf</strong> items (not composite groups). Current stock is shown per row so you can sanity-check before issuing.
            </HelpPopover>
          </div>
          {loadingItems ? (
            <div className="text-center py-3">
              <Spinner animation="border" size="sm" role="status" />
              <span className="ms-2 text-muted">Loading items…</span>
            </div>
          ) : (
            <Form.Select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              required
            >
              <option value="">
                {options.length === 0 ? "No eligible items to issue" : "Select item (non-group sellable)"}
              </option>
              {options.map((item) => (
                <option key={item.id} value={String(item.id)}>
                  {item.name}
                  {item.code ? ` (${item.code})` : ""} — Available: {item.available}
                </option>
              ))}
            </Form.Select>
          )}
        </Form.Group>

        <div className="row">
          <div className="col-md-6">
            <Form.Group controlId="issue-form-qty" className="mb-3">
              <Form.Label>
                Quantity to Issue <span className="text-danger">*</span>
              </Form.Label>
              <Form.Control
                type="number"
                min={1}
                step={1}
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="Enter quantity"
                required
              />
            </Form.Group>
          </div>
          <div className="col-md-6">
            <FilterDatePicker
              id="issue-form-date"
              label="Issue Date *"
              value={issueDate}
              onChange={setIssueDate}
              allowEmpty={false}
              maxDate={new Date()}
              wrapperClassName="mb-3"
            />
          </div>
        </div>

        {selected && (
          <Form.Group controlId="issue-form-current-inv" className="mb-3">
            <Form.Label>Current stock (available)</Form.Label>
            <Form.Control type="text" value={selected.available} readOnly className="bg-light" />
          </Form.Group>
        )}

        <Form.Group controlId="issue-form-notes" className="mb-3">
          <Form.Label>Notes (optional)</Form.Label>
          <Form.Control
            as="textarea"
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add any relevant notes about this production issue"
          />
        </Form.Group>

        <Button
          variant="primary"
          type="submit"
          disabled={isSubmitting || !selectedId || !quantity || !issueDate || loadingItems}
        >
          {isSubmitting ? (
            <>
              <Spinner animation="border" size="sm" className="me-2" />
              Issuing…
            </>
          ) : (
            <>
              <i className="bi bi-check-circle me-2" />
              {submitLabel}
            </>
          )}
        </Button>
      </Form>
    </div>
  );
}
