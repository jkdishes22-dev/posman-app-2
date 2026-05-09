"use client";

import React, { useState } from "react";
import { Card, Button } from "react-bootstrap";

interface CollapsibleFilterSectionCardProps {
  title?: string;
  iconClassName?: string;
  defaultExpanded?: boolean;
  className?: string;
  headerClassName?: string;
  bodyClassName?: string;
  headerActions?: React.ReactNode;
  children: React.ReactNode;
}

export default function CollapsibleFilterSectionCard({
  title = "Filters",
  iconClassName = "bi bi-funnel",
  defaultExpanded = true,
  className = "shadow-sm mb-4 border-0",
  headerClassName = "bg-light fw-bold py-2 px-3 d-flex justify-content-between align-items-center flex-wrap gap-2",
  bodyClassName,
  headerActions,
  children,
}: CollapsibleFilterSectionCardProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Card className={className}>
      <Card.Header className={headerClassName}>
        <span className="d-flex align-items-center">
          <i className={`${iconClassName} me-2 text-primary`} aria-hidden />
          {title}
        </span>
        <div className="d-flex gap-2">
          <Button
            variant="outline-secondary"
            size="sm"
            onClick={() => setExpanded((prev) => !prev)}
            aria-expanded={expanded}
          >
            <i className={`bi ${expanded ? "bi-chevron-up" : "bi-chevron-down"} me-1`} />
            {expanded ? "Hide" : "Show"}
          </Button>
          {headerActions}
        </div>
      </Card.Header>
      {expanded ? <Card.Body className={bodyClassName}>{children}</Card.Body> : null}
    </Card>
  );
}
