// src/context/AuthContext.tsx
"use client";

import type { User, Session } from "@supabase/supabase-js";
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { supabase } from "@/lib/supabase";
import { Loader2 } from "lucide-react";

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSession = async () => {
      try {
        const {
          data: { session: currentSession },
          error,
        } = await supabase.auth.getSession();
        if (error) {
          console.error("Error fetching session:", error);
          // Don't set loading false here yet, let onAuthStateChange handle it
          // setLoading(false);
          // return;
        }
        // Set initial state based on getSession
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
      } catch (e) {
        console.error("Exception fetching session:", e);
      } finally {
        // Set loading false *after* the initial check OR after the first onAuthStateChange event fires
        // This ensures we don't have a flash of incorrect state
        if (loading) setLoading(false); // Only set if still loading
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        // Ensure loading is false after any auth state change, especially the initial one
        if (loading) setLoading(false);
      }
    );

    // Cleanup subscription on unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [loading]); // Add loading to dependency array to manage the final setLoading(false)

  const logout = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        // Check if it's the specific session missing error
        if (error.message === "Auth session missing!") {
          // This can happen if the session expired or was invalidated between page load and logout click.
          // Log as warning, as the user is effectively logged out anyway.
          console.warn(
            "Supabase signOut warning:",
            error.message,
            "(User might already be effectively signed out)"
          );
          // Force clear local state just in case onAuthStateChange doesn't fire reliably in this edge case
          setUser(null);
          setSession(null);
        } else {
          // Log other errors as critical
          console.error("Error signing out: ", error);
          // Potentially show a user-facing toast for unexpected errors
          // toast({ title: "Logout Error", description: "An unexpected error occurred during logout.", variant: "destructive" });
        }
      }
      // State updates are primarily handled by onAuthStateChange,
      // but the explicit null setting above handles the specific warning case.
    } catch (error) {
      console.error("Exception during sign out: ", error);
      // Handle other potential exceptions during the process
      // toast({ title: "Logout Exception", description: "An unexpected error occurred.", variant: "destructive" });
    }
  };

  // Show loading indicator while checking auth state initially
  // Remove the loading check here, as MainLayout now handles it based on context's loading state
  // if (loading) {
  //   return (
  //     <div className="flex justify-center items-center min-h-screen">
  //       <Loader2 className="h-12 w-12 animate-spin text-primary" />
  //     </div>
  //   );
  // }

  return (
    <AuthContext.Provider value={{ user, session, loading, logout }}>
      {!loading ? (
        children // Render children only when not loading, or show a global loader
      ) : (
        <div className="flex justify-center items-center min-h-screen">
          <Loader2 className="h-12 w-12 animate-spin text-primary" />
        </div>
      )}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
