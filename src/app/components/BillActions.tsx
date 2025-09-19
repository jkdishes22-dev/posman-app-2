import React from "react";
import VoidingInterface from "./VoidingInterface";
import ReopeningInterface from "./ReopeningInterface";

interface BillItem {
    id: number;
    item: {
        name: string;
    };
    quantity: number;
    subtotal: number;
    item_status: string;
    void_reason?: string;
    void_requested_by?: number;
    void_requested_at?: string;
    void_approved_by?: number;
    void_approved_at?: string;
}

interface Bill {
    id: number;
    status: string;
    reopen_reason?: string;
    reopened_by?: number;
    reopened_at?: string;
    bill_items?: BillItem[];
}

interface BillActionsProps {
    bill: Bill;
    userRole: string;
    onVoidRequested?: () => void;
    onVoidApproved?: () => void;
    onReopened?: () => void;
    onResubmitted?: () => void;
}

/**
 * BillActions Component - Implements Rule 4.6: Frontend Implementation Rules
 * 
 * This component demonstrates the correct separation of voiding and reopening features
 * and shows appropriate actions based on user role and bill state.
 */
export default function BillActions({
    bill,
    userRole,
    onVoidRequested,
    onVoidApproved,
    onReopened,
    onResubmitted
}: BillActionsProps) {

    // Business rule validation (Rule 4.3, 4.4)
    const canVoidItems = (bill: Bill) => {
        return (bill.status === 'submitted' || bill.status === 'reopened') &&
            bill.bill_items?.some(item => item.item_status === 'active') || false;
    };

    const hasPendingVoids = (bill: Bill) => {
        return bill.bill_items?.some(item => item.item_status === 'void_pending') || false;
    };

    const canReopenBill = (bill: Bill) => {
        return bill.status === 'submitted';
    };

    const canResubmitBill = (bill: Bill) => {
        return bill.status === 'reopened';
    };

    return (
        <div className="bill-actions">
            {/* Voiding Actions - Rule 4.6: Separate Components */}
            {userRole === 'sales' && canVoidItems(bill) && (
                <VoidingInterface
                    bill={bill}
                    userRole={userRole}
                    onVoidRequested={onVoidRequested}
                    onVoidApproved={onVoidApproved}
                />
            )}

            {userRole === 'cashier' && hasPendingVoids(bill) && (
                <VoidingInterface
                    bill={bill}
                    userRole={userRole}
                    onVoidRequested={onVoidRequested}
                    onVoidApproved={onVoidApproved}
                />
            )}

            {/* Reopening Actions - Rule 4.6: Separate Components */}
            {userRole === 'cashier' && canReopenBill(bill) && (
                <ReopeningInterface
                    bill={bill}
                    userRole={userRole}
                    onReopened={onReopened}
                    onResubmitted={onResubmitted}
                />
            )}

            {userRole === 'sales' && canResubmitBill(bill) && (
                <ReopeningInterface
                    bill={bill}
                    userRole={userRole}
                    onReopened={onReopened}
                    onResubmitted={onResubmitted}
                />
            )}
        </div>
    );
}
