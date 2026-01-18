export type ProfilePayload = {
  accountHolderName: string
  accountNumber: string
  bankName: string
  ifsc: string
  email: string
}

export async function saveProfile(payload: ProfilePayload) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const res = await fetch(`${base}/api/profile`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  })

  const text = await res.text()
  if (!res.ok) {
    throw new Error(text || `Request failed with status ${res.status}`)
  }
  try {
    return JSON.parse(text)
  } catch {
    return text
  }
}

export async function getProfileByEmail(email: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const res = await fetch(`${base}/api/profile/${encodeURIComponent(email.toLowerCase())}`, {
    method: "GET",
    headers: {
      "Accept": "application/json",
    },
  })
  if (res.status === 404) return null
  const text = await res.text()
  if (!res.ok) throw new Error(text || `Request failed with status ${res.status}`)
  try {
    return JSON.parse(text) as ProfilePayload
  } catch {
    throw new Error("Invalid JSON response from profile API")
  }
}

export async function setProfileMpin(email: string, mpin: string) {
  const base = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8082"
  const cleanEmail = email.toLowerCase()
  const res = await fetch(`${base}/api/profile/${encodeURIComponent(cleanEmail)}/mpin`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ mpin }),
  })
  if (res.status === 204) return true
  const text = await res.text()
  if (!res.ok) throw new Error(text || `Failed to set MPIN (${res.status})`)
  return true
}
