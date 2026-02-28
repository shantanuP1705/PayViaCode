"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import Link from "next/link"

type Structured = {
  title?: string
  summary?: string
  steps?: string[]
  actions?: string[]
  links?: { label: string; url: string }[]
  note?: string
}

type Message =
  | { role: "assistant"; text: string }
  | { role: "assistant-structured"; data: Structured }
  | { role: "user"; text: string }

type Props = {
  invoiceCode?: string
  page?: string
}

export function VoiceAssistant({ invoiceCode, page }: Props) {
  const [open, setOpen] = useState(false)
  const [listening, setListening] = useState(false)
  const [input, setInput] = useState("")
  const [messages, setMessages] = useState<Message[]>([{
    role: "assistant",
    text: "Hi! I can help with payments. Say ‘payment issue’, ‘check status’, or ‘contact support’.",
  }])

  const recognitionRef = useRef<any | null>(null)
  const canTTS = typeof window !== "undefined" && "speechSynthesis" in window
  const canSTT = typeof window !== "undefined" && ("webkitSpeechRecognition" in window || "SpeechRecognition" in window)

  // Speak assistant messages when they arrive
  const speak = useCallback((text: string) => {
    if (!canTTS) return
    try {
      const utter = new SpeechSynthesisUtterance(text)
      utter.rate = 1
      utter.pitch = 1
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(utter)
    } catch {}
  }, [canTTS])

  useEffect(() => {
    const last = messages[messages.length - 1]
    if (!last) return
    if (last.role === "assistant") speak(last.text)
    if (last.role === "assistant-structured") speak(last.data.summary || last.data.title || "")
  }, [messages, speak])

  // Initialize browser recognition when first used
  const ensureRecognition = useCallback(() => {
    if (!canSTT || recognitionRef.current) return recognitionRef.current
    const SR: any = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return null
    const rec: any = new SR()
    rec.lang = "en-US"
    rec.interimResults = false
    rec.maxAlternatives = 1
    rec.onresult = (ev: any) => {
      const t = ev.results[0]?.[0]?.transcript?.trim()
      if (t) handleUserText(t)
    }
    rec.onend = () => setListening(false)
    recognitionRef.current = rec
    return rec
  }, [canSTT])

  const startListening = () => {
    const rec = ensureRecognition()
    if (!rec) return
    try {
      setListening(true)
      rec.start()
    } catch {}
  }

  const stopListening = () => {
    const rec = recognitionRef.current
    if (!rec) return
    try {
      rec.stop()
    } catch {}
  }

  const addAssistant = (text: string) => setMessages(m => [...m, { role: "assistant", text }])
  const addAssistantStructured = (data: Structured) => setMessages(m => [...m, { role: "assistant-structured", data }])
  const addUser = (text: string) => setMessages(m => [...m, { role: "user", text }])

  const supportHref = useMemo(() => {
    const params = new URLSearchParams()
    if (invoiceCode) params.set("code", invoiceCode)
    if (page) params.set("from", page)
    return `/support?${params.toString()}`
  }, [invoiceCode, page])

  const handleUserText = (text: string) => {
    addUser(text)
    const t = text.toLowerCase()

    // Simple intent routing
    if (/(support|agent|help|issue|problem|contact)/.test(t)) {
      // Ask AI for guidance, with graceful fallback
      void askAssistant(text)
      return
    }
    if (/(status|payment status|where.*payment|track)/.test(t)) {
      const msg = invoiceCode
        ? `Your invoice code is ${invoiceCode}. You can view detailed status on the invoice or Transactions page.`
        : "You can check your payment status on the Transactions page."
      // Prefer AI response for richer help
      void askAssistant(text, msg)
      return
    }
    if (/(refund|chargeback|cancel)/.test(t)) {
      void askAssistant(
        text,
        "Refunds depend on the receiver’s policy. I’ll open support so we can review your case together.",
      )
      return
    }
    void askAssistant(text, "I didn’t catch a known command. Try ‘contact support’ or ‘check status’.")
  }

  async function askAssistant(userText: string, fallback?: string) {
    addAssistant("Let me check that for you…")
    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: userText, invoiceCode, page }),
      })
      const data = await res.json()
      if (data?.structured) {
        addAssistantStructured(data.structured as Structured)
      } else if (data?.message) {
        addAssistant(data.message)
      } else if (fallback) {
        addAssistant(fallback)
      } else {
        addAssistant("I couldn’t reach the assistant. Please try again or contact support.")
      }
    } catch {
      if (fallback) addAssistant(fallback)
      else addAssistant("I couldn’t reach the assistant. Please try again or contact support.")
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim()) return
    handleUserText(input.trim())
    setInput("")
  }

  return (
    <div className="fixed bottom-5 right-5 z-50">
      {open && (
        <Card className="mb-3 w-[22rem] max-w-[90vw] border-white/10 glass backdrop-blur-md">
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm font-semibold text-white">Assistant</p>
              <div className="flex items-center gap-2">
                {canSTT && (
                  <Button
                    variant={listening ? "destructive" : "secondary"}
                    size="sm"
                    onClick={listening ? stopListening : startListening}
                    aria-pressed={listening}
                  >
                    {listening ? "Stop" : "Speak"}
                  </Button>
                )}
                <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Close</Button>
              </div>
            </div>

            <div className="max-h-56 overflow-y-auto space-y-2 pr-1">
              {messages.map((m, i) => {
                if (m.role === "assistant") {
                  return (
                    <div key={i} className="text-[13px] text-white/90">
                      {m.text}
                    </div>
                  )
                }
                if (m.role === "assistant-structured") {
                  const s = m.data
                  return (
                    <div key={i} className="rounded-md border border-white/10 bg-white/5 p-3 text-[13px] text-white/90">
                      {s.title && <p className="font-semibold mb-1">{s.title}</p>}
                      {s.summary && <p className="mb-2 text-white/80">{s.summary}</p>}
                      {Array.isArray(s.steps) && s.steps.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Steps</p>
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            {s.steps.map((x, idx) => (<li key={idx}>{x}</li>))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(s.actions) && s.actions.length > 0 && (
                        <div className="mb-2">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Actions</p>
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            {s.actions.map((x, idx) => (<li key={idx}>{x}</li>))}
                          </ul>
                        </div>
                      )}
                      {Array.isArray(s.links) && s.links.length > 0 && (
                        <div className="mb-1">
                          <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Links</p>
                          <div className="mt-1 flex flex-col gap-1">
                            {s.links.map((l, idx) => (
                              <a key={idx} href={l.url} target="_blank" rel="noreferrer" className="text-primary underline">
                                {l.label}
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                      {s.note && <p className="mt-2 text-white/70">{s.note}</p>}
                    </div>
                  )
                }
                return (
                  <div key={i} className="text-[13px] text-primary-300 text-right">
                    {m.text}
                  </div>
                )
              })}
            </div>

            <div className="flex gap-2">
              <Button asChild variant="outline" size="sm" className="border-white/10">
                <Link href={supportHref}>Contact Support</Link>
              </Button>
              <Button asChild variant="ghost" size="sm">
                <Link href="/transactions">View Transactions</Link>
              </Button>
            </div>

            <form onSubmit={handleSubmit} className="flex gap-2">
              <Input
                value={input}
                onChange={e => setInput(e.target.value)}
                placeholder={canSTT ? "Type or use Speak…" : "Type your question…"}
                aria-label="Assistant input"
              />
              <Button type="submit" disabled={!input.trim()}>Send</Button>
            </form>
          </CardContent>
        </Card>
      )}
      <Button
        className="rounded-full shadow-lg"
        size="lg"
        aria-expanded={open}
        onClick={() => setOpen(v => !v)}
      >
        {open ? "Hide Help" : "Need Help?"}
      </Button>
    </div>
  )
}
