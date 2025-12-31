"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { ArrowLeft, Zap, ShieldCheck, Copy, CheckCircle2, Timer } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { usePaymentStore } from "@/lib/payment-store"

export default function BeginPayPage() {
  const router = useRouter()
  const { currentRequest, generateCode, setCurrentRequest } = usePaymentStore()
  const [amount, setAmount] = useState("")
  const [note, setNote] = useState("")
  const [isGenerating, setIsGenerating] = useState(false)
  const [copied, setCopied] = useState(false)
  const [timeLeft, setTimeLeft] = useState(0)

  useEffect(() => {
    if (currentRequest && currentRequest.status === "active") {
      const interval = setInterval(() => {
        const remaining = Math.max(0, Math.floor((currentRequest.expiry - Date.now()) / 1000))
        setTimeLeft(remaining)
        if (remaining === 0) {
          clearInterval(interval)
        }
      }, 1000)
      return () => clearInterval(interval)
    }
  }, [currentRequest])

  const handleGenerate = () => {
    if (!amount || isNaN(Number(amount))) return
    setIsGenerating(true)
    setTimeout(() => {
      generateCode(Number(amount), note)
      setIsGenerating(false)
    }, 1500)
  }

  const copyToClipboard = () => {
    if (currentRequest) {
      navigator.clipboard.writeText(currentRequest.code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    }
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />

        <main className="mx-auto max-w-xl px-4 py-8 space-y-8">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => {
                setCurrentRequest(null)
                router.back()
              }}
              className="text-white"
            >
              <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-3xl font-bold text-white tracking-tight">Generate Code</h1>
          </div>

          {!currentRequest ? (
            <Card className="glass border-white/10 overflow-hidden shadow-2xl">
              <CardContent className="p-8 space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label
                      htmlFor="amount"
                      className="text-sm font-semibold text-muted-foreground uppercase tracking-widest"
                    >
                      Payment Amount (₹)
                    </Label>
                    <div className="relative">
                      <span className="absolute left-4 top-1/2 -translate-y-1/2 text-3xl font-bold text-primary">
                        ₹
                      </span>
                      <Input
                        id="amount"
                        type="number"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        className="pl-12 text-4xl h-20 font-black glass border-white/10 focus:border-primary/50 transition-all text-white bg-transparent"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label
                      htmlFor="note"
                      className="text-sm font-semibold text-muted-foreground uppercase tracking-widest"
                    >
                      Optional Note
                    </Label>
                    <Textarea
                      id="note"
                      placeholder="What is this for?"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="glass border-white/10 focus:border-primary/50 transition-all text-white bg-transparent min-h-[100px]"
                    />
                  </div>
                </div>

                <Button
                  className="w-full h-14 text-lg font-bold bg-primary hover:bg-primary/90 text-white rounded-2xl flex items-center justify-center gap-3 transition-transform active:scale-95 shadow-xl shadow-primary/20"
                  onClick={handleGenerate}
                  disabled={!amount || isGenerating}
                >
                  {isGenerating ? (
                    <div className="h-6 w-6 animate-spin rounded-full border-3 border-white/30 border-t-white" />
                  ) : (
                    <>
                      <Zap className="w-5 h-5 fill-current" />
                      Generate Secure Code
                    </>
                  )}
                </Button>

                <div className="flex items-center gap-3 justify-center text-muted-foreground/60 text-xs">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Verified Secure Authorization</span>
                </div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <Card className="glass border-primary/30 overflow-hidden relative group shadow-2xl">
                <div className="absolute top-0 left-0 w-full h-1 bg-white/10">
                  <div
                    className="h-full bg-primary transition-all duration-1000 ease-linear"
                    style={{ width: `${(timeLeft / 300) * 100}%` }}
                  />
                </div>
                <CardContent className="p-10 space-y-8 text-center">
                  <div className="space-y-2">
                    <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest">
                      Authorization Code
                    </p>
                    <div className="flex items-center justify-center gap-4">
                      <h2 className="text-6xl font-black text-white tracking-[0.2em] ml-[0.2em]">
                        {currentRequest.code}
                      </h2>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={copyToClipboard}
                        className="text-primary hover:text-primary/80 hover:bg-primary/10"
                      >
                        {copied ? <CheckCircle2 className="w-6 h-6" /> : <Copy className="w-6 h-6" />}
                      </Button>
                    </div>
                  </div>

                  <div className="flex justify-center items-center gap-6">
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Amount</p>
                      <p className="text-2xl font-bold text-white">₹{currentRequest.amount.toLocaleString()}</p>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div className="text-center">
                      <p className="text-xs text-muted-foreground uppercase tracking-widest mb-1">Expires In</p>
                      <div className="flex items-center gap-2 justify-center text-primary font-mono text-2xl font-bold">
                        <Timer className="w-5 h-5" />
                        {formatTime(timeLeft)}
                      </div>
                    </div>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/5">
                    <p className="text-sm text-muted-foreground italic">
                      "{currentRequest.note || "No note provided"}"
                    </p>
                  </div>
                </CardContent>
              </Card>

              <div className="flex flex-col gap-3">
                <Button
                  className="h-14 bg-white/5 hover:bg-white/10 border border-white/10 text-white rounded-2xl font-bold"
                  onClick={() => router.push("/approve")}
                >
                  Simulation: Simulate Receiver Request
                </Button>
                <Button
                  variant="ghost"
                  className="text-muted-foreground hover:text-white"
                  onClick={() => setCurrentRequest(null)}
                >
                  Cancel and Go Back
                </Button>
              </div>
            </div>
          )}
        </main>
      </div>
    </AuthGuard>
  )
}
