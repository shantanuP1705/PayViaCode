"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { ArrowLeft, Search, Filter } from "lucide-react"
import { useRouter } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Suspense } from "react" // Added Suspense

function TransactionsContent() {
  const router = useRouter()

  const allTransactions = [
    { id: 1, name: "Amazon", amount: -1250, date: "Today, 2:30 PM", status: "Success", type: "Payer" },
    { id: 2, name: "Coffee Shop", amount: -250, date: "Today, 10:15 AM", status: "Success", type: "Payer" },
    { id: 3, name: "Received from Alex", amount: 5000, date: "Yesterday", status: "Success", type: "Receiver" },
    { id: 4, name: "Netflix Subscription", amount: -499, date: "Dec 25", status: "Success", type: "Payer" },
    { id: 5, name: "Electric Bill", amount: -2840, date: "Dec 22", status: "Success", type: "Payer" },
    { id: 6, name: "Refund: Myntra", amount: 1200, date: "Dec 20", status: "Success", type: "Receiver" },
  ]

  return (
    <main className="mx-auto max-w-3xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-3xl font-bold text-white tracking-tight">Transactions</h1>
      </div>

      <div className="flex gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            className="pl-10 glass border-white/10 h-12 focus:border-primary/50 transition-all text-white"
          />
        </div>
        <Button variant="outline" className="glass border-white/10 h-12 px-4 hover:bg-white/10 bg-transparent">
          <Filter className="w-5 h-5 text-white" />
        </Button>
      </div>

      <div className="space-y-4">
        <div className="space-y-3">
          <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest pl-1">December 2025</p>
          {allTransactions.map((tx) => (
            <TransactionDetailItem key={tx.id} {...tx} />
          ))}
        </div>
      </div>
    </main>
  )
}

function TransactionDetailItem({ name, amount, date, status, type }: any) {
  const isNegative = amount < 0
  return (
    <div className="glass border-white/5 p-5 rounded-2xl flex items-center justify-between group hover:border-primary/30 transition-all cursor-pointer">
      <div className="flex items-center gap-5">
        <div
          className={`w-14 h-14 rounded-2xl flex items-center justify-center ${isNegative ? "bg-destructive/10" : "bg-success/10"}`}
        >
          <div className="text-sm font-bold opacity-80">{name.charAt(0)}</div>
        </div>
        <div>
          <p className="font-bold text-lg text-white leading-tight">{name}</p>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-xs text-muted-foreground">{date}</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/30" />
            <span className="text-[10px] font-bold text-primary tracking-wider uppercase">{type}</span>
          </div>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-black text-xl ${isNegative ? "text-white" : "text-success"}`}>
          {isNegative ? "-" : "+"}₹{Math.abs(amount).toLocaleString()}
        </p>
        <div className="flex items-center justify-end gap-1.5 mt-1">
          <div className="w-1.5 h-1.5 rounded-full bg-success" />
          <span className="text-[10px] uppercase tracking-widest font-black text-success">{status}</span>
        </div>
      </div>
    </div>
  )
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
