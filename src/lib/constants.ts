// ============================================================
// EXPERIMENT CONSTANTS
// All cart items, fees, add-ons, and configuration
// ============================================================

export type CartItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  quantity: number;
  image: string; // emoji for prototype
  category: string;
};

export type AddonItem = CartItem & {
  tag?: string; // e.g. "Most ordered", "Bestseller"
};

// Pre-loaded cart items (constant across both groups)
// Simulates a typical dinner grocery order on Zepto/Blinkit
export const BASE_CART_ITEMS: CartItem[] = [
  {
    id: "rice",
    name: "India Gate Basmati Rice",
    description: "1 kg",
    price: 145,
    quantity: 1,
    image: "🍚",
    category: "Staples",
  },
  {
    id: "paneer",
    name: "Amul Fresh Paneer",
    description: "200 g",
    price: 90,
    quantity: 1,
    image: "🧀",
    category: "Dairy",
  },
  {
    id: "onion",
    name: "Onion",
    description: "1 kg",
    price: 42,
    quantity: 2,
    image: "🧅",
    category: "Vegetables",
  },
  {
    id: "tomato",
    name: "Tomato (Hybrid)",
    description: "500 g",
    price: 35,
    quantity: 1,
    image: "🍅",
    category: "Vegetables",
  },
  {
    id: "milk",
    name: "Amul Toned Milk",
    description: "500 ml",
    price: 28,
    quantity: 2,
    image: "🥛",
    category: "Dairy",
  },
  {
    id: "bread",
    name: "Harvest Gold White Bread",
    description: "1 pack",
    price: 40,
    quantity: 1,
    image: "🍞",
    category: "Bakery",
  },
  {
    id: "oil",
    name: "Fortune Sunflower Oil",
    description: "1 L pouch",
    price: 155,
    quantity: 1,
    image: "🫗",
    category: "Staples",
  },
  {
    id: "potato",
    name: "Potato (Aloo)",
    description: "1 kg",
    price: 32,
    quantity: 2,
    image: "🥔",
    category: "Vegetables",
  },
];

// Subtotal of base cart: ₹669 (includes quantities: onion x2, milk x2, potato x2)
export const BASE_SUBTOTAL = BASE_CART_ITEMS.reduce(
  (sum, item) => sum + item.price * item.quantity,
  0
);

// Item that gets sneaked into cart (dark pattern only)
export const SNEAKED_ITEM: CartItem = {
  id: "curd",
  name: "Amul Masti Dahi",
  description: "400 g - Usually bought with Paneer",
  price: 35,
  quantity: 1,
  image: "🥣",
  category: "Dairy",
};

// Add-on suggestions shown during checkout
export const ADDON_ITEMS: AddonItem[] = [
  {
    id: "chips",
    name: "Lay's Classic Salted",
    description: "52 g",
    price: 20,
    quantity: 1,
    image: "🥔",
    category: "Snacks",
    tag: "Most ordered",
  },
  {
    id: "cola",
    name: "Coca-Cola",
    description: "750 ml",
    price: 38,
    quantity: 1,
    image: "🥤",
    category: "Beverages",
    tag: "Bestseller",
  },
  {
    id: "icecream",
    name: "Amul Vanilla Cup",
    description: "100 ml",
    price: 30,
    quantity: 1,
    image: "🍦",
    category: "Frozen",
  },
  {
    id: "cookies",
    name: "Parle-G Gold",
    description: "100 g",
    price: 20,
    quantity: 1,
    image: "🍪",
    category: "Snacks",
    tag: "₹20 only!",
  },
];

// Fee structure
export const FEES = {
  platformFee: 5,
  handlingFee: 4,
  surgeFee: 10, // only in dark pattern
  expressDeliveryFee: 35,
  freeDeliveryThreshold: 199, // always met with our cart
};

// Tip options
export const TIP_OPTIONS = [0, 10, 20, 30];
export const DEFAULT_TIP_DARK = 30; // pre-selected in dark pattern
export const DEFAULT_TIP_ETHICAL = 0; // starts at 0 in ethical

// Charity
export const CHARITY_AMOUNT = 2;
export const CHARITY_NAME = "Feeding India";

// The "fair" baseline = base subtotal + platform fee + handling fee (no dark extras)
// Any amount above this in the dark pattern group is "extra revenue" from manipulation
export const ETHICAL_BASELINE_FEES = FEES.platformFee + FEES.handlingFee; // ₹9

// Promo codes
export type PromoCode = {
  code: string;
  discount: number;
  label: string;
  minOrder: number;
  valid: boolean;
  failReason?: string; // shown when code fails (dark pattern uses confusing reasons)
};

// Ethical: simple, clearly labeled promos
export const ETHICAL_PROMOS: PromoCode[] = [
  { code: "SAVE20", discount: 20, label: "₹20 off on orders above ₹500", minOrder: 500, valid: true },
  { code: "FIRST50", discount: 50, label: "₹50 off your first order", minOrder: 400, valid: true },
];

// Dark pattern: confusing codes — one valid buried among misleading/expired ones
export const DARK_PROMOS: PromoCode[] = [
  { code: "FLAT200", discount: 0, label: "Flat ₹200 off!", minOrder: 2000, valid: false, failReason: "Minimum order of ₹2,000 required for this code" },
  { code: "DEAL99", discount: 0, label: "₹99 off — LIMITED!", minOrder: 500, valid: false, failReason: "This offer has expired. Try another code!" },
  { code: "SAVE20", discount: 20, label: "₹20 off on ₹500+", minOrder: 500, valid: true }, // only real one
  { code: "MEGA50", discount: 0, label: "₹50 off — Apply now!", minOrder: 999, valid: false, failReason: "Only valid on orders above ₹999" },
];

// Delivery options
export const DELIVERY_OPTIONS = {
  express: {
    label: "Express Delivery",
    time: "8-10 min",
    fee: 35,
  },
  standard: {
    label: "Standard Delivery",
    time: "15-20 min",
    fee: 0,
  },
};
