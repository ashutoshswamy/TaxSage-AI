// src/components/AuthButton.tsx
"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { LogOut, LogIn, UserPlus } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { SidebarMenuButton } from "./ui/sidebar"; // Import SidebarMenuButton

interface AuthButtonProps {
  variant?: "default" | "sidebar"; // Add variant prop
}

export default function AuthButton({ variant = "default" }: AuthButtonProps) {
  const { user, logout, loading } = useAuth(); // Use Supabase context

  if (loading) {
    // Optionally show a loading state or nothing
    return <div className="w-[86px] h-[40px]"></div>; // Placeholder to prevent layout shift
  }

  if (user) {
    // User is logged in
    const userEmail = user.email || "User";
    const fallbackInitial =
      userEmail.length > 0 ? userEmail[0].toUpperCase() : "U"; // Ensure email exists before accessing index
    const userDisplayName = user.user_metadata?.full_name || userEmail; // Example using metadata

    if (variant === "sidebar") {
      // Render a simple logout button for the sidebar menu
      return (
        <SidebarMenuButton
          tooltip="Logout"
          onClick={logout}
          className="w-full justify-start text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        >
          <LogOut />
          <span>Log out</span>
        </SidebarMenuButton>
      );
    }

    // Default variant: Render profile dropdown for header or other contexts
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="relative h-8 w-8 rounded-full">
            <Avatar className="h-8 w-8">
              {/* Use user_metadata.avatar_url if available */}
              <AvatarImage
                src={user.user_metadata?.avatar_url || undefined}
                alt={userDisplayName}
              />
              <AvatarFallback>{fallbackInitial}</AvatarFallback>
            </Avatar>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="end" forceMount>
          <DropdownMenuLabel className="font-normal">
            <div className="flex flex-col space-y-1">
              <p className="text-sm font-medium leading-none">
                {userDisplayName}
              </p>
              <p className="text-xs leading-none text-muted-foreground">
                {userEmail}
              </p>
            </div>
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {/* Add links to profile, settings etc. if needed */}
          {/* <DropdownMenuItem>Profile</DropdownMenuItem>
          <DropdownMenuItem>Settings</DropdownMenuItem>
          <DropdownMenuSeparator /> */}
          <DropdownMenuItem onClick={logout} className="cursor-pointer">
            <LogOut className="mr-2 h-4 w-4" />
            <span>Log out</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  }

  // User is not logged in, show login and signup buttons (same for both variants)
  return (
    <div className="flex gap-2">
      <Link href="/login" passHref>
        <Button variant="outline">
          <LogIn className="mr-2 h-4 w-4" /> Login
        </Button>
      </Link>
      <Link href="/signup" passHref>
        <Button>
          <UserPlus className="mr-2 h-4 w-4" /> Sign Up
        </Button>
      </Link>
    </div>
  );
}
