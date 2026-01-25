"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useParams } from "next/navigation"
import { useEffect, useState } from "react"
import { getPaymentRequestByCode, type PaymentRequestDetails } from "@/lib/payments-api"

export default function InvoicePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <InvoiceContent />
        </main>
      </div>
    </AuthGuard>
  )
}

function InvoiceContent() {
  const params = useParams<{ code: string }>()
  const code = params?.code
  const [data, setData] = useState<PaymentRequestDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!code) return
      try {
        setLoading(true)
        setError(null)
        const d = await getPaymentRequestByCode(code)
        setData(d)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load invoice"
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [code])

  const actionShare = async () => {
    const url = typeof window !== "undefined" ? window.location.href : ""
    const title = data ? `Invoice ${data.code} - ₹${Number(data.amount).toLocaleString()}` : "Invoice"
    const text = data ? `Payment ${data.status} for ${data.receiverEmail || "receiver"}` : "Payment Invoice"
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url })
      } else {
        await navigator.clipboard.writeText(url)
        alert("Link copied to clipboard")
      }
    } catch (err) {
      console.error(err)
    }
  }

  const actionPrint = () => {
    if (typeof window !== "undefined") window.print()
  }

  if (loading) return <div className="p-8 text-center text-muted-foreground">Loading invoice…</div>
  if (error) return <div className="p-8 text-center text-red-400">{error}</div>
  if (!data) return <div className="p-8 text-center text-muted-foreground">No invoice found.</div>

  const created = data.createdAt ? new Date(data.createdAt).toLocaleString() : "-"
  const confirmed = data.confirmedAt ? new Date(data.confirmedAt).toLocaleString() : "-"
  const expires = data.expiresAt ? new Date(data.expiresAt).toLocaleString() : "-"

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Invoice</h1>
        <div className="flex gap-2">
          <Button className="bg-primary text-white" onClick={actionPrint}>Download PDF</Button>
          <Button variant="outline" className="border-white/10" onClick={actionShare}>Share</Button>
        </div>
      </div>

      <Card className="glass border-white/10 shadow-xl">
        <CardContent className="p-6 space-y-4">
          <Row label="Invoice Code" value={data.code} />
          <Row label="Status" value={data.status} />
          <Row label="Amount" value={`₹${Number(data.amount).toLocaleString()}`} />
          <Row label="Created" value={created} />
          <Row label="Confirmed" value={confirmed} />
          <Row label="Expires" value={expires} />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
            <Card className="glass border-white/10">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Payer</p>
                <p className="text-sm text-white font-medium">{data.payerEmail || "-"}</p>
                {data.payerProfileId && (
                  <p className="text-xs text-muted-foreground">Profile: {data.payerProfileId}</p>
                )}
              </CardContent>
            </Card>
            <Card className="glass border-white/10">
              <CardContent className="p-4 space-y-2">
                <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Receiver</p>
                <p className="text-sm text-white font-medium">{data.receiverEmail || "-"}</p>
                {data.receiverAccountHolderName && (
                  <p className="text-xs text-muted-foreground">{data.receiverAccountHolderName}</p>
                )}
                {data.receiverAccountNumber && (
                  <p className="text-xs text-muted-foreground">A/C: •••• {data.receiverAccountNumber.slice(-4)}</p>
                )}
              </CardContent>
            </Card>
          </div>

          {data.note && (
            <div className="pt-4">
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Note</p>
              <p className="text-sm text-white font-medium">{data.note}</p>
            </div>
          )}
        </CardContent>
      </Card>
    </section>
  )
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm text-white font-medium">{value}</p>
    </div>
  )
}
