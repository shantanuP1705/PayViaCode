import { create } from "zustand"

interface PaymentRequest {
  id: string
  amount: number
  note?: string
  code: string
  expiry: number // timestamp
  status: "active" | "expired" | "completed"
  payerId: string
}

interface PaymentState {
  currentRequest: PaymentRequest | null
  setCurrentRequest: (request: PaymentRequest | null) => void
  generateCode: (amount: number, note?: string) => void
}

export const usePaymentStore = create<PaymentState>((set) => ({
  currentRequest: null,
  setCurrentRequest: (request) => set({ currentRequest: request }),
  generateCode: (amount, note) => {
    const code = Math.random().toString(36).substring(2, 8).toUpperCase()
    const expiry = Date.now() + 5 * 60 * 1000 // 5 minutes from now
    set({
      currentRequest: {
        id: Math.random().toString(36).substring(7),
        amount,
        note,
        code,
        expiry,
        status: "active",
        payerId: "1", // Mock current user ID
      },
    })
  },
}))
