"use client"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { useRouter, useSearchParams } from "next/navigation"
import { useState } from "react"

export default function SupportPage() {
  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground">
        <Navbar />
        <main className="mx-auto max-w-3xl px-4 py-8">
          <SupportContent />
        </main>
      </div>
    </AuthGuard>
  )
}

function SupportContent() {
  const sp = useSearchParams()
  const from = sp.get("from") ?? undefined
  const code = sp.get("code") ?? ""
  const router = useRouter()
  const [email, setEmail] = useState("")
  const [desc, setDesc] = useState("")
  const [sent, setSent] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    // In this lightweight version, we just simulate submission.
    await new Promise(r => setTimeout(r, 400))
    setSent(true)
  }

  return (
    <section className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Customer Support</h1>
        {from && (
          <Button variant="ghost" onClick={() => router.back()}>Back</Button>
        )}
      </div>

      <Card className="glass border-white/10">
        <CardHeader>
          <CardTitle>Report a Payment Issue</CardTitle>
          <CardDescription>Share a few details and we’ll get back to you.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">Invoice Code</p>
              <p className="text-sm text-white font-medium">{code || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">From Page</p>
              <p className="text-sm text-white font-medium">{from || "—"}</p>
            </div>
          </div>

          {sent ? (
            <div className="rounded-md border border-emerald-500/30 bg-emerald-500/10 p-3 text-emerald-300 text-sm">
              Thanks! Your request has been recorded. We’ll contact you at the email provided.
            </div>
          ) : (
            <form onSubmit={submit} className="space-y-3">
              <Input
                type="email"
                required
                placeholder="Your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              <Textarea
                required
                rows={4}
                placeholder="Describe the issue (what happened, any error shown, expected result)"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
              />
              <div className="flex items-center gap-2 justify-between">
                <div className="text-xs text-muted-foreground">
                  We’ll include the invoice code if provided.
                </div>
                <Button type="submit">Submit</Button>
              </div>
            </form>
          )}
        </CardContent>
        <CardFooter className="flex-col items-start gap-3">
          <div className="text-sm text-muted-foreground">Prefer direct contact?</div>
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="outline" className="border-white/10">
              <a href="mailto:support@example.com?subject=Payment%20Issue">Email Support</a>
            </Button>
            <Button asChild variant="ghost">
              <a href="tel:+1800123456">Call +1 800 123 456</a>
            </Button>
          </div>
        </CardFooter>
      </Card>
    </section>
  )
}
