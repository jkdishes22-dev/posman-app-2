"use client";

import React from "react";
import { OverlayTrigger, Popover } from "react-bootstrap";

export interface HelpPopoverProps {
  /** Stable id fragment for the popover element */
  id: string;
  /** Optional heading inside the popover */
  title?: string;
  /** Body content (may include links, lists, code) */
  children: React.ReactNode;
  /** Wider panel for long copy */
  wide?: boolean;
  className?: string;
  /** Accessible label (defaults to "Help") */
  ariaLabel?: string;
}

/**
 * Compact inline help: click the ? icon to open a popover (better than hover-only tooltips for dense settings pages).
 */
export default function HelpPopover({
  id,
  title,
  children,
  wide,
  className,
  ariaLabel = "Help",
}: HelpPopoverProps) {
  const maxWidth = wide ? 420 : 320;

  const popover = (
    <Popover id={`help-popover-${id}`} style={{ maxWidth }}>
      {title ? (
        <Popover.Header as="div" className="small fw-semibold py-2 px-3">
          {title}
        </Popover.Header>
      ) : null}
      <Popover.Body className="small py-2 px-3">{children}</Popover.Body>
    </Popover>
  );

  return (
    <OverlayTrigger trigger="click" placement="auto" rootClose overlay={popover}>
      <button
        type="button"
        className={`btn btn-link p-0 align-baseline border-0 ${className ?? "text-muted"}`}
        style={{ lineHeight: 1 }}
        aria-label={ariaLabel}
      >
        <i className="bi bi-question-circle" aria-hidden />
      </button>
    </OverlayTrigger>
  );
}
