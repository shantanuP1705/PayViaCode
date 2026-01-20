"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { useAuthStore } from "@/lib/auth-store"
import { useState } from "react"
import { addMoney, getWalletBalance } from "@/lib/wallet-api"
import { useRouter } from "next/navigation"

export default function AddMoneyPage() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()
  const [amount, setAmount] = useState("")
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [balance, setBalance] = useState<number | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!user?.email) {
      setError("You must be logged in.")
      return
    }
    const amt = Number(amount)
    if (!Number.isFinite(amt) || amt <= 0) {
      setError("Enter a valid amount greater than 0.")
      return
    }
    try {
      setSubmitting(true)
      const resp = await addMoney(user.email, amt)
      setSuccess(`Added ₹${amt.toLocaleString()} to your wallet.`)
      setBalance(resp.balance)
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to add money"
      setError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-xl px-4 py-8 space-y-8">
          <Card className="glass border-white/10">
            <CardContent className="p-6 space-y-6">
              <h1 className="text-2xl font-bold text-white">Add Money</h1>
              <form className="space-y-4" onSubmit={handleSubmit}>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount (₹)</Label>
                  <Input id="amount" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="1000" />
                </div>
                <Button type="submit" disabled={submitting}>{submitting ? "Adding..." : "Add Money"}</Button>
              </form>
              {error && <p className="text-sm text-red-400">{error}</p>}
              {success && <p className="text-sm text-emerald-300">{success}</p>}
              {balance !== null && (
                <p className="text-sm text-muted-foreground">Current Wallet Balance: ₹{Number(balance).toLocaleString()}</p>
              )}
              <Button variant="ghost" onClick={() => router.push("/dashboard")}>
                Back to Dashboard
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    </AuthGuard>
  )
}
