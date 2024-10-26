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
  defaultUnitId: number;
  isGroup: boolean;
};

export type ItemType = {
  id: string;
  name: string;
};
