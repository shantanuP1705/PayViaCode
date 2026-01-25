"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { CheckCircle2, XCircle, ArrowRight, Home, Download, Share2 } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"
import { getPaymentRequestByCode } from "@/lib/payments-api"
import { useEffect, useState, Suspense } from "react"
import { usePaymentStore } from "@/lib/payment-store"

function StatusContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const isSuccess = searchParams.get("success") === "true"
  const codeParam = searchParams.get("code") || undefined
  const amountParam = searchParams.get("amount") || undefined
  const [displayAmount, setDisplayAmount] = useState<number | null>(null)
  const { currentRequest, setCurrentRequest } = usePaymentStore()
  const [showContent, setShowContent] = useState(false)

  useEffect(() => {
    const timer = setTimeout(() => setShowContent(true), 100)
    return () => clearTimeout(timer)
  }, [])

  const handleFinish = () => {
    setCurrentRequest(null)
    router.push("/dashboard")
  }

  return (
    <div
      className={`transition-all duration-1000 ease-out ${showContent ? "opacity-100 translate-y-0" : "opacity-0 translate-y-12"}`}
    >
      <Card
        className={`glass-strong border-none overflow-hidden shadow-2xl relative w-full max-w-md ${isSuccess ? "bg-success/5" : "bg-destructive/5"}`}
      >
        <CardContent className="p-10 space-y-8 text-center">
          {/* Large Icon Animation */}
          <div className="flex justify-center">
            <div
              className={`w-32 h-32 rounded-full flex items-center justify-center relative ${isSuccess ? "bg-success/20 text-success" : "bg-destructive/20 text-destructive"}`}
            >
              {isSuccess ? (
                <>
                  <CheckCircle2 className="w-20 h-20 animate-in zoom-in-50 duration-500" />
                  <div className="absolute inset-0 rounded-full border-4 border-success animate-ping opacity-20" />
                </>
              ) : (
                <XCircle className="w-20 h-20 animate-in zoom-in-50 duration-500" />
              )}
            </div>
          </div>

          <div className="space-y-2">
            <h1 className="text-4xl font-black text-white tracking-tight">
              {isSuccess ? "Payment Successful" : "Transaction Failed"}
            </h1>
            <p className="text-muted-foreground">
              {isSuccess ? "Your funds have been securely transferred." : "Something went wrong with this transaction."}
            </p>
          </div>

          {isSuccess && (currentRequest || codeParam) && (
            <div className="glass border-white/5 p-6 rounded-3xl space-y-4 bg-white/5 animate-in slide-in-from-bottom-2 duration-700">
              <div className="flex justify-between items-center pb-4 border-b border-white/10">
                <span className="text-sm text-muted-foreground uppercase tracking-widest font-bold">Amount</span>
                <span className="text-2xl font-black text-white">₹{Number(displayAmount ?? currentRequest?.amount ?? 0).toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center pt-2">
                <span className="text-xs text-muted-foreground">Transaction ID</span>
                <span className="text-xs font-mono text-white/60">TXN_9821039841</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-xs text-muted-foreground">Auth Code</span>
                <span className="text-xs font-mono text-primary font-bold">{codeParam || currentRequest?.code}</span>
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 pt-4">
            <Button
              variant="outline"
              className="h-14 border-white/10 bg-white/5 text-white rounded-2xl hover:bg-white/10 flex items-center gap-2"
              onClick={() => {
                const code = codeParam || currentRequest?.code
                if (!code) return
                // Open invoice page to allow print
                router.push(`/invoice/${encodeURIComponent(code)}`)
              }}
              disabled={!isSuccess || (!codeParam && !currentRequest?.code)}
            >
              <Download className="w-4 h-4" />
              Receipt
            </Button>
            <Button
              variant="outline"
              className="h-14 border-white/10 bg-white/5 text-white rounded-2xl hover:bg-white/10 flex items-center gap-2"
              onClick={async () => {
                const code = codeParam || currentRequest?.code
                if (!code) return
                const url = `${typeof window !== "undefined" ? window.location.origin : ""}/invoice/${encodeURIComponent(code)}`
                const title = `Payment Receipt ${code}`
                const text = `View payment receipt ${code}`
                try {
                  if (navigator.share) {
                    await navigator.share({ title, text, url })
                  } else {
                    await navigator.clipboard.writeText(url)
                    alert("Invoice link copied to clipboard")
                  }
                } catch (e) {
                  console.error(e)
                }
              }}
              disabled={!isSuccess || (!codeParam && !currentRequest?.code)}
            >
              <Share2 className="w-4 h-4" />
              Share
            </Button>
          </div>

          <Button
            className={`w-full h-16 text-lg font-black rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl ${isSuccess ? "bg-success hover:bg-success/90 shadow-success/20" : "bg-primary hover:bg-primary/90 shadow-primary/20"}`}
            onClick={handleFinish}
          >
            <Home className="w-5 h-5" />
            Return to Dashboard
            <ArrowRight className="w-5 h-5" />
          </Button>
        </CardContent>
      </Card>
      {isSuccess && (
        <InitAmount code={codeParam} amount={amountParam} onSet={(n) => setDisplayAmount(n)} />
      )}
    </div>
  )
}

export default function StatusPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground overflow-hidden">
        <Navbar />

        <main className="mx-auto max-w-xl px-4 py-8 flex flex-col items-center justify-center min-h-[80vh]">
          <Suspense
            fallback={
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
            }
          >
            <StatusContent />
          </Suspense>
        </main>
      </div>
    </AuthGuard>
  )
}
// Initialize display amount based on query or fetch by code
function InitAmount({ code, amount, onSet }: { code?: string; amount?: string; onSet: (n: number) => void }) {
  useEffect(() => {
    const a = amount ? Number(amount) : undefined
    if (typeof a === "number" && !Number.isNaN(a)) {
      onSet(a)
      return
    }
    if (code) {
      getPaymentRequestByCode(code)
        .then((d) => {
          const n = typeof d.amount === "number" ? d.amount : Number(d.amount)
          if (!Number.isNaN(n)) onSet(n)
        })
        .catch(() => {})
    }
  }, [code, amount, onSet])
  return null
}
