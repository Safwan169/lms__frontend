import * as React from "react"

import { cn } from "@/lib/utils"

type RadioGroupContextValue = {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
}

const RadioGroupContext = React.createContext<RadioGroupContextValue>({})

function RadioGroup({
  className,
  value,
  onValueChange,
  name,
  disabled,
  children,
}: React.ComponentProps<"div"> & {
  value?: string
  onValueChange?: (value: string) => void
  name?: string
  disabled?: boolean
}) {
  return (
    <RadioGroupContext.Provider value={{ value, onValueChange, name, disabled }}>
      <div role="radiogroup" data-slot="radio-group" className={cn("flex flex-wrap gap-3", className)}>
        {children}
      </div>
    </RadioGroupContext.Provider>
  )
}

function RadioGroupItem({
  className,
  value,
  id,
  children,
  ...props
}: React.ComponentProps<"input"> & {
  value: string
  id: string
  children?: React.ReactNode
}) {
  const context = React.useContext(RadioGroupContext)
  const checked = context.value === value

  return (
    <label
      htmlFor={id}
      className={cn(
        "inline-flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
        checked ? "border-primary bg-primary/5 text-primary" : "border-input text-foreground",
        context.disabled && "cursor-not-allowed opacity-50",
        className
      )}
    >
      <input
        id={id}
        type="radio"
        name={context.name}
        checked={checked}
        disabled={context.disabled}
        onChange={() => context.onValueChange?.(value)}
        className="size-4 accent-primary"
        value={value}
        {...props}
      />
      <span>{children ?? value}</span>
    </label>
  )
}

export { RadioGroup, RadioGroupItem }
