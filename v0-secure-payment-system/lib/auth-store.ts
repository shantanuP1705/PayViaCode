import { create } from "zustand"
import { persist } from "zustand/middleware"
import { User as FirebaseUser, signOut } from "firebase/auth"
import { auth, db } from "./firebase"
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore"

interface User {
  id: string
  name: string
  email: string
  photoURL?: string
  role: "payer" | "receiver"
}

interface AuthState {
  user: User | null
  isLoading: boolean
  login: (user: User) => Promise<void>
  logout: () => Promise<void>
  setRole: (role: "payer" | "receiver") => Promise<void>
  setLoading: (loading: boolean) => void
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isLoading: false,
      login: async (user) => {
        try {
          // Save user data to Firestore
          const userRef = doc(db, "users", user.id)
          await setDoc(
            userRef,
            {
              id: user.id,
              name: user.name,
              email: user.email,
              photoURL: user.photoURL || null,
              role: user.role,
              lastLogin: serverTimestamp(),
              createdAt: serverTimestamp(),
            },
            { merge: true }
          )
          set({ user })
        } catch (error) {
          console.error("Error saving user to Firestore:", error)
          set({ user })
        }
      },
      logout: async () => {
        try {
          await signOut(auth)
          set({ user: null })
        } catch (error) {
          console.error("Logout error:", error)
          set({ user: null })
        }
      },
      setLoading: (loading) => set({ isLoading: loading }),
      setRole: async (role) => {
        set((state) => ({
          user: state.user ? { ...state.user, role } : null,
        }))
        
        // Update role in Firestore
        const user = useAuthStore.getState().user
        if (user) {
          try {
            const userRef = doc(db, "users", user.id)
            await setDoc(userRef, { role }, { merge: true })
          } catch (error) {
            console.error("Error updating role in Firestore:", error)
          }
        }
      },
    }),
    {
      name: "secure-pay-auth",
    },
  ),
)

// Helper function to convert Firebase user to app user
export const firebaseUserToAppUser = (firebaseUser: FirebaseUser): User => {
  return {
    id: firebaseUser.uid,
    name: firebaseUser.displayName || "User",
    email: firebaseUser.email || "",
    photoURL: firebaseUser.photoURL || undefined,
    role: "payer", // Default role
  }
}

// Function to get user data from Firestore
export const getUserFromFirestore = async (userId: string): Promise<User | null> => {
  try {
    const userRef = doc(db, "users", userId)
    const userDoc = await getDoc(userRef)
    
    if (userDoc.exists()) {
      return userDoc.data() as User
    }
    return null
  } catch (error) {
    console.error("Error fetching user from Firestore:", error)
    return null
  }
}
