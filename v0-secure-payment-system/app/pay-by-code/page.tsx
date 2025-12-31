"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { ArrowLeft, Key, Search, User, ShieldCheck, ArrowRight } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, Suspense } from "react" // Added Suspense
import { usePaymentStore } from "@/lib/payment-store"

function PayByCodeContent() {
  const router = useRouter()
  const { currentRequest } = usePaymentStore()
  const [code, setCode] = useState("")
  const [isVerifying, setIsVerifying] = useState(false)
  const [error, setError] = useState("")
  const [verifiedRequest, setVerifiedRequest] = useState<any>(null)

  const handleVerify = () => {
    if (code.length < 6) return
    setIsVerifying(true)
    setError("")

    // Simulation: check against store or dummy data
    setTimeout(() => {
      if (currentRequest && code.toUpperCase() === currentRequest.code) {
        setVerifiedRequest(currentRequest)
      } else if (code.toUpperCase() === "DEMO12") {
        setVerifiedRequest({
          amount: 2500,
          payerName: "Jane Smith",
          note: "Demo Payment",
          status: "active",
        })
      } else {
        setError("Invalid or expired payment code.")
      }
      setIsVerifying(false)
    }, 1500)
  }

  return (
    <main className="mx-auto max-w-xl px-4 py-8 space-y-8">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={() => router.back()} className="text-white">
          <ArrowLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-3xl font-bold text-white tracking-tight">Receive Payment</h1>
      </div>

      {!verifiedRequest ? (
        <Card className="glass border-white/10 overflow-hidden shadow-2xl">
          <CardContent className="p-8 space-y-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code" className="text-sm font-semibold text-muted-foreground uppercase tracking-widest">
                  Enter Authorization Code
                </Label>
                <div className="relative">
                  <Key className="absolute left-4 top-1/2 -translate-y-1/2 w-6 h-6 text-primary" />
                  <Input
                    id="code"
                    placeholder="ABC-123"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    maxLength={6}
                    className="pl-14 text-4xl h-20 font-black tracking-[0.2em] glass border-white/10 focus:border-primary/50 transition-all text-white bg-transparent uppercase"
                  />
                </div>
                {error && <p className="text-destructive text-sm font-medium mt-2 text-center">{error}</p>}
              </div>
            </div>

            <Button
              className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl shadow-primary/20"
              onClick={handleVerify}
              disabled={code.length < 6 || isVerifying}
            >
              {isVerifying ? (
                <div className="h-6 w-6 animate-spin rounded-full border-3 border-white/30 border-t-white" />
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Verify Code
                </>
              )}
            </Button>

            <div className="text-center">
              <p className="text-xs text-muted-foreground/40">Ask the payer for their unique 6-character code.</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6 animate-in fade-in zoom-in-95 duration-500">
          <Card className="glass border-success/30 overflow-hidden shadow-2xl">
            <CardContent className="p-10 space-y-8">
              <div className="flex flex-col items-center text-center space-y-4">
                <div className="w-20 h-20 bg-success/20 rounded-full flex items-center justify-center">
                  <ShieldCheck className="w-12 h-12 text-success" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">Verification Successful</h2>
                  <p className="text-muted-foreground">Authorized payment request found</p>
                </div>
              </div>

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between p-4 glass border-white/5 rounded-2xl">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <User className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground uppercase tracking-widest">Payer</p>
                      <p className="font-bold text-white">
                        {verifiedRequest.payerName || "John D***"} (Masked for Security)
                      </p>
                    </div>
                  </div>
                </div>

                <div className="flex items-center justify-between p-6 bg-white/5 rounded-2xl border border-white/5">
                  <div>
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Amount to Receive</p>
                    <p className="text-4xl font-black text-white">₹{verifiedRequest.amount.toLocaleString()}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-muted-foreground uppercase tracking-widest">Note</p>
                    <p className="text-sm font-medium text-white italic">"{verifiedRequest.note || "No note"}"</p>
                  </div>
                </div>
              </div>

              <Button
                className="w-full h-16 text-xl font-black bg-success hover:bg-success/90 text-white rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl shadow-success/20"
                onClick={() => router.push("/status?success=true")}
              >
                Request Payment
                <ArrowRight className="w-6 h-6" />
              </Button>
            </CardContent>
          </Card>

          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-white"
            onClick={() => setVerifiedRequest(null)}
          >
            Cancel and Clear
          </Button>
        </div>
      )}
    </main>
  )
}

export default function PayByCodePage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <Suspense
          fallback={
            <div className="p-8 text-center text-muted-foreground tracking-widest uppercase text-xs">
              Initialising Receiver Flow...
            </div>
          }
        >
          <PayByCodeContent />
        </Suspense>
      </div>
    </AuthGuard>
  )
}
