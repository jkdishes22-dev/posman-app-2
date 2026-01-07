"use client";

import React from "react";
import { Accordion } from "react-bootstrap";

interface Prerequisite {
    description: string;
}

interface Step {
    description: string;
    details?: string[];
}

interface UserJourneyProps {
    title: string;
    prerequisites: Prerequisite[];
    steps: Step[];
    icon?: string;
    eventKey: string;
}

export default function UserJourney({
    title,
    prerequisites,
    steps,
    icon = "bi-arrow-right-circle",
    eventKey,
}: UserJourneyProps) {
    return (
        <Accordion.Item eventKey={eventKey} className="mb-3">
            <Accordion.Header>
                <h5 className="mb-0">
                    <i className={`bi ${icon} me-2 text-primary`}></i>
                    {title}
                </h5>
            </Accordion.Header>
            <Accordion.Body>
                {/* Prerequisites Section */}
                {prerequisites.length > 0 && (
                    <div className="mb-4">
                        <h6 className="text-muted mb-3">
                            <i className="bi bi-check-circle me-2"></i>
                            Prerequisites
                        </h6>
                        <ol className="mb-0">
                            {prerequisites.map((prereq, index) => (
                                <li key={index} className="mb-2">
                                    {prereq.description}
                                </li>
                            ))}
                        </ol>
                    </div>
                )}

                {/* Steps Section */}
                <div>
                    <h6 className="text-muted mb-3">
                        <i className="bi bi-list-ol me-2"></i>
                        Steps
                    </h6>
                    <ol className="mb-0">
                        {steps.map((step, index) => (
                            <li key={index} className="mb-3">
                                <div className="fw-semibold mb-1">{step.description}</div>
                                {step.details && step.details.length > 0 && (
                                    <ul className="mt-2 mb-0">
                                        {step.details.map((detail, detailIndex) => (
                                            <li key={detailIndex} className="text-muted small">
                                                {detail}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </li>
                        ))}
                    </ol>
                </div>
            </Accordion.Body>
        </Accordion.Item>
    );
}

