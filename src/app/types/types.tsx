export type Category = {
  id: string;
  name: string;
  status?: string;
};

export type Item = {
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
  id: number;
  total: number;
  status: string;
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
};

export type BillPayment = {
  id: number;
  payment: Payment;
  created_at: Date;
};

export type Payment = {
  id: number;
  creditAmount: number;
  paymentType: 'CASH' | 'MPESA';
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
