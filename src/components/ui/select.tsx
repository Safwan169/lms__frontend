import * as React from "react"

import { cn } from "@/lib/utils"

type SelectProps = Omit<React.ComponentProps<"select">, "onChange"> & {
  onValueChange?: (value: string) => void
  emptyMessage?: string
}

function hasSelectableOption(children: React.ReactNode): boolean {
  return React.Children.toArray(children).some((child) => {
    if (!React.isValidElement(child)) return false
    if (child.type !== "option") return false

    const optionChild = child as React.ReactElement<
      React.OptionHTMLAttributes<HTMLOptionElement>
    >

    const optionValue = optionChild.props.value
    const normalizedValue =
      typeof optionValue === "string" || typeof optionValue === "number"
        ? String(optionValue).trim()
        : ""

    return !optionChild.props.disabled && normalizedValue.length > 0
  })
}

function Select({
  className,
  children,
  onValueChange,
  emptyMessage = "No options available yet. Add data first.",
  ...props
}: SelectProps) {
  const hasOptions = hasSelectableOption(children)

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
      {!hasOptions ? (
        <option value="" disabled>
          {emptyMessage}
        </option>
      ) : null}
      {children}
    </select>
  )
}

export { Select }
