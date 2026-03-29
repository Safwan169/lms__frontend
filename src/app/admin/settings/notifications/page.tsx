"use client"

import { useEffect, useState } from "react"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table-primitive"

const triggerSchema = z.object({
  sms: z.boolean().default(false),
  email: z.boolean().default(false),
})

const notificationsSchema = z.object({
  sms_enabled: z.boolean().default(false),
  sms_provider: z.enum(["Twilio", "SSL Wireless", "Infobip"]).optional(),
  sms_sender_id: z.string().optional(),
  sms_api_key: z.string().optional(),

  email_enabled: z.boolean().default(false),
  smtp_host: z.string().optional(),
  smtp_port: z.coerce.number().optional(),
  smtp_user: z.string().optional(),
  smtp_password: z.string().optional(),
  from_name: z.string().optional(),
  from_email: z.string().optional(),

  triggers: z.object({
    application_received: triggerSchema,
    application_approved: triggerSchema,
    application_rejected: triggerSchema,
    registration_link_sent: triggerSchema,
    registration_link_resent: triggerSchema,
    payment_received: triggerSchema,
    enrollment_confirmed: triggerSchema,
  }),

  test_phone: z.string().optional(),
  test_email: z.string().optional(),
}).superRefine((values, ctx) => {
  if (values.sms_enabled) {
    if (!values.sms_provider) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sms_provider"],
        message: "SMS provider is required",
      })
    }
    if (!values.sms_sender_id?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sms_sender_id"],
        message: "Sender ID is required",
      })
    }
    if (!values.sms_api_key?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["sms_api_key"],
        message: "SMS API key is required",
      })
    }
  }

  if (values.email_enabled) {
    if (!values.smtp_host?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["smtp_host"],
        message: "SMTP host is required",
      })
    }
    if (!values.smtp_port || values.smtp_port <= 0) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["smtp_port"],
        message: "SMTP port is required",
      })
    }
    if (!values.smtp_user?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["smtp_user"],
        message: "SMTP user is required",
      })
    }
    if (!values.smtp_password?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["smtp_password"],
        message: "SMTP password is required",
      })
    }
    if (!values.from_name?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from_name"],
        message: "From name is required",
      })
    }
    if (!values.from_email?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from_email"],
        message: "From email is required",
      })
    } else if (!z.string().email().safeParse(values.from_email).success) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["from_email"],
        message: "Enter a valid from email",
      })
    }
  }
})

type NotificationsFormValues = z.input<typeof notificationsSchema>
type NotificationsSubmitValues = z.output<typeof notificationsSchema>

type TestStatus = {
  state: "idle" | "pending" | "success" | "error"
  message?: string
}

const TRIGGER_ROWS = [
  { key: "application_received", label: "Application received" },
  { key: "application_approved", label: "Application approved" },
  { key: "application_rejected", label: "Application rejected" },
  { key: "registration_link_sent", label: "Registration link sent" },
  { key: "registration_link_resent", label: "Registration link resent" },
  { key: "payment_received", label: "Payment received" },
  { key: "enrollment_confirmed", label: "Enrollment confirmed" },
] as const

const DUMMY_SETTINGS: NotificationsSubmitValues = {
  sms_enabled: true,
  sms_provider: "SSL Wireless",
  sms_sender_id: "GREENFIELD",
  sms_api_key: "demo_sms_api_key",
  email_enabled: true,
  smtp_host: "smtp.mailtrap.io",
  smtp_port: 2525,
  smtp_user: "smtp_user_demo",
  smtp_password: "smtp_password_demo",
  from_name: "Greenfield School Admissions",
  from_email: "admissions@greenfield.edu",
  triggers: {
    application_received: { sms: true, email: true },
    application_approved: { sms: true, email: true },
    application_rejected: { sms: true, email: true },
    registration_link_sent: { sms: true, email: true },
    registration_link_resent: { sms: true, email: true },
    payment_received: { sms: true, email: true },
    enrollment_confirmed: { sms: true, email: true },
  },
  test_phone: "",
  test_email: "",
}

export default function NotificationSettingsPage() {
  const { user } = useAuth()

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [showSmsApiKey, setShowSmsApiKey] = useState(false)
  const [showSmtpPassword, setShowSmtpPassword] = useState(false)
  const [smsTestStatus, setSmsTestStatus] = useState<TestStatus>({ state: "idle" })
  const [emailTestStatus, setEmailTestStatus] = useState<TestStatus>({ state: "idle" })

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const form = useForm<NotificationsFormValues, any, NotificationsSubmitValues>({
    resolver: zodResolver(notificationsSchema),
    defaultValues: DUMMY_SETTINGS,
  })

  const smsEnabled = form.watch("sms_enabled")
  const emailEnabled = form.watch("email_enabled")

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
        // const response = await fetch("/admin/settings/notifications", {
        //   method: "GET",
        //   headers: {
        //     "Content-Type": "application/json",
        //     "x-tenant-id": String(tenantId),
        //   },
        //   cache: "no-store",
        // })
        // if (!response.ok) throw new Error("Failed to load notification settings")
        // const data = await response.json()

        await new Promise((resolve) => setTimeout(resolve, 300))
        const data = DUMMY_SETTINGS

        if (!mounted) return

        form.reset(data)
      } catch {
        if (!mounted) return
        toast.error("Failed to load notification settings")
      } finally {
        if (mounted) setIsInitialLoading(false)
      }
    }

    loadSettings()

    return () => {
      mounted = false
    }
  }, [form, tenantId])

  const onSubmit = async (values: NotificationsSubmitValues) => {
    if (!tenantId) {
      toast.error("Tenant information missing in session")
      return
    }

    setIsSaving(true)

    try {
      const payload = {
        tenant_id: tenantId,
        ...values,
      }

      // API implementation intentionally commented for frontend-only flow.
      // const response = await fetch("/admin/settings/notifications", {
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
      //   throw new Error(errorData?.message || "Failed to save notification settings")
      // }

      await new Promise((resolve) => setTimeout(resolve, 400))
      toast.success("Settings saved successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to save notification settings")
    } finally {
      setIsSaving(false)
    }
  }

  const handleSendTest = async (type: "sms" | "email") => {
    if (!tenantId) {
      toast.error("Tenant information missing in session")
      return
    }

    const recipient = type === "sms" ? form.getValues("test_phone") : form.getValues("test_email")

    if (!recipient?.trim()) {
      if (type === "sms") {
        setSmsTestStatus({ state: "error", message: "Provide a phone number first" })
      } else {
        setEmailTestStatus({ state: "error", message: "Provide an email first" })
      }
      return
    }

    if (type === "sms") setSmsTestStatus({ state: "pending" })
    if (type === "email") setEmailTestStatus({ state: "pending" })

    try {
      // API implementation intentionally commented for frontend-only flow.
      // const response = await fetch("/admin/settings/notifications/test", {
      //   method: "POST",
      //   headers: {
      //     "Content-Type": "application/json",
      //     "x-tenant-id": String(tenantId),
      //   },
      //   body: JSON.stringify({
      //     tenant_id: tenantId,
      //     type,
      //     recipient,
      //   }),
      // })
      //
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => null)
      //   throw new Error(errorData?.message || `Failed to send test ${type}`)
      // }

      await new Promise((resolve) => setTimeout(resolve, 450))
      if (type === "sms") setSmsTestStatus({ state: "success", message: "Test SMS sent" })
      if (type === "email") setEmailTestStatus({ state: "success", message: "Test email sent" })
    } catch (error: any) {
      if (type === "sms") setSmsTestStatus({ state: "error", message: error?.message || "SMS failed" })
      if (type === "email") setEmailTestStatus({ state: "error", message: error?.message || "Email failed" })
    }
  }

  if (isInitialLoading) {
    return (
      <div className="space-y-5 pb-24">
        <div>
          <h1 className="text-2xl font-semibold">Notifications</h1>
          <p className="text-sm text-muted-foreground">Control when and how students and parents are notified</p>
        </div>

        {Array.from({ length: 4 }).map((_, index) => (
          <Card key={`notification-skeleton-${index}`}>
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
        <h1 className="text-2xl font-semibold">Notifications</h1>
        <p className="text-sm text-muted-foreground">Control when and how students and parents are notified</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">SMS Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="sms_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Enable SMS notifications</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {smsEnabled ? (
                <>
                  <FormField
                    control={form.control}
                    name="sms_provider"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMS Provider</FormLabel>
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <option value="">Select provider</option>
                            <option value="Twilio">Twilio</option>
                            <option value="SSL Wireless">SSL Wireless</option>
                            <option value="Infobip">Infobip</option>
                          </Select>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sms_sender_id"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Sender ID / From name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="sms_api_key"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMS API Key</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showSmsApiKey ? "text" : "password"}
                              {...field}
                              value={field.value ?? ""}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                              onClick={() => setShowSmsApiKey((prev) => !prev)}
                              aria-label="Toggle SMS API key visibility"
                            >
                              {showSmsApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Email Notifications</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="email_enabled"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Enable email notifications</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {emailEnabled ? (
                <div className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="smtp_host"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Host</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtp_port"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Port</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            name={field.name}
                            ref={field.ref}
                            onBlur={field.onBlur}
                            value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                            onChange={(event) => field.onChange(event.target.value)}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtp_user"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP User</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="smtp_password"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>SMTP Password</FormLabel>
                        <FormControl>
                          <div className="relative">
                            <Input
                              type={showSmtpPassword ? "text" : "password"}
                              {...field}
                              value={field.value ?? ""}
                              className="pr-10"
                            />
                            <button
                              type="button"
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
                              onClick={() => setShowSmtpPassword((prev) => !prev)}
                              aria-label="Toggle SMTP password visibility"
                            >
                              {showSmtpPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="from_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Greenfield School Admissions" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="from_email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>From Email</FormLabel>
                        <FormControl>
                          <Input type="email" {...field} value={field.value ?? ""} />
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
              <CardTitle className="text-base">Notification Triggers</CardTitle>
              <CardDescription>
                Control which events send SMS or email notifications.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Event</TableHead>
                    <TableHead>Send SMS</TableHead>
                    <TableHead>Send Email</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {TRIGGER_ROWS.map((row) => (
                    <TableRow key={row.key}>
                      <TableCell className="font-medium">{row.label}</TableCell>
                      <TableCell>
                        <Switch
                          checked={!!form.watch(`triggers.${row.key}.sms`)}
                          onCheckedChange={(checked) => form.setValue(`triggers.${row.key}.sms`, checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <Switch
                          checked={!!form.watch(`triggers.${row.key}.email`)}
                          onCheckedChange={(checked) => form.setValue(`triggers.${row.key}.email`, checked)}
                        />
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Test Notification</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="test_phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Phone</FormLabel>
                      <FormControl>
                        <Input placeholder="+8801XXXXXXXXX" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="test_email"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Test Email</FormLabel>
                      <FormControl>
                        <Input type="email" {...field} value={field.value ?? ""} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex flex-wrap gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSendTest("sms")}
                  disabled={smsTestStatus.state === "pending"}
                >
                  {smsTestStatus.state === "pending" ? "Sending..." : "Send Test SMS"}
                </Button>
                {smsTestStatus.state !== "idle" ? (
                  <Badge variant={smsTestStatus.state === "success" ? "info" : "destructive"}>
                    {smsTestStatus.message || (smsTestStatus.state === "success" ? "Success" : "Failed")}
                  </Badge>
                ) : null}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleSendTest("email")}
                  disabled={emailTestStatus.state === "pending"}
                >
                  {emailTestStatus.state === "pending" ? "Sending..." : "Send Test Email"}
                </Button>
                {emailTestStatus.state !== "idle" ? (
                  <Badge variant={emailTestStatus.state === "success" ? "info" : "destructive"}>
                    {emailTestStatus.message || (emailTestStatus.state === "success" ? "Success" : "Failed")}
                  </Badge>
                ) : null}
              </div>
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
