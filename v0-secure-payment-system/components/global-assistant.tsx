"use client"

import { useMemo } from "react"
import { usePathname } from "next/navigation"
import { VoiceAssistant } from "@/components/voice-assistant"

export function GlobalAssistant() {
  const pathname = usePathname() || "/"

  const { page, code } = useMemo(() => {
    const p = pathname
    let label = "page"
    let invoiceCode: string | undefined
    if (p.startsWith("/invoice/")) {
      label = "invoice"
      const m = p.match(/\/invoice\/([^/]+)/)
      if (m?.[1]) invoiceCode = decodeURIComponent(m[1])
    } else if (p.startsWith("/transactions")) {
      label = "transactions"
    } else if (p.startsWith("/dashboard")) {
      label = "dashboard"
    } else if (p.startsWith("/create-payment")) {
      label = "create-payment"
    } else if (p.startsWith("/pay-by-code")) {
      label = "pay-by-code"
    }
    return { page: label, code: invoiceCode }
  }, [pathname])

  return <VoiceAssistant page={page} invoiceCode={code} />
}
