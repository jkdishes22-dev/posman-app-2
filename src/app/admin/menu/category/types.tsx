export type Category = {
  id: string;
  name: string;
};

export type Item = {
  id: string;
  name: string;
  code: string;
  price: number;
  category: Category;
  itemType: ItemType;
};

export type ItemType = {
  id: string;
  name: string;
};
