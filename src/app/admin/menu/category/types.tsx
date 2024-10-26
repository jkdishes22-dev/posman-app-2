export type Category = {
  id: string;
  name: string;
  status: string;
};

export type Item = {
  id: string;
  name: string;
  code: string;
  price: number;
  category: Category;
  pricelistId: number;
  isGroup: boolean;
};
