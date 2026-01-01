"use client";

import React from "react";
import { Table, Form, Badge } from "react-bootstrap";

interface UploadPreviewProps {
  validationResult: any;
  userConfirmations: Map<number, "create" | "update" | "skip">;
  onConfirmationChange: (index: number, action: "create" | "update" | "skip") => void;
}

export default function UploadPreview({
  validationResult,
  userConfirmations,
  onConfirmationChange,
}: UploadPreviewProps) {
  const rows = validationResult.rows || [];

  return (
    <div className="mt-3">
      <h5>Upload Preview ({rows.length} items)</h5>
      <div style={{ maxHeight: "400px", overflowY: "auto" }}>
        <Table striped bordered hover size="sm">
          <thead>
            <tr>
              <th>#</th>
              <th>Code</th>
              <th>Name</th>
              <th>Category</th>
              <th>Price</th>
              <th>Match</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row: any, index: number) => {
              const match = validationResult.matchedItems?.get(index);
              const action = userConfirmations.get(index) || "skip";

              return (
                <tr key={index}>
                  <td>{index + 1}</td>
                  <td>
                    <code>{row.code}</code>
                  </td>
                  <td>{row.name}</td>
                  <td>{row.category_code}</td>
                  <td>{row.price}</td>
                  <td>
                    {match?.item ? (
                      <Badge bg={match.confidence >= 90 ? "success" : match.confidence >= 70 ? "warning" : "danger"}>
                        {match.matchType} ({match.confidence}%)
                      </Badge>
                    ) : (
                      <Badge bg="secondary">New</Badge>
                    )}
                  </td>
                  <td>
                    <Form.Select
                      size="sm"
                      value={action}
                      onChange={(e) => onConfirmationChange(index, e.target.value as "create" | "update" | "skip")}
                    >
                      <option value="skip">Skip</option>
                      {match?.item ? (
                        <option value="update">Update</option>
                      ) : (
                        <option value="create">Create</option>
                      )}
                    </Form.Select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </Table>
      </div>
    </div>
  );
}

