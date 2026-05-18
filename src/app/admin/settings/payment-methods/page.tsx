"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"

const paymentMethodsSchema = z
  .object({
    cash_enabled: z.boolean().default(true),
    cash_instructions: z.string().optional(),

    mfs_enabled: z.boolean().default(true),
    mfs_number: z.string().optional(),

    pos_enabled: z.boolean().default(false),
    pos_terminal_info: z.string().optional(),

    online_payment_enabled: z.boolean().default(false),
    gateway_provider: z.enum(["SSLCommerz", "ShurjoPay", "AamarPay", "Stripe"]).optional(),
    store_id: z.string().optional(),
    store_password: z.string().optional(),
    sandbox_mode: z.boolean().default(true),
    webhook_url: z.string().optional(),

    payment_instructions: z.string().trim().max(1000, "Keep instructions under 1000 characters").optional(),
  })
  .superRefine((values, ctx) => {
    if (values.mfs_enabled && !values.mfs_number?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["mfs_number"],
        message: "MFS Number is required when MFS is enabled",
      })
    }

    if (values.pos_enabled && !values.pos_terminal_info?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["pos_terminal_info"],
        message: "POS Terminal Info is required when POS is enabled",
      })
    }

    if (values.online_payment_enabled) {
      if (!values.gateway_provider) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["gateway_provider"],
          message: "Gateway provider is required",
        })
      }

      if (!values.store_id?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["store_id"],
          message: "Store ID is required",
        })
      }

      if (!values.store_password?.trim()) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["store_password"],
          message: "Store password is required",
        })
      }
    }
  })

type PaymentMethodsFormValues = z.input<typeof paymentMethodsSchema>
type PaymentMethodsSubmitValues = z.output<typeof paymentMethodsSchema>

type PaymentMethodsResponse = PaymentMethodsSubmitValues

const DUMMY_PAYMENT_METHODS: PaymentMethodsResponse = {
  cash_enabled: true,
  cash_instructions: "Pay at school accounts desk between 10 AM - 2 PM.",
  mfs_enabled: true,
  mfs_number: "01700112233",
  pos_enabled: true,
  pos_terminal_info: "Counter POS Terminal #2",
  online_payment_enabled: true,
  gateway_provider: "SSLCommerz",
  store_id: "demo_store_001",
  store_password: "demo_password_001",
  sandbox_mode: true,
  webhook_url: "https://school.example.com/api/payments/webhook",
  payment_instructions: "Complete payment within 48 hours after registration to secure your seat.",
}

export default function PaymentMethodsSettingsPage() {
  const { user } = useAuth()

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showStoreId, setShowStoreId] = useState(false)
  const [showStorePassword, setShowStorePassword] = useState(false)

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const tenantDomain =
    (user as any)?.tenant_domain ??
    (user as any)?.tenant?.domain ??
    (tenantId ? `${tenantId}.school.local` : "school.local")

  const webhookUrl = useMemo(() => {
    return `https://${tenantDomain}/api/payments/webhook`
  }, [tenantDomain])

  const form = useForm<PaymentMethodsFormValues, any, PaymentMethodsSubmitValues>({
    resolver: zodResolver(paymentMethodsSchema),
    defaultValues: {
      cash_enabled: true,
      cash_instructions: "",
      mfs_enabled: false,
      mfs_number: "",
      pos_enabled: false,
      pos_terminal_info: "",
      online_payment_enabled: false,
      gateway_provider: undefined,
      store_id: "",
      store_password: "",
      sandbox_mode: true,
      webhook_url: webhookUrl,
      payment_instructions: "",
    },
  })

  const cashEnabled = form.watch("cash_enabled")
  const mfsEnabled = form.watch("mfs_enabled")
  const posEnabled = form.watch("pos_enabled")
  const onlineEnabled = form.watch("online_payment_enabled")
  const sandboxMode = form.watch("sandbox_mode")

  useEffect(() => {
    form.setValue("webhook_url", webhookUrl)
  }, [form, webhookUrl])

  useEffect(() => {
    let mounted = true

    const loadSettings = async () => {
      if (!tenantId) {
        setIsInitialLoading(false)
        return
      }

      setIsInitialLoading(true)

      try {
        // API implementation intentionally commented for frontend-only flow.
        // const response = await fetch("/admin/settings/payment-methods", {
        //   method: "GET",
        //   headers: {
        //     "Content-Type": "application/json",
        //     "x-tenant-id": String(tenantId),
        //   },
        //   cache: "no-store",
        // })
        // if (!response.ok) throw new Error("Failed to load payment methods")
        // const data = await response.json()

        await new Promise((resolve) => setTimeout(resolve, 300))
        const data = DUMMY_PAYMENT_METHODS

        if (!mounted) return

        form.reset({
          cash_enabled: data.cash_enabled,
          cash_instructions: data.cash_instructions ?? "",
          mfs_enabled: data.mfs_enabled,
          mfs_number: data.mfs_number ?? "",
          pos_enabled: data.pos_enabled,
          pos_terminal_info: data.pos_terminal_info ?? "",
          online_payment_enabled: data.online_payment_enabled,
          gateway_provider: data.gateway_provider,
          store_id: data.store_id ?? "",
          store_password: data.store_password ?? "",
          sandbox_mode: data.sandbox_mode,
          webhook_url: data.webhook_url || webhookUrl,
          payment_instructions: data.payment_instructions ?? "",
        })
      } catch {
        if (!mounted) return
        toast.error("Failed to load payment methods")
      } finally {
        if (mounted) setIsInitialLoading(false)
      }
    }

    loadSettings()

    return () => {
      mounted = false
    }
  }, [form, tenantId, webhookUrl])

  const onSubmit = async (values: PaymentMethodsSubmitValues) => {
    if (!tenantId) {
      toast.error("Tenant information missing in session")
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        tenant_id: tenantId,
        ...values,
        webhook_url: webhookUrl,
      }

      // API implementation intentionally commented for frontend-only flow.
      // const response = await fetch("/admin/settings/payment-methods", {
      //   method: "PUT",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "x-tenant-id": String(tenantId),
      //   },
      //   body: JSON.stringify(payload),
      // })
      //
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => null)
      //   throw new Error(errorData?.message || "Failed to save payment methods")
      // }

      await new Promise((resolve) => setTimeout(resolve, 450))
      toast.success("Settings saved successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to save payment methods")
    } finally {
      setIsSaving(false)
    }
  }

  if (isInitialLoading) {
    return (
      <div className="space-y-5 pb-24">
        <div>
          <h1 className="text-2xl font-semibold">Payment Methods</h1>
          <p className="text-sm text-muted-foreground">Configure accepted payment methods for admission fees</p>
        </div>

        {Array.from({ length: 3 }).map((_, index) => (
          <Card key={`pm-skeleton-${index}`}>
            <CardHeader>
              <Skeleton className="h-5 w-56" />
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
              <Skeleton className="h-9 w-full" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-semibold">Payment Methods</h1>
        <p className="text-sm text-muted-foreground">Configure accepted payment methods for admission fees</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Manual Payment Methods</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="cash_enabled"
                render={({ field }) => (
                  <FormItem className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="mb-0">Cash</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {cashEnabled ? (
                <FormField
                  control={form.control}
                  name="cash_instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Instructions for cash payment</FormLabel>
                      <FormControl>
                        <Input placeholder="Pay at school cash counter" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={form.control}
                name="mfs_enabled"
                render={({ field }) => (
                  <FormItem className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="mb-0">MFS</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {mfsEnabled ? (
                <FormField
                  control={form.control}
                  name="mfs_number"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>MFS Number</FormLabel>
                      <FormControl>
                        <Input placeholder="bKash / Nagad number" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}

              <FormField
                control={form.control}
                name="pos_enabled"
                render={({ field }) => (
                  <FormItem className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="mb-0">POS</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {posEnabled ? (
                <FormField
                  control={form.control}
                  name="pos_terminal_info"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>POS Terminal Info</FormLabel>
                      <FormControl>
                        <Input placeholder="Terminal ID / branch info" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span>Online Payment Gateway</span>
                {sandboxMode ? <Badge variant="warning">TEST MODE</Badge> : null}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="online_payment_enabled"
                render={({ field }) => (
                  <FormItem className="rounded-md border p-3">
                    <div className="flex items-center justify-between">
                      <FormLabel className="mb-0">Enable online payment</FormLabel>
                      <FormControl>
                        <Switch checked={field.value} onCheckedChange={field.onChange} />
                      </FormControl>
                    </div>
                  </FormItem>
                )}
              />

              {onlineEnabled ? (
                <div className="space-y-4">
                  <FormField
                    control={form.control}
                    name="gateway_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Gateway Provider</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <option value="">Select provider</option>
                            <option value="SSLCommerz">SSLCommerz</option>
                            <option value="ShurjoPay">ShurjoPay</option>
                            <option value="AamarPay">AamarPay</option>
                            <option value="Stripe">Stripe</option>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="store_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store ID</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showStoreId ? "text" : "password"}
                              {...field}
                              value={field.value ?? ""}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                              onClick={() => setShowStoreId((prev) => !prev)}
                              aria-label="Toggle store id visibility"
                            >
                              {showStoreId ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="store_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Store Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showStorePassword ? "text" : "password"}
                              {...field}
                              value={field.value ?? ""}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                              onClick={() => setShowStorePassword((prev) => !prev)}
                              aria-label="Toggle store password visibility"
                            >
                              {showStorePassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sandbox_mode"
                    render={({ field }) => (
                      <FormItem className="rounded-md border p-3">
                        <div className="flex items-center justify-between">
                          <FormLabel className="mb-0">Use sandbox / test mode</FormLabel>
                          <FormControl>
                            <Switch checked={field.value} onCheckedChange={field.onChange} />
                          </FormControl>
                        </div>
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="webhook_url"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Webhook URL</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? webhookUrl} readOnly />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment Instructions</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="payment_instructions"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        rows={3}
                        placeholder="Instruction shown on student payment page"
                        {...field}
                        value={field.value ?? ""}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      This message is shown to students on the payment page
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white">
            <div className="mx-auto flex max-w-[1200px] justify-end gap-3 px-4 py-3 md:px-8">
              <Button type="submit" disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  "Save Changes"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
