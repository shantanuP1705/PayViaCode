"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search } from "lucide-react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Suspense, useEffect, useMemo, useState } from "react"
import { useAuthStore } from "@/lib/auth-store"
import { getTransactions, type TxResponse } from "@/lib/wallet-api"

function TransactionsContent() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)

  const [q, setQ] = useState("")
  const [type, setType] = useState<"ALL" | "CREDIT" | "DEBIT" | "EVENT">("ALL")
  const [status, setStatus] = useState<"ALL" | "Success" | "Failed">("ALL")
  const [source, setSource] = useState<string | "ALL">("ALL")

  const [items, setItems] = useState<TxResponse[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const filters = useMemo(() => ({ q, type, status, source, page: 0, size: 100 }), [q, type, status, source])

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return
      try {
        setLoading(true)
        setError(null)
        const list = await getTransactions(user.email, filters)
        setItems(list)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load transactions"
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [user?.email, filters])

  return (
    <main className="mx-auto max-w-4xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-3xl font-bold text-white tracking-tight">Transactions</h1>
      </div>

      {/* Filters & Search */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by description or counterparty..."
            className="pl-10 glass border-white/10 h-12 focus:border-primary/50 transition-all text-white"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <select
          className="glass border-white/10 h-12 rounded-xl px-3 text-white bg-white/5"
          value={type}
          onChange={(e) => setType(e.target.value as any)}
        >
          <option value="ALL">All Types</option>
          <option value="CREDIT">Credit</option>
          <option value="DEBIT">Debit</option>
          <option value="EVENT">Event</option>
        </select>
        <select
          className="glass border-white/10 h-12 rounded-xl px-3 text-white bg-white/5"
          value={status}
          onChange={(e) => setStatus(e.target.value as any)}
        >
          <option value="ALL">All Status</option>
          <option value="Success">Success</option>
          <option value="Failed">Failed</option>
        </select>
        <select
          className="glass border-white/10 h-12 rounded-xl px-3 text-white bg-white/5"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        >
          <option value="ALL">All Sources</option>
          <option value="ADD_MONEY">Add Money</option>
          <option value="PAYMENT_SENT">Payment Sent</option>
          <option value="PAYMENT_RECEIVED">Payment Received</option>
          <option value="REVERSAL">Reversal</option>
          <option value="MANUAL_DEBIT">Manual Debit</option>
          <option value="ADJUSTMENT">Adjustment</option>
          <option value="PAYMENT_FAILED">Payment Failed</option>
        </select>
      </div>

      <div className="space-y-4">
        {loading ? (
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
        ) : error ? (
          <p className="text-sm text-red-400">{error}</p>
        ) : items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No transactions found.</p>
        ) : (
          <div className="space-y-3">
            {items.map((tx) => (
              <TransactionDetailItem key={`${tx.email}-${tx.createdAt}-${tx.source}`} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </main>
  )
}

function TransactionDetailItem({ tx }: { tx: TxResponse }) {
  const isDebit = tx.type === "DEBIT"
  const isFailed = tx.status && tx.status.toLowerCase() === "failed"
  const amount = isFailed ? 0 : isDebit ? -Math.abs(tx.amount) : Math.abs(tx.amount)
  const name = tx.description || (isFailed ? "Payment Failed" : isDebit ? "Debited" : "Credited")
  const date = new Date(tx.createdAt).toLocaleString()
  const label = isDebit ? "Payer" : tx.type === "CREDIT" ? "Receiver" : "Event"
  const code = extractCode(tx.description)
  return (
    <div className="glass border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer">
      <div className="flex items-center gap-5">
        <div className={`${amount < 0 ? "bg-destructive/10" : "bg-success/10"} w-14 h-14 rounded-2xl flex items-center justify-center`}>
          <div className="text-sm font-bold opacity-80">{name.charAt(0)}</div>
        </div>
        <div>
          <p className="font-bold text-lg text-white leading-tight">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{date}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">{label}</span>
            {code && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
                <Link href={`/invoice/${code}`} className="text-[10px] uppercase tracking-widest font-bold text-primary underline">
                  View Invoice
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-black text-xl ${amount < 0 ? "text-white" : "text-success"}`}>
          {amount < 0 ? "-" : "+"}₹{Math.abs(amount).toLocaleString()}
        </p>
        <span className="text-[10px] uppercase tracking-widest font-black text-muted-foreground">{tx.status}</span>
      </div>
    </div>
  )
}

function extractCode(desc?: string): string | null {
  if (!desc) return null
  const m = desc.match(/Code\s+([A-Z0-9]+)/i)
  return m ? m[1].toUpperCase() : null
}

export default function TransactionsPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <Suspense
          fallback={
            <div className="p-8 text-center text-muted-foreground tracking-widest uppercase text-xs">
              Loading Transactions...
            </div>
          }
        >
          <TransactionsContent />
        </Suspense>
      </div>
    </AuthGuard>
  )
}
