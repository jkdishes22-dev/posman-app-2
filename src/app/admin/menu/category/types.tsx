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
};
