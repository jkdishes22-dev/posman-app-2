"use client";

import React, { useState } from "react";
import { Alert, Collapse, Badge } from "react-bootstrap";
import { RowMatchInfo } from "@services/PricelistUploadService";

interface SmartMatchSuggestionsProps {
  validationResult: any;
  userConfirmations: Map<number, "create" | "update" | "skip">;
  onConfirmationChange: (index: number, action: "create" | "update" | "skip") => void;
}

export default function SmartMatchSuggestions({
  validationResult,
  userConfirmations,
  onConfirmationChange,
}: SmartMatchSuggestionsProps) {
  const [showSuggestions, setShowSuggestions] = useState(true);
  const rows: any[] = validationResult.rows || [];
  const rowMatches: RowMatchInfo[] = validationResult.rowMatches || [];

  const itemsNeedingReview = rows
    .map((row: any, index: number) => ({
      index,
      row,
      match: rowMatches[index] ?? null,
    }))
    .filter(({ match }) => !match?.itemId || match.confidence < 70);

  if (itemsNeedingReview.length === 0) {
    return null;
  }

  return (
    <Alert variant="info" className="mt-3">
      <Alert.Heading>
        Smart Match Suggestions ({itemsNeedingReview.length} items need review)
        <button
          className="btn btn-sm btn-link p-0 ms-2"
          onClick={() => setShowSuggestions(!showSuggestions)}
        >
          {showSuggestions ? "Hide" : "Show"}
        </button>
      </Alert.Heading>
      <Collapse in={showSuggestions}>
        <div>
          <p className="mb-2">
            The following items have low confidence matches or no matches. Please review and confirm the action:
          </p>
          <ul className="mb-0">
            {itemsNeedingReview.map(({ index, row, match }) => (
              <li key={index} className="mb-2">
                <strong>{row.name}</strong> (Code: <code>{row.code}</code>)
                {match?.itemId ? (
                  <>
                    {" "}— Matched with <strong>{match.itemName}</strong> (
                    <Badge bg="warning">{match.confidence}% confidence</Badge>)
                  </>
                ) : (
                  <> — No match found, will create new item</>
                )}
              </li>
            ))}
          </ul>
        </div>
      </Collapse>
    </Alert>
  );
}
