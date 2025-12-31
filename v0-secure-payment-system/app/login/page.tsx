"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { useAuthStore, firebaseUserToAppUser } from "@/lib/auth-store"
import { ShieldCheck } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged } from "firebase/auth"
import { auth } from "@/lib/firebase"

export default function LoginPage() {
  const login = useAuthStore((state) => state.login)
  const setLoading = useAuthStore((state) => state.setLoading)
  const router = useRouter()
  const [isLoggingIn, setIsLoggingIn] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isInitialized, setIsInitialized] = useState(false)

  // Check if user is already logged in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser) {
        const appUser = firebaseUserToAppUser(firebaseUser)
        login(appUser)
        router.push("/dashboard")
      }
      setIsInitialized(true)
    })

    return () => unsubscribe()
  }, [])

  const handleGoogleLogin = async () => {
    setIsLoggingIn(true)
    setError(null)
    setLoading(true)

    try {
      const provider = new GoogleAuthProvider()
      const result = await signInWithPopup(auth, provider)

      // Convert Firebase user to app user
      const appUser = firebaseUserToAppUser(result.user)
      
      // Save to Firestore (async)
      await login(appUser)

      // Redirect to dashboard
      router.push("/dashboard")
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to sign in with Google"
      setError(errorMessage)
      console.error("Google login error:", err)
    } finally {
      setIsLoggingIn(false)
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4 relative overflow-hidden">
      <div className="absolute top-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/5 rounded-full blur-[100px]" />

      {!isInitialized ? (
        <div className="flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
        </div>
      ) : (

      <Card className="w-full max-w-md glass border-white/10 shadow-2xl relative z-10">
        <CardHeader className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 bg-primary/20 rounded-2xl flex items-center justify-center mb-2">
            <ShieldCheck className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-1">
            <CardTitle className="text-3xl font-bold tracking-tight text-white">SecurePay</CardTitle>
            <CardDescription className="text-muted-foreground text-base">
              Code-Based Payment Authorization System
            </CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-6 pt-4">
          {error && (
            <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3">
              <p className="text-sm text-red-400">{error}</p>
            </div>
          )}
          <Button
            variant="outline"
            className="w-full h-12 text-lg font-medium border-white/10 hover:bg-white/5 bg-white/5 text-white transition-all duration-300 flex items-center justify-center gap-3"
            onClick={handleGoogleLogin}
            disabled={isLoggingIn}
          >
            {isLoggingIn ? (
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Continue with Google
              </>
            )}
          </Button>

          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">Security Guarantee</p>
            <p className="text-sm text-muted-foreground/60 mt-1">
              Your transactions are protected with end-to-end code authorization.
            </p>
          </div>
        </CardContent>
      </Card>
      )}
    </div>
  )
}
