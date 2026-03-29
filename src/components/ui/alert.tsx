import * as React from "react"

import { cn } from "@/lib/utils"

type AlertVariant = "default" | "destructive" | "success"

function alertVariantClasses(variant: AlertVariant = "default") {
  switch (variant) {
    case "destructive":
      return "border-red-200 bg-red-50 text-red-900"
    case "success":
      return "border-emerald-200 bg-emerald-50 text-emerald-900"
    default:
      return "border-border bg-background text-foreground"
  }
}

function Alert({
  className,
  variant = "default",
  ...props
}: React.ComponentProps<"div"> & { variant?: AlertVariant }) {
  return (
    <div
      role="alert"
      data-slot="alert"
      className={cn(
        "relative w-full rounded-lg border px-4 py-3 text-sm",
        alertVariantClasses(variant),
        className
      )}
      {...props}
    />
  )
}

function AlertTitle({ className, ...props }: React.ComponentProps<"h5">) {
  return <h5 className={cn("mb-1 font-medium leading-none tracking-tight", className)} {...props} />
}

function AlertDescription({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("text-sm", className)} {...props} />
}

export { Alert, AlertTitle, AlertDescription }
