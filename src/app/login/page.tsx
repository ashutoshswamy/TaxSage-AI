// src/app/login/page.tsx
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
import { Loader2, LogIn, AlertTriangle, Eye, EyeOff } from "lucide-react"; // Import Eye and EyeOff icons
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

const loginSchema = z.object({
  email: z.string().email({ message: "Invalid email address" }),
  password: z.string().min(1, { message: "Password is required" }),
});

type LoginFormInputs = z.infer<typeof loginSchema>;

// Define props for the page component
interface LoginPageProps {
  params: Record<string, string | string[] | undefined>;
  searchParams: Record<string, string | string[] | undefined>;
}

export default function LoginPage({ params, searchParams }: LoginPageProps) {
  // Explicitly use React.use if needed for params/searchParams
  // const resolvedParams = React.use(params);
  // const resolvedSearchParams = React.use(searchParams);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false); // State for password visibility
  const router = useRouter();
  const { toast } = useToast();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormInputs>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormInputs) => {
    setLoading(true);
    setError(null);
    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: data.email,
        password: data.password,
      });

      if (signInError) {
        throw signInError;
      }

      toast({ title: "Login Successful", description: "Welcome back!" });
      router.push("/");
      router.refresh();
    } catch (err: any) {
      console.error("Login failed:", err);
      let errorMessage = "Login failed. Please check your credentials.";
      if (err.message.includes("Invalid login credentials")) {
        errorMessage = "Invalid email or password.";
      } else if (
        err.message.includes("Email rate limit exceeded") ||
        err.message.includes("rate limit exceeded")
      ) {
        errorMessage = "Too many login attempts. Please try again later.";
      }
      setError(errorMessage);
      toast({
        title: "Login Failed",
        description: errorMessage,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-[calc(100vh-theme(spacing.14))] bg-secondary/50">
      {" "}
      {/* Removed p-4 */}
      {/* Removed margin (m-4) from Card to make it fit the container */}
      <Card className="w-full max-w-md shadow-lg">
        <CardHeader className="text-center px-4 md:px-6 pt-6 md:pt-8 pb-4">
          <CardTitle className="text-2xl font-bold flex items-center justify-center gap-2">
            <LogIn className="text-primary" /> Login to TaxSage AI
          </CardTitle>
          <CardDescription>
            Enter your email and password to access your account.
          </CardDescription>
        </CardHeader>
        <CardContent className="px-4 md:px-6 pb-6 md:pb-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {error && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
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
              {/* Added relative positioning */}
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type={showPassword ? "text" : "password"} // Toggle input type
                placeholder="••••••••"
                {...register("password")}
                aria-invalid={errors.password ? "true" : "false"}
                aria-describedby={
                  errors.password ? "password-error" : undefined
                }
                className="pr-10" // Add padding to prevent text overlap
              />
              {/* Eye icon button */}
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-1 top-7 h-7 w-7 px-0" // Position the icon
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
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Logging
                  in...
                </>
              ) : (
                "Login"
              )}
            </Button>
          </form>
        </CardContent>
        <CardFooter className="text-center text-sm px-4 md:px-6 pb-6">
          <p className="mx-auto">
            Don't have an account?{" "}
            <Link href="/signup" className="text-primary hover:underline">
              Sign up
            </Link>
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
