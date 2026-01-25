export type BalanceResponse = {
  email: string
  balance: number
}

export async function getWalletBalance(email: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const res = await fetch(`${base}/api/wallet/${encodeURIComponent(email.toLowerCase())}`)
  const text = await res.text()
  if (!res.ok) throw new Error(text || `Failed to fetch balance (${res.status})`)
  return JSON.parse(text) as BalanceResponse
}

export async function addMoney(email: string, amount: number) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const res = await fetch(`${base}/api/wallet/add`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: email.toLowerCase(), amount }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(text || `Failed to add money (${res.status})`)
  return JSON.parse(text) as BalanceResponse
}

export type TxResponse = {
  email: string
  type: "CREDIT" | "DEBIT" | "EVENT"
  source: string
  description: string
  amount: number
  counterpartyEmail?: string
  createdAt: string
  status: string
}

export async function getRecentTransactions(email: string, limit = 10) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const res = await fetch(`${base}/api/wallet/transactions/${encodeURIComponent(email.toLowerCase())}?limit=${limit}`)
  const text = await res.text()
  if (!res.ok) throw new Error(text || `Failed to fetch transactions (${res.status})`)
  return JSON.parse(text) as TxResponse[]
}

export type TxFilters = {
  type?: "ALL" | "CREDIT" | "DEBIT" | "EVENT"
  status?: "ALL" | "Success" | "Failed"
  source?: string | "ALL"
  q?: string
  start?: string // ISO instant
  end?: string   // ISO instant
  page?: number
  size?: number
}

export async function getTransactions(email: string, filters: TxFilters = {}) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const params = new URLSearchParams()
  if (filters.type) params.set("type", filters.type)
  if (filters.status) params.set("status", filters.status)
  if (filters.source) params.set("source", filters.source)
  if (filters.q) params.set("q", filters.q)
  if (filters.start) params.set("start", filters.start)
  if (filters.end) params.set("end", filters.end)
  params.set("page", String(filters.page ?? 0))
  params.set("size", String(filters.size ?? 50))
  const res = await fetch(`${base}/api/wallet/transactions/${encodeURIComponent(email.toLowerCase())}/list?${params.toString()}`)
  const text = await res.text()
  if (!res.ok) throw new Error(text || `Failed to fetch transactions (${res.status})`)
  return JSON.parse(text) as TxResponse[]
}
