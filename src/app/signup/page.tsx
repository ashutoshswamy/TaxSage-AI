// src/app/signup/page.tsx
"use client";

import React from "react"; // Add React import
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { supabase } from "@/lib/supabase"; // Import Supabase client
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Loader2, UserPlus, AlertTriangle, Eye, EyeOff } from "lucide-react"; // Import Eye and EyeOff icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

// Removed Metadata export for client component

const signupSchema = z
  .object({
    email: z.string().email({ message: "Invalid email address" }),
    password: z
      .string()
      .min(6, { message: "Password must be at least 6 characters" }),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords don't match",
    path: ["confirmPassword"],
  });

type SignupFormInputs = z.infer<typeof signupSchema>;

// Define props for the page component
interface SignupPageProps {
  params: Record<string, string | string[] | undefined>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function SignupPage({ params, searchParams }: SignupPageProps) {
  // Explicitly use React.use if needed for params/searchParams
  // const resolvedParams = React.use(params);
  // const resolvedSearchParams = React.use(searchParams);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  const [showConfirmPassword, setShowConfirmPassword] = useState(false); // State for confirm password visibility
  const [isExistingUserError, setIsExistingUserError] = useState(false); // Flag for specific error type
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SignupFormInputs>({
    resolver: zodResolver(signupSchema),
  });

  const onSubmit = async (data: SignupFormInputs) => {
    setLoading(true);
    setError(null);
    setSignupSuccess(false);
    setIsExistingUserError(false); // Reset flag
    let specificErrorHandled = false; // Flag to track if we handled a specific error case

    try {
      // Proceed with signup
      const { data: signUpData, error: signUpError } =
        await supabase.auth.signUp({
          email: data.email,
          password: data.password,
        });

      if (signUpError) {
        // Check if the error indicates a user already exists
        const errorMessageLower = signUpError.message.toLowerCase();
        if (
          errorMessageLower.includes("user already registered") ||
          errorMessageLower.includes("already exists")
        ) {
          const existingUserMessage =
            "An account with this email already exists. Please log in or use a different email.";
          setError(existingUserMessage);
          setIsExistingUserError(true);
          toast({
            title: "Account Exists",
            description: existingUserMessage,
            variant: "default", // Use default variant for informational message
          });
          specificErrorHandled = true;
        } else {
          // Handle other signup errors generically
          setError(`Signup failed: ${signUpError.message}`);
          toast({
            title: "Signup Failed",
            description: signUpError.message || "An unexpected error occurred.",
            variant: "destructive",
          });
          specificErrorHandled = true;
        }
      } else if (signUpData.user) {
        // Handle successful signup initiation (user created, potentially needs confirmation)
        // Check if the user object indicates the user is already confirmed or if confirmation is not needed
        if (signUpData.user.email_confirmed_at || !signUpData.session) {
          // No session usually means confirmation needed
          // User might be instantly confirmed (e.g., email confirmation disabled in Supabase settings)
          toast({
            title: "Signup Successful",
            description: "Account created. Redirecting...",
          });
          router.push("/"); // Redirect confirmed user immediately
          router.refresh(); // Ensure layout updates
        } else {
          // Standard email confirmation needed
          setSignupSuccess(true);
          setError(null); // Clear any previous errors
          setIsExistingUserError(false); // Clear flag
          toast({
            title: "Almost there!",
            description: "Please check your email to confirm your account.",
          });
        }
      } else {
        // Handle unexpected case where signup succeeds but no user data/error is returned
        throw new Error(
          "Signup process completed unexpectedly. Please try again."
        );
      }
    } catch (err: any) {
      // Generic catch block for non-Supabase errors or re-thrown errors
      if (!specificErrorHandled) {
        // Only handle if not already handled by Supabase error logic
        console.error("Generic Signup failed:", err);
        let errorMessage = "Signup failed. Please try again.";
        if (err instanceof Error) {
          if (err.message.includes("Network error")) {
            errorMessage = "Network error. Please check your connection.";
          } else if (
            err.message.includes("Password should be at least 6 characters")
          ) {
            errorMessage = "Password must be at least 6 characters long.";
          } else if (err.message.includes("rate limit exceeded")) {
            errorMessage = "Too many signup attempts. Please try again later.";
          } else {
            errorMessage = err.message; // Use the error message directly
          }
        }
        setError(errorMessage);
        setIsExistingUserError(false); // Ensure flag is false for generic errors
        toast({
          title: "Signup Failed",
          description: errorMessage,
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.14))] bg-secondary/50">
      {" "}
      {/* Removed p-4 */}
      <Card className="w-full max-w-md shadow-lg m-4">
        {" "}
        {/* Added margin to card for spacing */}
        <CardHeader className="text-center px-4 md:px-6 pt-6 md:pt-8 pb-4">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <UserPlus className="text-primary" /> Create Account
          </CardTitle>
          <CardDescription>
            Enter your details to sign up for TaxSage AI.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
          {signupSuccess ? (
            <Alert>
              <AlertTitle>Registration Successful!</AlertTitle>
              <AlertDescription>
                Please check your email inbox (and spam folder) for a
                confirmation link to activate your account.
              </AlertDescription>
            </Alert>
          ) : (
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              {error && (
                // Use default variant for the existing user informational message, destructive for others
                <Alert
                  variant={isExistingUserError ? "default" : "destructive"}
                >
                  {/* Conditionally render AlertTriangle only for destructive errors */}
                  {!isExistingUserError && (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  <AlertTitle>
                    {isExistingUserError ? "Account Exists" : "Error"}
                  </AlertTitle>
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  {...register("email")}
                  aria-invalid={errors.email ? "true" : "false"}
                  aria-describedby={errors.email ? "email-error" : undefined}
                />
                {errors.email && (
                  <p id="email-error" className="text-sm text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 relative">
                {" "}
                {/* Password field */}
                <Label htmlFor="password">Password</Label>
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"} // Toggle type
                  placeholder="••••••••"
                  {...register("password")}
                  aria-invalid={errors.password ? "true" : "false"}
                  aria-describedby={
                    errors.password ? "password-error" : undefined
                  }
                  className="pr-10" // Padding for icon
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-7 h-7 w-7 px-0" // Position icon
                  onClick={() => setShowPassword((prev) => !prev)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                {errors.password && (
                  <p id="password-error" className="text-sm text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>
              <div className="space-y-2 relative">
                {" "}
                {/* Confirm Password field */}
                <Label htmlFor="confirmPassword">Confirm Password</Label>
                <Input
                  id="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"} // Toggle type
                  placeholder="••••••••"
                  {...register("confirmPassword")}
                  aria-invalid={errors.confirmPassword ? "true" : "false"}
                  aria-describedby={
                    errors.confirmPassword ? "confirmPassword-error" : undefined
                  }
                  className="pr-10" // Padding for icon
                />
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="absolute right-1 top-7 h-7 w-7 px-0" // Position icon
                  onClick={() => setShowConfirmPassword((prev) => !prev)}
                  aria-label={
                    showConfirmPassword
                      ? "Hide confirm password"
                      : "Show confirm password"
                  }
                >
                  {showConfirmPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </Button>
                {errors.confirmPassword && (
                  <p
                    id="confirmPassword-error"
                    className="text-sm text-destructive"
                  >
                    {errors.confirmPassword.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Signing
                    up...
                  </>
                ) : (
                  "Sign Up"
                )}
              </Button>
            </form>
          )}
        </CardContent>
        <CardFooter className="text-center text-sm px-4 md:px-6 pb-6">
          <p className="mx-auto">
            {" "}
            {/* Center align paragraph */}
            Already have an account?{" "}
            <Link href="/login" className="text-primary hover:underline">
              Login
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
