export type Category = {
  id: string;
  name: string;
  status?: string;
};

// Status type definitions
export type BillStatus = "pending" | "submitted" | "closed" | "reopened" | "voided";
export type BillItemStatus = "pending" | "submitted" | "void_pending" | "voided" | "closed" | "quantity_change_request" | "deleted";
export type VoidRequestStatus = "pending" | "approved" | "rejected";
export type PaymentType = "CASH" | "MPESA";

export type Item = {
  allowNegativeInventory?: boolean;
  id: number;
  name: string;
  code: string;
  price: number;
  category: Category;
  pricelistId: number;
  isGroup: boolean;
  pricelistName: number;
  pricelist_item_isEnabled: boolean;
  stationName: string;
};

export type GroupItem = {
  id: number;
  name: string;
  portionSize: number;
};

export type Group = {
  id: number;
  name: string;
  items: GroupItem[];
};

export type PaginationInfo = {
  currentPage: number;
  totalPages: number;
  totalGroups: number;
  hasNext: boolean;
  hasPrev: boolean;
  limit: number;
};

export type GroupedItemsResponse = {
  groups: Group[];
  pagination: PaginationInfo;
};

export type Station = {
  id: number;
  name: string;
  status: string;
  description?: string;
};

export type Pricelist = {
  id: number;
  name: string;
  status: string;
};

export type User = {
  id: number;
  firstName: string;
  lastName: string;
  username: string;
  role: Role;
};

export type Bill = {
  bill_number?: string | number;
  id: number;
  total: number;
  status: BillStatus;
  bill_payments: Record<string, any>;
  user: User;
  created_at: Date;
  station?: Station;
  reopen_reason?: string;
  reopened_by?: number;
  reopened_at?: string;
  bill_items?: BillItem[];
};

export type BillItem = {
  id: number;
  bill_id: number;
  item: {
    name: string;
    price: number;
  };
  quantity: number;
  subtotal: number;
  status: BillItemStatus;
  void_reason?: string;
  void_requested_by?: number;
  void_requested_at?: string;
  void_approved_by?: number;
  void_approved_at?: string;
  requested_quantity?: number;
  quantity_change_reason?: string;
  quantity_change_requested_by?: number;
  quantity_change_requested_at?: string;
  quantity_change_approved_by?: number;
  quantity_change_approved_at?: string;
};

export type BillPayment = {
  id: number;
  payment: Payment;
  created_at: Date;
};

export type Payment = {
  id: number;
  creditAmount: number;
  paymentType: PaymentType;
  paidAt: Date;
  created_at: Date;
  reference: string;
};

export type Scope = {
  id: number;
  name: string;
};

export type Role = {
  id: number;
  name: string;
};

export type Permission = {
  id: number;
  name: string;
  scopeId: number;
};

export type AuthError = {
  message: string;
  missingPermissions?: string[];
} | null;

export type InventoryItem = {
  name: string;
  code: string;
  isStock: boolean;
};

// Voiding system types
export type VoidRequest = {
  id: number;
  billId: number;
  itemId: number;
  reason: string;
  requestedBy: number;
  requestedAt: string;
  status: VoidRequestStatus;
  approvedBy?: number;
  approvedAt?: string;
  approvalNotes?: string;
  paperApprovalReceived?: boolean;
};

export type VoidRequestPayload = {
  reason: string;
};

export type VoidApprovalAction = "approve" | "reject";

export type VoidApprovalPayload = {
  action: VoidApprovalAction;
  approvalNotes?: string;
  paperApprovalReceived?: boolean;
};

export type VoidRequestResponse = {
  message: string;
  voidRequest: VoidRequest;
};
