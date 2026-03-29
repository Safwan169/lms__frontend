import * as React from "react"

import { cn } from "@/lib/utils"

type BadgeVariant = "default" | "secondary" | "destructive" | "outline" | "warning" | "info" | "muted"

function badgeVariantClasses(variant: BadgeVariant = "default") {
  switch (variant) {
    case "secondary":
      return "border-transparent bg-secondary text-secondary-foreground"
    case "destructive":
      return "border-transparent bg-destructive text-destructive-foreground"
    case "outline":
      return "border-border text-foreground"
    case "warning":
      return "border-transparent bg-amber-100 text-amber-800"
    case "info":
      return "border-transparent bg-blue-100 text-blue-800"
    case "muted":
      return "border-transparent bg-slate-100 text-slate-700"
    default:
      return "border-transparent bg-primary text-primary-foreground"
  }
}

function Badge({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"span"> & { variant?: BadgeVariant }) {
  return (
    <span
      data-slot="badge"
      className={cn(
        "inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium",
        badgeVariantClasses(variant),
        className
      )}
      {...props}
    />
  )
}

export { Badge }
