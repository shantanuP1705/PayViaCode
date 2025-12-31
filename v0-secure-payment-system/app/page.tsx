"use client"
import { useAuthStore } from "@/lib/auth-store"
import { useRouter } from "next/navigation"
import { useEffect, useState } from "react"
import { onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function RootPage() {
  const router = useRouter()
  const [isInitialized, setIsInitialized] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        router.push("/dashboard")
      } else {
        router.push("/login")
      }
      setIsInitialized(true)
    })

    return () => unsubscribe()
  }, [router])

  return (
    <div className="flex h-screen items-center justify-center bg-background">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  )
}
