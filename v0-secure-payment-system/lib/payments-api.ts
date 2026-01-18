export type CreatePaymentResponse = {
  requestId: string
  code: string
  expiresAt: string
}

export async function createPaymentRequest(amount: number, note?: string, payerEmail?: string, payerProfileId?: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const res = await fetch(`${base}/api/payments/requests`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ amount, note, payerEmail, payerProfileId }),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(text || `Request failed with status ${res.status}`)
  }
  try {
    const json = JSON.parse(text) as CreatePaymentResponse
    return json
  } catch {
    throw new Error("Invalid JSON response")
  }
}

export type PaymentRequestDetails = {
  requestId: string
  code: string
  amount: number
  note?: string
  status: string
  expiresAt: string
  payerEmail?: string
  payerProfileId?: string
}

export async function getPaymentRequestByCode(code: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const res = await fetch(`${base}/api/payments/requests/${encodeURIComponent(code)}`, {
    method: "GET",
    headers: { "Accept": "application/json" },
  })
  const text = await res.text()
  if (!res.ok) throw new Error(text || `Request failed with status ${res.status}`)
  try {
    const json = JSON.parse(text) as PaymentRequestDetails
    return json
  } catch {
    throw new Error("Invalid JSON response")
  }
}

export type ConfirmCodeResponse = {
  requestId: string
  code: string
  amount: number
  note?: string
  status: string
  expiresAt: string
  confirmedAt: string
  payerEmail?: string
  payerProfileId?: string
}

export async function confirmPaymentCode(code: string, mpin: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const res = await fetch(`${base}/api/payments/code/confirm`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "Accept": "application/json" },
    body: JSON.stringify({ code, mpin }),
  })
  const text = await res.text()
  if (!res.ok) throw new Error(text || `Request failed with status ${res.status}`)
  try {
    const json = JSON.parse(text) as ConfirmCodeResponse
    return json
  } catch {
    throw new Error("Invalid JSON response")
  }
}
