export type Person = {
  id: string;
  name: string;
};

export type MenuItem = {
  id: string;
  name: string;
  price: number;
  assignedTo: string[];
};

export type SplitResult = {
  restaurantName: string;
  total: string;
  tax: string;
  tip: string;
  menuItems?: MenuItem[];
  splitAmounts: {
    personId: string;
    amount: string;
  }[];
};
