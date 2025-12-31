"use client"

import type React from "react"

import { useAuthStore } from "@/lib/auth-store"
import { useRouter, usePathname } from "next/navigation"
import { useEffect } from "react"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuthStore()
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    if (!isLoading && !user && pathname !== "/login" && pathname !== "/register") {
      router.push("/login")
    }

    if (user && (pathname === "/login" || pathname === "/register")) {
      router.push("/dashboard")
    }
  }, [user, isLoading, pathname, router])

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-background">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
      </div>
    )
  }

  return <>{children}</>
}
