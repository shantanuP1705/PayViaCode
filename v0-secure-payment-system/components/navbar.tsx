"use client"

import { useAuthStore } from "@/lib/auth-store"
import { Button } from "@/components/ui/button"
import { ShieldCheck, LogOut, User, Bell, FileText } from "lucide-react"
import { useRouter } from "next/navigation"

export function Navbar() {
  const { user, logout } = useAuthStore()
  const router = useRouter()

  const handleLogout = async () => {
    await logout()
    router.push("/login")
  }

  return (
    <nav className="sticky top-0 z-50 w-full glass-strong border-b border-white/10 px-4 py-3">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => router.push("/dashboard")}>
          <div className="bg-primary/20 p-1.5 rounded-lg">
            <ShieldCheck className="w-6 h-6 text-primary" />
          </div>
          <span className="text-xl font-bold tracking-tight text-white">SecurePay</span>
        </div>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon" className="text-muted-foreground hover:text-white">
            <Bell className="w-5 h-5" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-white hidden sm:inline-flex"
            onClick={() => router.push("/statements")}
            title="Statements"
          >
            <FileText className="w-4 h-4 mr-2" />
            Statements
          </Button>
          <div
            className="flex items-center gap-3 bg-white/5 px-3 py-1.5 rounded-full border border-white/10 cursor-pointer hover:bg-white/10"
            onClick={() => router.push("/profile")}
            title="Complete Profile"
          >
            <div className="w-7 h-7 bg-primary/20 rounded-full flex items-center justify-center">
              <User className="w-4 h-4 text-primary" />
            </div>
            <span className="text-sm font-medium text-white hidden sm:inline-block">{user?.name || "User"}</span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-destructive transition-colors"
            onClick={handleLogout}
          >
            <LogOut className="w-5 h-5" />
          </Button>
        </div>
      </div>
    </nav>
  )
}
