"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/lib/auth-store"
import { useEffect, useMemo, useState } from "react"
import { getTransactions, type TxResponse } from "@/lib/wallet-api"
import { getProfileByEmail, type ProfilePayload } from "@/lib/profile-api"

type Mode = "weekly" | "monthly" | "yearly"
type StatusFilter = "ALL" | "Success" | "Failed"

function startOfWeek(d: Date) {
  const date = new Date(d)
  const day = date.getDay() // 0 Sun .. 6 Sat
  const diff = (day === 0 ? -6 : 1) - day // Monday as start
  date.setDate(date.getDate() + diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfWeek(d: Date) {
  const s = startOfWeek(d)
  const e = new Date(s)
  e.setDate(s.getDate() + 7)
  e.setHours(0, 0, 0, 0)
  return e
}

function startOfMonth(d: Date) {
  const date = new Date(d.getFullYear(), d.getMonth(), 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfMonth(d: Date) {
  const start = startOfMonth(d)
  const end = new Date(start.getFullYear(), start.getMonth() + 1, 1)
  end.setHours(0, 0, 0, 0)
  return end
}

function startOfYear(d: Date) {
  const date = new Date(d.getFullYear(), 0, 1)
  date.setHours(0, 0, 0, 0)
  return date
}

function endOfYear(d: Date) {
  const end = new Date(d.getFullYear() + 1, 0, 1)
  end.setHours(0, 0, 0, 0)
  return end
}

function formatAmount(n: number) {
  return `₹${Number(n).toLocaleString()}`
}

export default function StatementsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-5xl px-4 py-8">
          <StatementsContent />
        </main>
      </div>
    </AuthGuard>
  )
}

function StatementsContent() {
  const user = useAuthStore(s => s.user)
  const [mode, setMode] = useState<Mode>("monthly")
  const [offset, setOffset] = useState(0) // 0 current, -1 previous, +1 next
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<TxResponse[]>([])
  const [status, setStatus] = useState<StatusFilter>("ALL")
  const [profile, setProfile] = useState<ProfilePayload | null>(null)

  const range = useMemo(() => {
    const now = new Date()
    const base = new Date(now)
    const r = { start: now, end: now }
    if (mode === "weekly") {
      base.setDate(base.getDate() + offset * 7)
      r.start = startOfWeek(base)
      r.end = endOfWeek(base)
    } else if (mode === "monthly") {
      base.setMonth(base.getMonth() + offset)
      r.start = startOfMonth(base)
      r.end = endOfMonth(base)
    } else {
      base.setFullYear(base.getFullYear() + offset)
      r.start = startOfYear(base)
      r.end = endOfYear(base)
    }
    return r
  }, [mode, offset])

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return
      try {
        setLoading(true)
        setError(null)
        const startISO = range.start.toISOString()
        const endISO = range.end.toISOString()
        const filters: any = { start: startISO, end: endISO, page: 0, size: 200 }
        if (status !== "ALL") filters.status = status
        const data = await getTransactions(user.email, filters)
        setItems(data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load statements"
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.email, range.start, range.end, status])

  useEffect(() => {
    const loadProfile = async () => {
      if (!user?.email) return
      try {
        const p = await getProfileByEmail(user.email)
        if (p) setProfile(p)
      } catch (err) {
        // Non-blocking: ignore profile errors
        console.warn("Profile load failed", err)
      }
    }
    loadProfile()
  }, [user?.email])

  const totals = useMemo(() => {
    const isExcluded = (tx: TxResponse) => {
      const src = tx.source || ""
      const desc = tx.description || ""
      return /wallet/i.test(src) || /adjustment/i.test(src) || /adjustment/i.test(desc)
    }
    const filtered = items.filter(tx => !isExcluded(tx))
    let received = 0
    let paid = 0
    for (const it of filtered) {
      if (it.type === "CREDIT") received += it.amount
      if (it.type === "DEBIT") paid += it.amount
    }
    return { received, paid, net: received - paid }
  }, [items])

  const periodLabel = useMemo(() => {
    const s = range.start
    if (mode === "weekly") {
      const e = new Date(range.end.getTime() - 1)
      return `${s.toLocaleDateString()} – ${e.toLocaleDateString()}`
    }
    if (mode === "monthly") {
      const m = s.toLocaleString(undefined, { month: "long", year: "numeric" })
      return m
    }
    return String(s.getFullYear())
  }, [mode, range])

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Account Statements</h1>
        <div className="flex gap-2">
          <Button variant={mode === "weekly" ? "default" : "outline"} className="border-white/10" onClick={() => setMode("weekly")}>Weekly</Button>
          <Button variant={mode === "monthly" ? "default" : "outline"} className="border-white/10" onClick={() => setMode("monthly")}>Monthly</Button>
          <Button variant={mode === "yearly" ? "default" : "outline"} className="border-white/10" onClick={() => setMode("yearly")}>Yearly</Button>
        </div>
      </div>

      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle>{periodLabel}</CardTitle>
          <CardDescription>Filter by period, status, and export your statement.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex gap-2">
              <Button variant="ghost" onClick={() => setOffset(o => o - 1)}>◀ Prev</Button>
              <Button variant="ghost" onClick={() => setOffset(0)}>Today</Button>
              <Button variant="ghost" onClick={() => setOffset(o => o + 1)} disabled={mode !== "weekly" && offset >= 0}>Next ▶</Button>
            </div>
            <div className="flex items-center gap-4 text-sm">
              <label className="flex items-center gap-2">
                <span className="text-muted-foreground">Status</span>
                <select
                  className="bg-white/5 border border-white/10 rounded-md px-2 py-1 text-white text-sm"
                  value={status}
                  onChange={e => setStatus(e.target.value as StatusFilter)}
                >
                  <option value="ALL">All</option>
                  <option value="Success">Success</option>
                  <option value="Failed">Failed</option>
                </select>
              </label>
              <span className="text-emerald-300">Received: {formatAmount(totals.received)}</span>
              <span className="text-red-300">Paid: {formatAmount(totals.paid)}</span>
              <span className="text-white">Net: {formatAmount(totals.net)}</span>
              <Button variant="outline" className="border-white/10" onClick={() => exportCSV(items.filter(tx => {
                const src = tx.source || ""
                const desc = tx.description || ""
                return !(/wallet/i.test(src) || /adjustment/i.test(src) || /adjustment/i.test(desc))
              }), periodLabel, mode)}>Export CSV</Button>
              <Button variant="outline" className="border-white/10" onClick={() => exportPDF(items.filter(tx => {
                const src = tx.source || ""
                const desc = tx.description || ""
                return !(/wallet/i.test(src) || /adjustment/i.test(src) || /adjustment/i.test(desc))
              }), periodLabel, mode, totals, status, {
                name: user?.name,
                email: user?.email,
                accountHolderName: profile?.accountHolderName,
                bankName: profile?.bankName,
                accountNumber: profile?.accountNumber,
                ifsc: profile?.ifsc,
              })}>Export PDF</Button>
            </div>
          </div>

          {loading && <div className="text-muted-foreground">Loading…</div>}
          {error && <div className="text-red-400">{error}</div>}
          {!loading && !error && items.length === 0 && (
            <div className="text-muted-foreground">No transactions for this period.</div>
          )}

          <div className="space-y-2">
            {items.filter(tx => {
              const src = tx.source || ""
              const desc = tx.description || ""
              return !(/wallet/i.test(src) || /adjustment/i.test(src) || /adjustment/i.test(desc))
            }).map((tx, i) => (
              <div key={i} className="grid grid-cols-[auto_1fr_auto_auto_auto] items-center gap-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2">
                <div className="text-xs text-white/70 min-w-[140px]">{new Date(tx.createdAt).toLocaleString()}</div>
                <div className="text-sm text-white/90">{tx.description || tx.source}</div>
                <div className={tx.type === "CREDIT" ? "text-emerald-300" : tx.type === "DEBIT" ? "text-red-300" : "text-yellow-300"}>
                  {tx.type === "CREDIT" ? "Received" : tx.type === "DEBIT" ? "Paid" : "Event"}
                </div>
                <div className={tx.status === "Success" ? "text-emerald-300" : "text-red-300"}>{tx.status}</div>
                <div className="text-sm font-medium">{formatAmount(tx.amount)}</div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </section>
  )
}

function exportCSV(items: TxResponse[], label: string, mode: Mode) {
  const headers = ["Date", "Description", "Direction", "Status", "Amount", "Source"]
  const rows = items.map(tx => [
    new Date(tx.createdAt).toISOString(),
    sanitizeCSV(tx.description || tx.source || ""),
    tx.type === "CREDIT" ? "Received" : tx.type === "DEBIT" ? "Paid" : "Event",
    tx.status,
    String(tx.amount),
    sanitizeCSV(tx.source || "")
  ])
  const csv = [headers.join(","), ...rows.map(r => r.join(","))].join("\n")
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  const safeLabel = label.replace(/[^a-z0-9\-]+/gi, "_")
  a.href = url
  a.download = `statement_${mode}_${safeLabel}.csv`
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

function sanitizeCSV(text: string) {
  // Escape quotes and wrap if contains comma or newline
  let t = String(text).replace(/"/g, '""')
  if (/[\n,]/.test(t)) t = `"${t}"`
  return t
}

type UserInfo = {
  name?: string
  email?: string
  accountHolderName?: string
  bankName?: string
  accountNumber?: string
  ifsc?: string
}

async function exportPDF(items: TxResponse[], label: string, mode: Mode, totals: { received: number; paid: number; net: number }, status: StatusFilter, user?: UserInfo) {
  const { jsPDF } = await import("jspdf")
  const autoTable = (await import("jspdf-autotable")).default
  const doc = new jsPDF({ unit: "pt", format: "a4" })

  const title = `Statement (${mode.toUpperCase()})`
  doc.setFontSize(14)
  let y = 40
  doc.text(title, 40, y)
  doc.setFontSize(11)
  y += 20
  if (user) {
    const name = user.name || ""
    const email = user.email || ""
    doc.text(`User: ${name}${email ? ` (${email})` : ""}`, 40, y)
    y += 18
    const parts: string[] = []
    if (user.accountHolderName) parts.push(user.accountHolderName)
    if (user.bankName) parts.push(user.bankName)
    if (user.accountNumber) {
      const last4 = user.accountNumber.slice(-4)
      parts.push(`A/C: •••• ${last4}`)
    }
    if (parts.length) {
      doc.text(`Account: ${parts.join(" • ")}`, 40, y)
      y += 18
    }
    if (user.ifsc) {
      doc.text(`IFSC: ${user.ifsc}`, 40, y)
      y += 18
    }
  }
  doc.text(`Period: ${label}`, 40, y)
  y += 18
  doc.text(`Status: ${status}`, 40, y)
  y += 18
  doc.text(`Received: ${formatAmount(totals.received)}   Paid: ${formatAmount(totals.paid)}   Net: ${formatAmount(totals.net)}`, 40, y)

  const body = items.map(tx => [
    new Date(tx.createdAt).toLocaleString(),
    tx.description || tx.source || "",
    tx.type === "CREDIT" ? "Received" : tx.type === "DEBIT" ? "Paid" : "Event",
    tx.status,
    formatAmount(tx.amount),
    tx.source || "",
  ])

  autoTable(doc, {
    startY: y + 24,
    head: [["Date", "Description", "Direction", "Status", "Amount", "Source"]],
    body,
    styles: { fontSize: 9 },
    headStyles: { fillColor: [30, 30, 30], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 245, 245] },
  })

  const safeLabel = label.replace(/[^a-z0-9\-]+/gi, "_")
  doc.save(`statement_${mode}_${safeLabel}.pdf`)
}
