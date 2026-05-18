"use client"

import { useEffect, useMemo, useState } from "react"
import { useFieldArray, useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2, Plus, Trash2 } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import { useAuth } from "@/context/AuthContext"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Skeleton } from "@/components/ui/skeleton"
import { Switch } from "@/components/ui/switch"

const admissionSettingsSchema = z.object({
  admission_open: z.boolean().default(true),
  academic_year: z.string().trim().min(1, "Academic year is required"),
  admission_fee: z.coerce.number().min(0, "Admission fee cannot be negative"),
  fee_waiver_allowed: z.boolean().default(false),
  link_expiry_days: z.coerce.number().int().min(1, "Minimum 1 day").max(30, "Maximum 30 days"),
  allow_regeneration: z.boolean().default(true),
  required_documents: z.array(
    z.object({
      name: z.string().trim().min(1, "Document name is required"),
      required: z.boolean().default(true),
    })
  ).min(1, "At least one required document must exist"),
  prevent_duplicate_phone: z.boolean().default(true),
})

type AdmissionSettingsFormValues = z.input<typeof admissionSettingsSchema>
type AdmissionSettingsSubmitValues = z.output<typeof admissionSettingsSchema>

type AdmissionSettingsResponse = AdmissionSettingsSubmitValues

const DEFAULT_DOCUMENTS = [
  { name: "Student Photo", required: true },
  { name: "Birth Certificate", required: true },
  { name: "Previous Academic Certificate", required: true },
]

const DUMMY_ADMISSION_SETTINGS: AdmissionSettingsResponse = {
  admission_open: true,
  academic_year: "2025-2026",
  admission_fee: 2500,
  fee_waiver_allowed: true,
  link_expiry_days: 7,
  allow_regeneration: true,
  required_documents: DEFAULT_DOCUMENTS,
  prevent_duplicate_phone: true,
}

export default function AdmissionSettingsPage() {
  const { user } = useAuth()

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)

  const form = useForm<AdmissionSettingsFormValues, any, AdmissionSettingsSubmitValues>({
    resolver: zodResolver(admissionSettingsSchema),
    defaultValues: {
      admission_open: true,
      academic_year: "",
      admission_fee: 0,
      fee_waiver_allowed: false,
      link_expiry_days: 7,
      allow_regeneration: true,
      required_documents: DEFAULT_DOCUMENTS,
      prevent_duplicate_phone: true,
    },
  })

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "required_documents",
  })

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const admissionOpen = form.watch("admission_open")

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
        // const response = await fetch("/admin/settings/admission", {
        //   method: "GET",
        //   headers: {
        //     "Content-Type": "application/json",
        //     "x-tenant-id": String(tenantId),
        //   },
        //   cache: "no-store",
        // })
        // if (!response.ok) throw new Error("Failed to load admission settings")
        // const data = await response.json()

        await new Promise((resolve) => setTimeout(resolve, 300))
        const data = DUMMY_ADMISSION_SETTINGS

        if (!mounted) return

        form.reset({
          admission_open: data.admission_open,
          academic_year: data.academic_year,
          admission_fee: data.admission_fee,
          fee_waiver_allowed: data.fee_waiver_allowed,
          link_expiry_days: data.link_expiry_days,
          allow_regeneration: data.allow_regeneration,
          required_documents: data.required_documents.length > 0 ? data.required_documents : DEFAULT_DOCUMENTS,
          prevent_duplicate_phone: data.prevent_duplicate_phone,
        })
      } catch {
        if (!mounted) return
        toast.error("Failed to load admission settings")
      } finally {
        if (mounted) setIsInitialLoading(false)
      }
    }

    loadSettings()

    return () => {
      mounted = false
    }
  }, [form, tenantId])

  const onSubmit = async (values: AdmissionSettingsSubmitValues) => {
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
      // const response = await fetch("/admin/settings/admission", {
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
      //   throw new Error(errorData?.message || "Failed to save admission settings")
      // }

      await new Promise((resolve) => setTimeout(resolve, 450))
      toast.success("Settings saved successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to save admission settings")
    } finally {
      setIsSaving(false)
    }
  }

  const LoadingCard = ({ compact = false }: { compact?: boolean }) => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-52" />
      </CardHeader>
      <CardContent className={compact ? "grid gap-4" : "grid gap-4 md:grid-cols-2"}>
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        {!compact ? <Skeleton className="h-9 w-full" /> : null}
      </CardContent>
    </Card>
  )

  if (isInitialLoading) {
    return (
      <div className="space-y-5 pb-24">
        <div>
          <h1 className="text-2xl font-semibold">Admission Settings</h1>
          <p className="text-sm text-muted-foreground">Configure how admissions work for your school</p>
        </div>
        <LoadingCard compact />
        <LoadingCard compact />
        <LoadingCard compact />
        <LoadingCard />
        <LoadingCard compact />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-semibold">Admission Settings</h1>
        <p className="text-sm text-muted-foreground">Configure how admissions work for your school</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admission Window</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="admission_open"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Accept new applications</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              {!admissionOpen ? (
                <Alert className="border-amber-200 bg-amber-50 text-amber-900">
                  <AlertDescription>
                    Admissions are currently closed. Students cannot apply.
                  </AlertDescription>
                </Alert>
              ) : null}

              <FormField
                control={form.control}
                name="academic_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Academic Year</FormLabel>
                    <FormControl>
                      <Input placeholder="2025-2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admission Fee</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="admission_fee"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Admission Fee</FormLabel>
                    <FormControl>
                      <div className="flex items-center gap-2 rounded-lg border border-input px-3">
                        <span className="text-sm text-muted-foreground">BDT</span>
                        <Input
                          type="number"
                          min={0}
                          className="border-0 px-0 focus-visible:ring-0"
                          name={field.name}
                          ref={field.ref}
                          onBlur={field.onBlur}
                          value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                          onChange={(event) => field.onChange(event.target.value)}
                        />
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="fee_waiver_allowed"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Allow fee waiver (admin only)</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Registration Link</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormField
                control={form.control}
                name="link_expiry_days"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Link Expiry Days</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min={1}
                        max={30}
                        name={field.name}
                        ref={field.ref}
                        onBlur={field.onBlur}
                        value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""}
                        onChange={(event) => field.onChange(event.target.value)}
                      />
                    </FormControl>
                    <p className="text-xs text-muted-foreground">
                      Secure registration link will expire after this many days
                    </p>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="allow_regeneration"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Allow admin to regenerate expired links</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Required Documents</CardTitle>
              <CardDescription>
                Configure which admission documents are mandatory.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {fields.map((document, index) => (
                <div key={document.id} className="grid gap-3 rounded-md border p-3 md:grid-cols-[1fr_auto_auto] md:items-center">
                  <FormField
                    control={form.control}
                    name={`required_documents.${index}.name`}
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Document Name</FormLabel>
                        <FormControl>
                          <Input {...field} />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name={`required_documents.${index}.required`}
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between gap-3 rounded-md border px-3 py-2">
                        <FormLabel className="mb-0 text-sm">Required</FormLabel>
                        <FormControl>
                          <Switch checked={field.value} onCheckedChange={field.onChange} />
                        </FormControl>
                      </FormItem>
                    )}
                  />

                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-self-end text-red-600 hover:text-red-700"
                    onClick={() => remove(index)}
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Delete
                  </Button>
                </div>
              ))}

              <FormMessage>{form.formState.errors.required_documents?.message as string}</FormMessage>

              <Button
                type="button"
                variant="outline"
                onClick={() => append({ name: "", required: true })}
              >
                <Plus className="mr-2 h-4 w-4" />
                Add Document
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Duplicate Application Rule</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <FormField
                control={form.control}
                name="prevent_duplicate_phone"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-md border p-3">
                    <FormLabel className="mb-0">Prevent duplicate by phone number</FormLabel>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
              <p className="text-xs text-muted-foreground">
                Block multiple applications from the same phone number
              </p>
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
