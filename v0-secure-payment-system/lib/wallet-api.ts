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
