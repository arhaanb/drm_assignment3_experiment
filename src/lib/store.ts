// ============================================================
// GLOBAL STATE (Zustand)
// Single source of truth for the entire experiment flow
// ============================================================

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  CartItem,
  BASE_CART_ITEMS,
  SNEAKED_ITEM,
  DEFAULT_TIP_DARK,
  DEFAULT_TIP_ETHICAL,
  CHARITY_AMOUNT,
  FEES,
} from "./constants";

export type AssignedGroup = "dark_pattern" | "ethical";

export type ExperimentStep =
  | "consent"
  | "demographics"
  | "intro"
  | "cart"
  | "addons"
  | "checkout"
  | "confirmation"
  | "survey"
  | "complete";

interface ExperimentState {
  // Participant info
  participantId: string | null;
  sessionId: string | null;
  assignedGroup: AssignedGroup | null;

  // Flow
  currentStep: ExperimentStep;
  setStep: (step: ExperimentStep) => void;

  // Cart
  cartItems: CartItem[];
  addItem: (item: CartItem) => void;
  removeItem: (itemId: string) => void;
  updateQuantity: (itemId: string, quantity: number) => void;

  // Checkout selections
  deliveryOption: "express" | "standard";
  setDeliveryOption: (option: "express" | "standard") => void;
  tipAmount: number;
  setTipAmount: (amount: number) => void;
  charityOptIn: boolean;
  setCharityOptIn: (optIn: boolean) => void;

  // Promo
  promoDiscount: number;
  promoCode: string | null;
  setPromo: (code: string | null, discount: number) => void;

  // Addon tracking
  addonsAccepted: number;
  addonsDeclined: number;
  incrementAddonsAccepted: () => void;
  incrementAddonsDeclined: () => void;

  // Computed
  getSubtotal: () => number;
  getDeliveryFee: () => number;
  getPlatformFee: () => number;
  getHandlingFee: () => number;
  getSurgeFee: () => number;
  getCharityAmount: () => number;
  getPromoDiscount: () => number;
  getTotal: () => number;

  // Screen timing
  screenEnteredAt: number | null;
  setScreenEnteredAt: (time: number | null) => void;

  // Init
  initExperiment: (
    participantId: string,
    sessionId: string,
    group: AssignedGroup
  ) => void;
  reset: () => void;
}

export const useExperimentStore = create<ExperimentState>()(
  persist(
    (set, get) => ({
      participantId: null,
      sessionId: null,
      assignedGroup: null,
      currentStep: "consent",

      cartItems: [],
      deliveryOption: "standard",
      tipAmount: 0,
      charityOptIn: false,
      promoDiscount: 0,
      promoCode: null,
      addonsAccepted: 0,
      addonsDeclined: 0,
      screenEnteredAt: null,

      setStep: (step) => set({ currentStep: step }),

      addItem: (item) =>
        set((state) => {
          const existing = state.cartItems.find((i) => i.id === item.id);
          if (existing) {
            return {
              cartItems: state.cartItems.map((i) =>
                i.id === item.id ? { ...i, quantity: i.quantity + 1 } : i
              ),
            };
          }
          return { cartItems: [...state.cartItems, { ...item, quantity: 1 }] };
        }),

      removeItem: (itemId) =>
        set((state) => ({
          cartItems: state.cartItems.filter((i) => i.id !== itemId),
        })),

      updateQuantity: (itemId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return {
              cartItems: state.cartItems.filter((i) => i.id !== itemId),
            };
          }
          return {
            cartItems: state.cartItems.map((i) =>
              i.id === itemId ? { ...i, quantity } : i
            ),
          };
        }),

      setDeliveryOption: (option) => set({ deliveryOption: option }),
      setTipAmount: (amount) => set({ tipAmount: amount }),
      setCharityOptIn: (optIn) => set({ charityOptIn: optIn }),
      setPromo: (code, discount) =>
        set({ promoCode: code, promoDiscount: discount }),
      incrementAddonsAccepted: () =>
        set((s) => ({ addonsAccepted: s.addonsAccepted + 1 })),
      incrementAddonsDeclined: () =>
        set((s) => ({ addonsDeclined: s.addonsDeclined + 1 })),

      setScreenEnteredAt: (time) => set({ screenEnteredAt: time }),

      getSubtotal: () =>
        get().cartItems.reduce(
          (sum, item) => sum + item.price * item.quantity,
          0
        ),

      getDeliveryFee: () =>
        get().deliveryOption === "express" ? FEES.expressDeliveryFee : 0,

      getPlatformFee: () => FEES.platformFee,
      getHandlingFee: () => FEES.handlingFee,

      getSurgeFee: () =>
        get().assignedGroup === "dark_pattern" ? FEES.surgeFee : 0,

      getCharityAmount: () =>
        get().charityOptIn ? CHARITY_AMOUNT : 0,

      getPromoDiscount: () => get().promoDiscount,

      getTotal: () => {
        const state = get();
        return Math.max(
          0,
          state.getSubtotal() +
            state.getDeliveryFee() +
            state.getPlatformFee() +
            state.getHandlingFee() +
            state.getSurgeFee() +
            state.tipAmount +
            state.getCharityAmount() -
            state.getPromoDiscount()
        );
      },

      initExperiment: (participantId, sessionId, group) => {
        // Set up cart based on group
        const items = [...BASE_CART_ITEMS];
        if (group === "dark_pattern") {
          // Sneak an extra item into the cart
          items.push(SNEAKED_ITEM);
        }

        set({
          participantId,
          sessionId,
          assignedGroup: group,
          currentStep: "intro",
          cartItems: items,
          // Dark pattern pre-selects expensive options
          deliveryOption: group === "dark_pattern" ? "express" : "standard",
          tipAmount:
            group === "dark_pattern" ? DEFAULT_TIP_DARK : DEFAULT_TIP_ETHICAL,
          charityOptIn: group === "dark_pattern" ? true : false,
          promoDiscount: 0,
          promoCode: null,
          addonsAccepted: 0,
          addonsDeclined: 0,
          screenEnteredAt: null,
        });
      },

      reset: () =>
        set({
          participantId: null,
          sessionId: null,
          assignedGroup: null,
          currentStep: "consent",
          cartItems: [],
          deliveryOption: "standard",
          tipAmount: 0,
          charityOptIn: false,
          promoDiscount: 0,
          promoCode: null,
          addonsAccepted: 0,
          addonsDeclined: 0,
          screenEnteredAt: null,
        }),
    }),
    {
      name: "drm-experiment",
    }
  )
);
