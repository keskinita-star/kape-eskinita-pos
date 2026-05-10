export const LOW_STOCK_THRESHOLD = 10;
export const CATEGORIES = ["Coffee & Milk Tea", "Soda & Milk", "Matcha", "Snack & Rice Meal"];
export const ROLES = { ADMIN: "admin", MANAGER: "manager", CASHIER: "cashier" };
export const TAX_RATE = 0.12;
export const PAYMENT_METHODS = ["Cash", "GCash", "Maya"];
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

export const SIZES = [
  { label: "Tall", priceAdd: 0 },
  { label: "Grande", priceAdd: 10 },
  { label: "Venti", priceAdd: 20 },
];

// Products that don't need size selection
export const NO_SIZE_CATEGORIES = ["Snack & Rice Meal"];