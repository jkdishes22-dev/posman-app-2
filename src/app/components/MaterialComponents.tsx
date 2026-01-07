import React from "react";
import { Button, Card, Alert, Badge, Table } from "react-bootstrap";

// Material Design Button Component
interface MaterialButtonProps {
    variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark";
    size?: "sm" | "lg";
    className?: string;
    children: React.ReactNode;
    onClick?: () => void;
    disabled?: boolean;
    type?: "button" | "submit" | "reset";
}

export const MaterialButton: React.FC<MaterialButtonProps> = ({
    variant = "primary",
    size,
    className = "",
    children,
    onClick,
    disabled = false,
    type = "button"
}) => {
    return (
        <Button
            variant={variant}
            size={size}
            className={`shadow-1 ${className}`}
            onClick={onClick}
            disabled={disabled}
            type={type}
        >
            {children}
        </Button>
    );
};

// Material Design Card Component
interface MaterialCardProps {
    title?: string;
    subtitle?: string;
    className?: string;
    children: React.ReactNode;
    headerActions?: React.ReactNode;
}

export const MaterialCard: React.FC<MaterialCardProps> = ({
    title,
    subtitle,
    className = "",
    children,
    headerActions
}) => {
    return (
        <Card className={`shadow-1 ${className}`}>
            {(title || subtitle || headerActions) && (
                <Card.Header className="d-flex justify-content-between align-items-center">
                    <div>
                        {title && <Card.Title className="mb-0 fw-medium">{title}</Card.Title>}
                        {subtitle && <Card.Subtitle className="text-muted small">{subtitle}</Card.Subtitle>}
                    </div>
                    {headerActions && <div>{headerActions}</div>}
                </Card.Header>
            )}
            <Card.Body>{children}</Card.Body>
        </Card>
    );
};

// Material Design Alert Component
interface MaterialAlertProps {
    variant?: "danger" | "warning" | "info" | "success";
    title?: string;
    children: React.ReactNode;
    dismissible?: boolean;
    onDismiss?: () => void;
    className?: string;
}

export const MaterialAlert: React.FC<MaterialAlertProps> = ({
    variant = "danger",
    title,
    children,
    dismissible = true,
    onDismiss,
    className = ""
}) => {
    return (
        <Alert variant={variant} dismissible={dismissible} onClose={onDismiss} className={className}>
            {title && <Alert.Heading className="fw-medium">{title}</Alert.Heading>}
            {children}
        </Alert>
    );
};

// Material Design Badge Component
interface MaterialBadgeProps {
    variant?: "primary" | "secondary" | "success" | "danger" | "warning" | "info" | "light" | "dark";
    children: React.ReactNode;
    className?: string;
}

export const MaterialBadge: React.FC<MaterialBadgeProps> = ({
    variant = "primary",
    children,
    className = ""
}) => {
    return (
        <Badge bg={variant} className={className}>
            {children}
        </Badge>
    );
};

// Material Design Table Component
interface MaterialTableProps {
    headers: string[];
    data: any[][];
    className?: string;
    striped?: boolean;
    hover?: boolean;
    bordered?: boolean;
}

export const MaterialTable: React.FC<MaterialTableProps> = ({
    headers,
    data,
    className = "",
    striped = true,
    hover = true,
    bordered = false
}) => {
    return (
        <Table
            striped={striped}
            hover={hover}
            bordered={bordered}
            className={`shadow-1 ${className}`}
        >
            <thead>
                <tr>
                    {headers.map((header, index) => (
                        <th key={index} className="fw-medium">{header}</th>
                    ))}
                </tr>
            </thead>
            <tbody>
                {data.map((row, rowIndex) => (
                    <tr key={rowIndex}>
                        {row.map((cell, cellIndex) => (
                            <td key={cellIndex}>{cell}</td>
                        ))}
                    </tr>
                ))}
            </tbody>
        </Table>
    );
};

// Material Design Section Header
interface MaterialSectionHeaderProps {
    title: string;
    subtitle?: string;
    actions?: React.ReactNode;
    className?: string;
}

export const MaterialSectionHeader: React.FC<MaterialSectionHeaderProps> = ({
    title,
    subtitle,
    actions,
    className = ""
}) => {
    return (
        <div className={`d-flex justify-content-between align-items-center mb-4 ${className}`}>
            <div>
                <h4 className="fw-medium mb-1">{title}</h4>
                {subtitle && <p className="text-muted mb-0 small">{subtitle}</p>}
            </div>
            {actions && <div>{actions}</div>}
        </div>
    );
};

// Material Design Status Badge
interface MaterialStatusBadgeProps {
    status: "active" | "inactive" | "pending" | "success" | "error" | "warning";
    children: React.ReactNode;
    className?: string;
}

export const MaterialStatusBadge: React.FC<MaterialStatusBadgeProps> = ({
    status,
    children,
    className = ""
}) => {
    const getVariant = (status: string) => {
        switch (status) {
            case "active":
            case "success":
                return "success";
            case "inactive":
            case "error":
                return "danger";
            case "pending":
                return "warning";
            case "warning":
                return "warning";
            default:
                return "secondary";
        }
    };

    return (
        <MaterialBadge variant={getVariant(status)} className={className}>
            {children}
        </MaterialBadge>
    );
};

const MaterialComponents = {
    MaterialButton,
    MaterialCard,
    MaterialAlert,
    MaterialBadge,
    MaterialTable,
    MaterialSectionHeader,
    MaterialStatusBadge
};

export default MaterialComponents;
