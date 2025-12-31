"use client"

import type React from "react"

import { Navbar } from "@/components/navbar"
import { AuthGuard } from "@/components/auth-guard"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Wallet, ArrowUpRight, ArrowDownLeft, History, Plus, QrCode } from "lucide-react"
import { useRouter } from "next/navigation"
import { useAuthStore } from "@/lib/auth-store"
import { useEffect, useState } from "react"
import { getProfileByEmail, type ProfilePayload } from "@/lib/profile-api"

export default function DashboardPage() {
  const router = useRouter()
  const user = useAuthStore((s) => s.user)
  const [profile, setProfile] = useState<ProfilePayload | null>(null)
  const [loadingProfile, setLoadingProfile] = useState(false)
  const [profileError, setProfileError] = useState<string | null>(null)

  useEffect(() => {
    const load = async () => {
      if (!user?.email) return
      try {
        setLoadingProfile(true)
        setProfileError(null)
        const data = await getProfileByEmail(user.email)
        setProfile(data)
      } catch (err) {
        const msg = err instanceof Error ? err.message : "Failed to load profile"
        setProfileError(msg)
      } finally {
        setLoadingProfile(false)
      }
    }
    load()
  }, [user?.email])

  const recentTransactions = [
    { id: 1, name: "Amazon", amount: -1250, date: "Today, 2:30 PM", status: "Success" },
    { id: 2, name: "Coffee Shop", amount: -250, date: "Today, 10:15 AM", status: "Success" },
    { id: 3, name: "Received from Alex", amount: 5000, date: "Yesterday", status: "Success" },
  ]

  return (
    <AuthGuard>
      <div className="min-h-screen bg-background text-foreground pb-20 sm:pb-0">
        <Navbar />

        <main className="mx-auto max-w-5xl px-4 py-8 space-y-8">
          {/* Profile Summary Card */}
          <section>
            <Card className="glass border-white/10 shadow-xl">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-xl font-semibold text-white">Profile Summary</h3>
                  <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-white" onClick={() => router.push("/profile")}>Edit</Button>
                </div>
                {loadingProfile ? (
                  <div className="h-6 w-6 animate-spin rounded-full border-2 border-primary border-t-transparent" />
                ) : profileError ? (
                  <p className="text-sm text-red-400">{profileError}</p>
                ) : profile ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <InfoRow label="Account Holder" value={profile.accountHolderName} />
                    <InfoRow label="Email" value={profile.email} />
                    <InfoRow label="Bank" value={profile.bankName} />
                    <InfoRow label="IFSC" value={profile.ifsc} />
                    <InfoRow label="Account Number" value={maskAccount(profile.accountNumber)} />
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No profile found. Complete your profile to see summary here.</p>
                )}
              </CardContent>
            </Card>
          </section>
          {/* Wallet Card */}
          <section>
            <Card className="glass-strong border-primary/20 shadow-2xl overflow-hidden relative group transition-all duration-500 hover:shadow-primary/10">
              <div className="absolute top-0 right-0 p-8 opacity-10 group-hover:opacity-20 transition-opacity">
                <Wallet className="w-32 h-32 text-primary" />
              </div>
              <CardContent className="p-8 space-y-6 relative z-10">
                <div className="space-y-1">
                  <p className="text-sm font-medium text-muted-foreground uppercase tracking-widest">Total Balance</p>
                  <h2 className="text-5xl font-bold text-white tracking-tight">₹45,280.50</h2>
                </div>

                <div className="flex flex-wrap gap-4">
                  <Button
                    className="bg-primary hover:bg-primary/90 text-white px-6 h-12 rounded-xl flex items-center gap-2 transition-transform active:scale-95"
                    onClick={() => router.push("/begin-pay")}
                  >
                    <Plus className="w-5 h-5" />
                    Begin Pay
                  </Button>
                  <Button
                    variant="outline"
                    className="border-white/10 bg-white/5 hover:bg-white/10 text-white px-6 h-12 rounded-xl flex items-center gap-2 transition-transform active:scale-95"
                    onClick={() => router.push("/pay-by-code")}
                  >
                    <QrCode className="w-5 h-5" />
                    Pay by Code
                  </Button>
                </div>
              </CardContent>
            </Card>
          </section>

          {/* Quick Actions */}
          <section className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <ActionCard icon={<Plus className="text-primary" />} label="Add Money" />
            <ActionCard icon={<ArrowUpRight className="text-primary" />} label="Send" />
            <ActionCard icon={<ArrowDownLeft className="text-primary" />} label="Request" />
            <ActionCard
              icon={<History className="text-primary" />}
              label="History"
              onClick={() => router.push("/transactions")}
            />
          </section>

          {/* Recent Transactions */}
          <section className="space-y-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="text-xl font-semibold text-white">Recent Activity</h3>
              <Button
                variant="link"
                className="text-primary hover:text-primary/80"
                onClick={() => router.push("/transactions")}
              >
                View All
              </Button>
            </div>
            <div className="space-y-3">
              {recentTransactions.map((tx) => (
                <TransactionItem key={tx.id} {...tx} />
              ))}
            </div>
          </section>
        </main>
      </div>
    </AuthGuard>
  )
}

function ActionCard({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick?: () => void }) {
  return (
    <button
      onClick={onClick}
      className="glass border-white/5 p-4 rounded-2xl flex flex-col items-center gap-3 transition-all duration-300 hover:bg-white/10 active:scale-95 group"
    >
      <div className="bg-primary/10 p-3 rounded-xl group-hover:bg-primary/20 transition-colors">{icon}</div>
      <span className="text-sm font-medium text-muted-foreground">{label}</span>
    </button>
  )
}

function TransactionItem({ name, amount, date, status }: any) {
  const isNegative = amount < 0
  return (
    <div className="glass border-white/5 p-4 rounded-2xl flex items-center justify-between group hover:bg-white/5 transition-all">
      <div className="flex items-center gap-4">
        <div
          className={`w-12 h-12 rounded-full flex items-center justify-center ${isNegative ? "bg-destructive/10" : "bg-success/10"}`}
        >
          {isNegative ? (
            <ArrowUpRight className="w-6 h-6 text-destructive" />
          ) : (
            <ArrowDownLeft className="w-6 h-6 text-success" />
          )}
        </div>
        <div>
          <p className="font-semibold text-white">{name}</p>
          <p className="text-xs text-muted-foreground">{date}</p>
        </div>
      </div>
      <div className="text-right">
        <p className={`font-bold ${isNegative ? "text-white" : "text-success"}`}>
          {isNegative ? "-" : "+"}₹{Math.abs(amount).toLocaleString()}
        </p>
        <span className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground opacity-50">
          {status}
        </span>
      </div>
    </div>
  )
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="space-y-1">
      <p className="text-xs uppercase tracking-widest text-muted-foreground font-semibold">{label}</p>
      <p className="text-sm text-white font-medium">{value}</p>
    </div>
  )
}

function maskAccount(acct: string) {
  if (!acct) return ""
  const clean = acct.replace(/\s+/g, "")
  if (clean.length <= 4) return clean
  const last4 = clean.slice(-4)
  const masked = "•••• " + last4
  return masked
}
