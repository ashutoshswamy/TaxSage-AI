// src/components/ui/sidebar.tsx
"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { VariantProps, cva } from "class-variance-authority";
import { PanelLeft } from "lucide-react";

import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet"; // Import SheetHeader and SheetTitle
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

// Use CSS variables defined in globals.css
// const SIDEBAR_WIDTH = "var(--sidebar-width)"
// const SIDEBAR_WIDTH_MOBILE = "var(--sidebar-width-mobile)"

type SidebarCollapsible = "offcanvas" | "none";

type SidebarContext = {
  open: boolean; // Represents desktop state (always true if collapsible='none')
  setOpen: (open: boolean) => void; // Still needed for controlled scenarios if ever used
  openMobile: boolean;
  setOpenMobile: (open: boolean) => void;
  isMobile: boolean;
  toggleSidebar: () => void; // Toggles mobile sidebar only if collapsible='offcanvas'
  collapsible: SidebarCollapsible; // Pass collapsible prop down
};

const SidebarContext = React.createContext<SidebarContext | null>(null);

function useSidebar() {
  const context = React.useContext(SidebarContext);
  if (!context) {
    throw new Error("useSidebar must be used within a SidebarProvider.");
  }
  return context;
}

const SidebarProvider = React.forwardRef<
  HTMLDivElement,
  Omit<React.HTMLAttributes<HTMLDivElement>, "defaultOpen"> & {
    // Omit original defaultOpen
    defaultOpen?: boolean; // Now primarily affects mobile initial state if collapsible='offcanvas'
    open?: boolean; // Controlled state for mobile if collapsible='offcanvas'
    onOpenChange?: (open: boolean) => void; // For mobile offcanvas changes
    collapsible?: SidebarCollapsible; // Prop to determine behavior
  }
>(
  (
    {
      open: openProp,
      onOpenChange: setOpenProp,
      collapsible: collapsibleProp = "offcanvas", // Default to offcanvas for mobile, use alias
      defaultOpen: defaultOpenProp, // Renamed to avoid conflict with DOM attribute
      className,
      style,
      children,
      ...restDivProps // Collect remaining props intended for the div
    },
    ref
  ) => {
    const isMobile = useIsMobile();

    // Determine effective collapsible mode based on screen size
    const effectiveCollapsible = isMobile ? collapsibleProp : "none"; // Force 'none' on desktop

    // --- Mobile State ---
    const [openMobile, _setOpenMobile] = React.useState(
      defaultOpenProp ?? false
    ); // Mobile state respects defaultOpenProp
    const setOpenMobile = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        const newState =
          typeof value === "function" ? value(openMobile) : value;
        if (setOpenProp) {
          setOpenProp(newState);
        } else {
          _setOpenMobile(newState);
        }
      },
      [setOpenProp, openMobile]
    );

    // --- Desktop State ---
    // For desktop (collapsible='none'), open is always true.
    const [_openDesktop, _setOpenDesktop] = React.useState(true); // Desktop always conceptually open
    const openDesktop = openProp ?? _openDesktop;
    const setOpenDesktop = React.useCallback(
      (value: boolean | ((value: boolean) => boolean)) => {
        // This might be used for external control, but doesn't change layout if collapsible='none'
        const newState =
          typeof value === "function" ? value(openDesktop) : value;
        _setOpenDesktop(newState);
      },
      [openDesktop]
    );

    // Helper to toggle the sidebar. Only toggles mobile if collapsible='offcanvas'.
    const toggleSidebar = React.useCallback(() => {
      if (effectiveCollapsible === "offcanvas") {
        setOpenMobile((prev) => !prev);
      }
      // No action needed for desktop (collapsible='none')
    }, [effectiveCollapsible, setOpenMobile]);

    // Adds keyboard shortcut (still useful for mobile)
    React.useEffect(() => {
      const handleKeyDown = (event: KeyboardEvent) => {
        if (event.key === "b" && (event.metaKey || event.ctrlKey)) {
          event.preventDefault();
          toggleSidebar(); // Will only trigger mobile toggle
        }
      };
      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    }, [toggleSidebar]);

    const contextValue = React.useMemo<SidebarContext>(
      () => ({
        open: openDesktop, // Represents desktop state (always true if 'none')
        setOpen: setOpenDesktop,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
        collapsible: effectiveCollapsible, // Use the effective mode
      }),
      [
        openDesktop,
        setOpenDesktop,
        isMobile,
        openMobile,
        setOpenMobile,
        toggleSidebar,
        effectiveCollapsible,
      ]
    );

    return (
      <SidebarContext.Provider value={contextValue}>
        <TooltipProvider delayDuration={0}>
          <div
            style={
              {
                // Use CSS variables directly from globals.css
                ...style,
              } as React.CSSProperties
            }
            className={cn(
              "group/sidebar-wrapper flex min-h-svh w-full",
              className
            )}
            ref={ref}
            {...restDivProps} // Spread only the remaining props intended for the div
          >
            {children}
          </div>
        </TooltipProvider>
      </SidebarContext.Provider>
    );
  }
);
SidebarProvider.displayName = "SidebarProvider";

// --- Sidebar Component ---
const Sidebar = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & {
    side?: "left" | "right";
    variant?: "sidebar"; // Only 'sidebar' variant needed now
  }
>(
  (
    { side = "left", variant = "sidebar", className, children, ...props },
    ref
  ) => {
    const { isMobile, openMobile, setOpenMobile, collapsible } = useSidebar();

    if (isMobile && collapsible === "offcanvas") {
      // --- Mobile: Use Sheet for offcanvas ---
      return (
        <Sheet open={openMobile} onOpenChange={setOpenMobile}>
          <SheetContent
            data-sidebar="sidebar"
            data-mobile="true"
            className="w-[var(--sidebar-width-mobile)] bg-sidebar p-0 text-sidebar-foreground [&>button]:hidden flex flex-col" // Use CSS var, ensure flex-col
            side={side}
          >
            {/* Accessible title for screen readers */}
            <SheetHeader className="sr-only">
              <SheetTitle>Main Navigation</SheetTitle>
            </SheetHeader>
            {children}
          </SheetContent>
        </Sheet>
      );
    }

    if (!isMobile) {
      // --- Desktop: Always visible ---
      return (
        <aside // Use aside semantic element
          ref={ref}
          data-sidebar="sidebar"
          data-collapsible="none" // Indicate it's not collapsible visually
          data-variant={variant}
          data-side={side}
          className={cn(
            "group hidden md:flex h-screen fixed top-0 w-[var(--sidebar-width)] flex-col text-sidebar-foreground bg-sidebar border-sidebar-border", // Use CSS var, full height, fixed position
            side === "left" ? "left-0 border-r" : "right-0 border-l", // Position based on side
            className
          )}
          {...props}
        >
          {children}
        </aside>
      );
    }

    // If mobile but collapsible is 'none', render nothing (or handle differently if needed)
    return null;
  }
);
Sidebar.displayName = "Sidebar";

const SidebarTrigger = React.forwardRef<
  React.ElementRef<typeof Button>,
  React.ComponentProps<typeof Button>
>(({ className, onClick, ...props }, ref) => {
  const { toggleSidebar, isMobile, collapsible } = useSidebar();

  // Only render the trigger if it's mobile and collapsible is 'offcanvas'
  if (!isMobile || collapsible !== "offcanvas") {
    return null;
  }

  return (
    <Button
      ref={ref}
      data-sidebar="trigger"
      variant="ghost"
      size="icon"
      className={cn("h-8 w-8", className)} // Adjusted size
      onClick={(event) => {
        onClick?.(event);
        toggleSidebar();
      }}
      {...props}
    >
      <PanelLeft />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
});
SidebarTrigger.displayName = "SidebarTrigger";

// --- SidebarInset ---
// Adjust margin based on sidebar visibility (desktop only)
const SidebarInset = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement> // Changed from React.ComponentProps<"main">
>(({ className, ...props }, ref) => {
  const { isMobile } = useSidebar();
  return (
    <main // Keep as main or change to div if preferred
      ref={ref}
      className={cn(
        "flex-1 flex flex-col bg-background min-h-svh", // Ensure it takes remaining space and allows scrolling
        !isMobile && "ml-[var(--sidebar-width)]", // Add margin only on desktop
        className
      )}
      {...props}
    />
  );
});
SidebarInset.displayName = "SidebarInset";

const SidebarInput = React.forwardRef<
  React.ElementRef<typeof Input>,
  React.ComponentProps<typeof Input>
>(({ className, ...props }, ref) => {
  return (
    <Input
      ref={ref}
      data-sidebar="input"
      className={cn(
        "h-8 w-full bg-background shadow-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        className
      )}
      {...props}
    />
  );
});
SidebarInput.displayName = "SidebarInput";

const SidebarHeader = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="header"
      className={cn("flex flex-col gap-2 p-2", className)} // Keep padding consistent
      {...props}
    />
  );
});
SidebarHeader.displayName = "SidebarHeader";

const SidebarSeparator = React.forwardRef<
  React.ElementRef<typeof Separator>,
  React.ComponentProps<typeof Separator>
>(({ className, ...props }, ref) => {
  return (
    <Separator
      ref={ref}
      data-sidebar="separator"
      className={cn("mx-2 w-auto bg-sidebar-border", className)}
      {...props}
    />
  );
});
SidebarSeparator.displayName = "SidebarSeparator";

const SidebarContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="content"
      className={cn(
        "flex-1 overflow-y-auto overflow-x-hidden", // Allow vertical scroll, hide horizontal
        className
      )}
      {...props}
    />
  );
});
SidebarContent.displayName = "SidebarContent";

const SidebarGroup = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      data-sidebar="group"
      className={cn("relative flex w-full min-w-0 flex-col p-2", className)}
      {...props}
    />
  );
});
SidebarGroup.displayName = "SidebarGroup";

const SidebarGroupLabel = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "div";
  return (
    <Comp
      ref={ref}
      data-sidebar="group-label"
      className={cn(
        "flex h-8 shrink-0 items-center rounded-md px-2 text-xs font-medium text-sidebar-foreground/70 outline-none ring-sidebar-ring focus-visible:ring-2",
        className
      )}
      {...props}
    />
  );
});
SidebarGroupLabel.displayName = "SidebarGroupLabel";

const SidebarGroupAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & { asChild?: boolean }
>(({ className, asChild = false, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      data-sidebar="group-action"
      className={cn(
        "absolute right-3 top-3.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-transform hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden", // Mobile hit area
        className
      )}
      {...props}
    />
  );
});
SidebarGroupAction.displayName = "SidebarGroupAction";

const SidebarGroupContent = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="group-content"
    className={cn("w-full text-sm", className)}
    {...props}
  />
));
SidebarGroupContent.displayName = "SidebarGroupContent";

const SidebarMenu = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu"
    className={cn("flex w-full min-w-0 flex-col gap-1", className)} // Remove p-2, rely on parent padding
    {...props}
  />
));
SidebarMenu.displayName = "SidebarMenu";

const SidebarMenuItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ className, ...props }, ref) => (
  <li
    ref={ref}
    data-sidebar="menu-item"
    className={cn("group/menu-item relative", className)}
    {...props}
  />
));
SidebarMenuItem.displayName = "SidebarMenuItem";

// Adjusted variants - remove icon-specific sizing logic
const sidebarMenuButtonVariants = cva(
  "peer/menu-button flex w-full items-center gap-2 overflow-hidden rounded-md p-2 text-left text-sm outline-none ring-sidebar-ring transition-[width,height,padding] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 group-has-[[data-sidebar=menu-action]]/menu-item:pr-8 aria-disabled:pointer-events-none aria-disabled:opacity-50 data-[active=true]:bg-sidebar-accent data-[active=true]:font-medium data-[active=true]:text-sidebar-accent-foreground data-[state=open]:hover:bg-sidebar-accent data-[state=open]:hover:text-sidebar-accent-foreground [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
        outline:
          "bg-background shadow-[0_0_0_1px_hsl(var(--sidebar-border))] hover:bg-sidebar-accent hover:text-sidebar-accent-foreground hover:shadow-[0_0_0_1px_hsl(var(--sidebar-accent))]",
      },
      size: {
        // Simplified sizes if needed
        default: "h-8 text-sm",
        sm: "h-7 text-xs",
        lg: "h-12 text-sm", // Keep lg if used
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

const SidebarMenuButton = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    isActive?: boolean;
    tooltip?: string | React.ComponentProps<typeof TooltipContent>;
  } & VariantProps<typeof sidebarMenuButtonVariants>
>(
  (
    {
      asChild = false,
      isActive = false,
      variant = "default",
      size = "default",
      tooltip,
      className,
      ...props
    },
    ref
  ) => {
    const Comp = asChild ? Slot : "button";
    const { isMobile } = useSidebar();

    const button = (
      <Comp
        ref={ref}
        data-sidebar="menu-button"
        data-size={size}
        data-active={isActive}
        className={cn(sidebarMenuButtonVariants({ variant, size }), className)}
        {...props}
      />
    );

    // Show tooltip only on mobile when sidebar is offcanvas and tooltip is provided
    if (!tooltip || !isMobile) {
      return button;
    }

    if (typeof tooltip === "string") {
      tooltip = { children: tooltip };
    }
    return (
      <Tooltip>
        <TooltipTrigger asChild>{button}</TooltipTrigger>
        <TooltipContent side="right" align="center" {...tooltip} />
      </Tooltip>
    );
  }
);
SidebarMenuButton.displayName = "SidebarMenuButton";

const SidebarMenuAction = React.forwardRef<
  HTMLButtonElement,
  React.ComponentProps<"button"> & {
    asChild?: boolean;
    showOnHover?: boolean; // Keep showOnHover logic if desired
  }
>(({ className, asChild = false, showOnHover = true, ...props }, ref) => {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-action"
      className={cn(
        "absolute right-1 top-1.5 flex aspect-square w-5 items-center justify-center rounded-md p-0 text-sidebar-foreground outline-none ring-sidebar-ring transition-opacity hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 peer-hover/menu-button:text-sidebar-accent-foreground [&>svg]:size-4 [&>svg]:shrink-0",
        "after:absolute after:-inset-2 after:md:hidden", // Mobile hit area
        "peer-data-[size=sm]/menu-button:top-1",
        "peer-data-[size=default]/menu-button:top-1.5",
        "peer-data-[size=lg]/menu-button:top-2.5",
        showOnHover &&
          "opacity-0 group-focus-within/menu-item:opacity-100 group-hover/menu-item:opacity-100 data-[state=open]:opacity-100 peer-data-[active=true]/menu-button:text-sidebar-accent-foreground md:opacity-100", // Adjusted hover/focus visibility
        className
      )}
      {...props}
    />
  );
});
SidebarMenuAction.displayName = "SidebarMenuAction";

const SidebarMenuBadge = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div">
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    data-sidebar="menu-badge"
    className={cn(
      "ml-auto h-5 min-w-5 flex items-center justify-center rounded-md px-1.5 text-xs font-medium tabular-nums text-sidebar-foreground bg-sidebar-accent/30", // Ensure flex centering
      className
    )}
    {...props}
  />
));
SidebarMenuBadge.displayName = "SidebarMenuBadge";

const SidebarMenuSkeleton = React.forwardRef<
  HTMLDivElement,
  React.ComponentProps<"div"> & { showIcon?: boolean }
>(({ className, showIcon = true, ...props }, ref) => {
  const width = React.useMemo(
    () => `${Math.floor(Math.random() * 40) + 50}%`,
    []
  );
  return (
    <div
      ref={ref}
      data-sidebar="menu-skeleton"
      className={cn("rounded-md h-8 flex gap-2 px-2 items-center", className)}
      {...props}
    >
      {showIcon && <Skeleton className="size-4 rounded-md" />}
      <Skeleton
        className="h-4 flex-1 max-w-[--skeleton-width]"
        style={{ "--skeleton-width": width } as React.CSSProperties}
      />
    </div>
  );
});
SidebarMenuSkeleton.displayName = "SidebarMenuSkeleton";

const SidebarMenuSub = React.forwardRef<
  HTMLUListElement,
  React.ComponentProps<"ul">
>(({ className, ...props }, ref) => (
  <ul
    ref={ref}
    data-sidebar="menu-sub"
    className={cn(
      "mx-3.5 flex min-w-0 translate-x-px flex-col gap-1 border-l border-sidebar-border px-2.5 py-0.5",
      className
    )}
    {...props}
  />
));
SidebarMenuSub.displayName = "SidebarMenuSub";

const SidebarMenuSubItem = React.forwardRef<
  HTMLLIElement,
  React.ComponentProps<"li">
>(({ ...props }, ref) => <li ref={ref} {...props} />);
SidebarMenuSubItem.displayName = "SidebarMenuSubItem";

const SidebarMenuSubButton = React.forwardRef<
  HTMLAnchorElement,
  React.ComponentProps<"a"> & {
    asChild?: boolean;
    size?: "sm" | "md";
    isActive?: boolean;
  }
>(({ asChild = false, size = "md", isActive, className, ...props }, ref) => {
  const Comp = asChild ? Slot : "a";
  return (
    <Comp
      ref={ref}
      data-sidebar="menu-sub-button"
      data-size={size}
      data-active={isActive}
      className={cn(
        "flex h-7 min-w-0 -translate-x-px items-center gap-2 overflow-hidden rounded-md px-2 text-sidebar-foreground outline-none ring-sidebar-ring hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:ring-2 active:bg-sidebar-accent active:text-sidebar-accent-foreground disabled:pointer-events-none disabled:opacity-50 aria-disabled:pointer-events-none aria-disabled:opacity-50 [&>span:last-child]:truncate [&>svg]:size-4 [&>svg]:shrink-0 [&>svg]:text-sidebar-accent-foreground",
        "data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-accent-foreground",
        size === "sm" && "text-xs",
        size === "md" && "text-sm",
        className
      )}
      {...props}
    />
  );
});
SidebarMenuSubButton.displayName = "SidebarMenuSubButton";

export {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupAction,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarInput,
  SidebarInset,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuBadge,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSkeleton,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarProvider,
  SidebarSeparator,
  SidebarTrigger,
  useSidebar,
};
