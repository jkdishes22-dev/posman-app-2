export type Category = {
  id: string;
  name: string;
  status: string;
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
};

export type Bill = {
  id: number;
  total: number;
  status: string;
  bill_payments: Record<string, any>;
  user: User;
  created_at: Date;
};

export type BillPayment = {
  id: number;
  payment: Payment;
  created_at: Date;
};

export type Payment = {
  id: number;
  creditAmount: number;
  paymentType: string;
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
