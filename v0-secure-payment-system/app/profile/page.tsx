"use client"

import { useState } from "react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { saveProfile } from "@/lib/profile-api"

export default function ProfileCompletionPage() {
  const user = useAuthStore((s) => s.user)
  const router = useRouter()

  const [form, setForm] = useState({
    accountHolderName: user?.name || "",
    accountNumber: "",
    bankName: "",
    ifsc: "",
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setErrors((prev) => ({ ...prev, [name]: "" }))
  }

  const validate = () => {
    const errs: Record<string, string> = {}
    if (!form.accountHolderName.trim()) errs.accountHolderName = "Name is required"
    if (!form.accountNumber.trim()) errs.accountNumber = "Account number is required"
    if (!form.bankName.trim()) errs.bankName = "Bank name is required"

    const ifscPattern = /^[A-Z]{4}0[A-Z0-9]{6}$/i
    if (!form.ifsc.trim()) errs.ifsc = "IFSC is required"
    else if (!ifscPattern.test(form.ifsc)) errs.ifsc = "Invalid IFSC format"

    setErrors(errs)
    return Object.keys(errs).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError(null)
    if (!validate()) return
    if (!user?.email) {
      setSubmitError("You must be logged in to submit your profile.")
      return
    }
    try {
      setSubmitting(true)
      const payload = {
        accountHolderName: form.accountHolderName.trim(),
        accountNumber: form.accountNumber.trim(),
        bankName: form.bankName.trim(),
        ifsc: form.ifsc.trim().toUpperCase(),
        email: user.email.toLowerCase(),
      }
      await saveProfile(payload)
      setSubmitted(true)
      router.push("/")
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Failed to save profile"
      setSubmitError(msg)
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background py-8 px-4 flex items-center justify-center">
      <Card className="w-full max-w-2xl glass border-white/10">
        <CardHeader>
          <CardTitle className="text-2xl text-white">Complete Your Profile</CardTitle>
          <CardDescription className="text-muted-foreground">
            Provide your bank details to enable secure payouts.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  value={user?.email || ""}
                  disabled
                  placeholder="Your email"
                />
                <p className="text-xs text-muted-foreground">This email is linked to your account and cannot be edited.</p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="accountHolderName">Account Holder Name</Label>
                <Input
                  id="accountHolderName"
                  name="accountHolderName"
                  value={form.accountHolderName}
                  onChange={handleChange}
                  placeholder="e.g., John Doe"
                />
                {errors.accountHolderName && (
                  <p className="text-xs text-red-400">{errors.accountHolderName}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">Account Number</Label>
                <Input
                  id="accountNumber"
                  name="accountNumber"
                  value={form.accountNumber}
                  onChange={handleChange}
                  inputMode="numeric"
                  placeholder="e.g., 123456789012"
                />
                {errors.accountNumber && (
                  <p className="text-xs text-red-400">{errors.accountNumber}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="bankName">Bank Name</Label>
                <Input
                  id="bankName"
                  name="bankName"
                  value={form.bankName}
                  onChange={handleChange}
                  placeholder="e.g., HDFC Bank"
                />
                {errors.bankName && <p className="text-xs text-red-400">{errors.bankName}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="ifsc">IFSC Code</Label>
                <Input
                  id="ifsc"
                  name="ifsc"
                  value={form.ifsc}
                  onChange={handleChange}
                  placeholder="e.g., HDFC0001234"
                />
                {errors.ifsc && <p className="text-xs text-red-400">{errors.ifsc}</p>}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3">
              <Button type="submit" className="" disabled={submitting}>
                {submitting ? "Saving..." : "Save Details"}
              </Button>
            </div>
          </form>

          {submitError && (
            <div className="mt-4 rounded-lg border border-red-500/40 bg-red-500/10 p-3">
              <p className="text-sm text-red-400">{submitError}</p>
            </div>
          )}
          {submitted && (
            <div className="mt-6 rounded-lg border border-emerald-500/40 bg-emerald-500/10 p-3">
              <p className="text-sm text-emerald-300">
                Profile saved to backend successfully.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
