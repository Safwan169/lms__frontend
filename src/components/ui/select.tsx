import * as React from "react"

import { cn } from "@/lib/utils"

type SelectProps = Omit<React.ComponentProps<"select">, "onChange"> & {
  onValueChange?: (value: string) => void
}

function Select({ className, children, onValueChange, ...props }: SelectProps) {
  return (
    <select
      data-slot="select"
      className={cn(
        "h-9 w-full rounded-lg border border-input bg-background px-3 py-2 text-sm outline-none transition-colors focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      onChange={(event) => onValueChange?.(event.target.value)}
      {...props}
    >
      {children}
    </select>
  )
}

export { Select }
