// src/components/ProtectedRoute.tsx
"use client";

import { useEffect, ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";
import { Loader2 } from "lucide-react";

interface ProtectedRouteProps {
  children: ReactNode;
  // Add role-based access control if needed
  // allowedRoles?: string[];
}

const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { user, loading } = useAuth(); // Use Supabase user from context
  const router = useRouter();

  useEffect(() => {
    // If loading is finished and there's no user, redirect to login
    if (!loading && !user) {
      router.push("/login");
    }
    // Add role checking here if needed
    // else if (!loading && user && allowedRoles && !allowedRoles.includes(user.role)) { // Assuming user object has a role property in Supabase
    //   router.push('/unauthorized'); // Or some other page
    // }
  }, [user, loading, router]);

  // Show loading indicator while checking auth state or if user is null initially
  if (loading || !user) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  // If user is authenticated (and authorized if roles are used), render the children
  return <>{children}</>;
};

export default ProtectedRoute;
