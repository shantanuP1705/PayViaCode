"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { ShieldCheck, User, X, Check, Fingerprint, Lock } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { useEffect, useState } from "react"
import { getPaymentRequestByCode, approveConfirmedCode, type PaymentRequestDetails } from "@/lib/payments-api"

export default function ApprovePage() {
  const router = useRouter()
  const params = useSearchParams()
  const [request, setRequest] = useState<PaymentRequestDetails | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isApproving, setIsApproving] = useState(false)
  const [showMpin, setShowMpin] = useState(false)
  const [mpin, setMpin] = useState("")
  const [mpinError, setMpinError] = useState<string | null>(null)

  useEffect(() => {
    const code = params.get("code")
    if (!code) return
    const load = async () => {
      try {
        setLoading(true)
        setError(null)
        const data = await getPaymentRequestByCode(code)
        setRequest(data)
      } catch (e) {
        const msg = e instanceof Error ? e.message : "Failed to load request"
        setError(msg)
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [params])

  const handleApprove = () => {
    setShowMpin(true)
  }

  const submitMpin = async () => {
    const code = params.get("code") || ""
    const clean = mpin.replace(/\D/g, "")
    if (clean.length < 4 || clean.length > 6) {
      setMpinError("Enter a 4-6 digit MPIN")
      return
    }
    try {
      setIsApproving(true)
      setMpinError(null)
      const res = await approveConfirmedCode(code, clean)
      if (res.status === "CODE_CONFIRMED") {
        router.push("/status?success=true")
      } else {
        setMpinError("Unable to confirm. Try again.")
      }
    } catch (e) {
      setMpinError("Invalid MPIN or code.")
    } finally {
      setIsApproving(false)
    }
  }

  if (loading) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
          </div>
        </div>
      </AuthGuard>
    )
  }

  if (error || !request) {
    return (
      <AuthGuard>
        <div className="min-h-screen bg-background">
          <Navbar />
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4">
            <div className="w-20 h-20 bg-muted rounded-full flex items-center justify-center">
              <ShieldCheck className="w-10 h-10 text-muted-foreground" />
            </div>
            <h2 className="text-2xl font-bold text-white">No Pending Requests</h2>
            {error && <p className="text-sm text-red-400">{error}</p>}
            <Button onClick={() => router.push("/dashboard")}>Go to Dashboard</Button>
          </div>
        </div>
      </AuthGuard>
    )
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground relative overflow-hidden">
        <Navbar />

        <main className="mx-auto max-w-xl px-4 py-8 space-y-8 relative z-10">
          <div className="space-y-2 text-center">
            <h1 className="text-3xl font-bold text-white tracking-tight">Payment Approval</h1>
            <p className="text-muted-foreground">Review and authorize the incoming request</p>
          </div>

          <Card className="glass-strong border-primary/30 overflow-hidden shadow-2xl animate-in fade-in slide-in-from-bottom-4 duration-500">
            <CardContent className="p-0">
              <div className="bg-primary/10 p-8 flex flex-col items-center border-b border-white/10">
                <div className="w-24 h-24 bg-white/5 rounded-3xl flex items-center justify-center mb-6 border border-white/10 shadow-2xl relative">
                  <User className="w-12 h-12 text-primary" />
                  <div className="absolute -bottom-2 -right-2 w-8 h-8 bg-success rounded-full flex items-center justify-center border-4 border-background">
                    <Check className="w-4 h-4 text-white font-bold" />
                  </div>
                </div>
                <div className="text-center">
                  <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-1">
                    Receiver Confirmed
                  </p>
                  <h2 className="text-2xl font-bold text-white">Approve Payment</h2>
                </div>
              </div>

              <div className="p-8 space-y-8">
                <div className="text-center space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">
                    Amount Requested
                  </p>
                  <p className="text-5xl font-black text-white">₹{Number(request.amount).toLocaleString()}</p>
                </div>

                <div className="space-y-4">
                  {request.payerEmail && (
                    <div className="flex items-center justify-between p-4 glass border-white/5 rounded-2xl">
                      <span className="text-sm text-muted-foreground">Payer</span>
                      <span className="text-sm text-white">{request.payerEmail}</span>
                    </div>
                  )}
                  {request.receiverEmail && (
                    <div className="flex items-center justify-between p-4 glass border-white/5 rounded-2xl">
                      <span className="text-sm text-muted-foreground">Receiver</span>
                      <span className="text-sm text-white">{request.receiverEmail}</span>
                    </div>
                  )}
                  {(request.receiverAccountHolderName || request.receiverAccountNumber) && (
                    <div className="flex items-center justify-between p-4 glass border-white/5 rounded-2xl">
                      <span className="text-sm text-muted-foreground">Receiver Account</span>
                      <span className="text-sm text-white">
                        {request.receiverAccountHolderName || ""}
                        {request.receiverAccountHolderName && request.receiverAccountNumber ? " · " : ""}
                        {request.receiverAccountNumber ? `A/C ${request.receiverAccountNumber}` : ""}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between p-4 glass border-white/5 rounded-2xl">
                    <span className="text-sm text-muted-foreground">Transaction Code</span>
                    <span className="font-mono font-bold text-primary tracking-widest">{request.code}</span>
                  </div>
                  <div className="flex items-center justify-between p-4 glass border-white/5 rounded-2xl">
                    <span className="text-sm text-muted-foreground">Reference</span>
                    <span className="text-sm text-white italic">"{request.note || "General Payment"}"</span>
                  </div>
                </div>

                {!showMpin ? (
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      variant="outline"
                      className="h-16 rounded-2xl border-white/10 bg-white/5 hover:bg-destructive/10 hover:border-destructive/30 text-white font-bold transition-all flex items-center gap-2"
                      onClick={() => {
                        router.push("/status?success=false")
                      }}
                    >
                      <X className="w-5 h-5" />
                      Reject
                    </Button>
                    <Button
                      className="h-16 rounded-2xl bg-primary hover:bg-primary/90 text-white font-bold shadow-xl shadow-primary/20 transition-all flex items-center gap-2"
                      onClick={handleApprove}
                    >
                      <Check className="w-5 h-5" />
                      Approve
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6 animate-in fade-in zoom-in-95 duration-300">
                    <div className="flex flex-col items-center justify-center p-8 bg-white/5 rounded-3xl border border-white/10 space-y-4">
                      <div className="w-full space-y-3">
                        <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest">Enter MPIN</label>
                        <input
                          type="password"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={6}
                          value={mpin}
                          onChange={(e) => setMpin(e.target.value.replace(/\D/g, ""))}
                          className="w-full h-14 text-center text-2xl font-black tracking-[0.3em] glass border-white/10 rounded-2xl bg-transparent text-white"
                        />
                        {mpinError && <p className="text-destructive text-sm text-center">{mpinError}</p>}
                      </div>
                      <Button className="w-full h-12 rounded-2xl" onClick={submitMpin} disabled={isApproving}>
                        {isApproving ? "Confirming..." : "Confirm Payment"}
                      </Button>
                      <Button variant="ghost" className="w-full text-muted-foreground" onClick={() => setShowMpin(false)} disabled={isApproving}>
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <div className="flex items-center gap-2 justify-center text-muted-foreground/40 text-xs">
            <Lock className="w-3 h-3" />
            <span>Encrypted with 256-bit Secure Authorization</span>
          </div>
        </main>
      </div>
    </AuthGuard>
  )
}
