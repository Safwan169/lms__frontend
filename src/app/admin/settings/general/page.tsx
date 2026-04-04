"use client"

import { useEffect, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import { useAuth } from "@/context/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

const generalSettingsSchema = z.object({
  school_name: z.string().trim().min(1, "School name is required"),
  school_code: z.string().trim().min(1, "School code is required"),
  tagline: z.string().optional(),
  established_year: z
    .string()
    .optional()
    .refine((value) => !value || /^\d{4}$/.test(value), "Enter a valid 4-digit year"),
  contact_email: z.string().trim().email("Enter a valid email"),
  contact_phone: z.string().trim().min(1, "Contact phone is required"),
  address: z.string().trim().min(1, "Address is required"),
  website: z
    .string()
    .trim()
    .optional()
    .refine((value) => !value || /^https?:\/\/.+/i.test(value), "Enter a valid website URL"),
  timezone: z.enum(["Asia/Dhaka", "UTC", "Asia/Kolkata"], {
    message: "Select a timezone",
  }),
  currency: z.enum(["BDT", "USD", "INR"], {
    message: "Select a currency",
  }),
  date_format: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"], {
    message: "Select a date format",
  }),
})

type GeneralSettingsFormValues = z.infer<typeof generalSettingsSchema>

type GeneralSettingsResponse = GeneralSettingsFormValues & {
  logo_url?: string
}

const DUMMY_GENERAL_SETTINGS: GeneralSettingsResponse = {
  school_name: "Sans University",
  school_code: "SU-001",
  tagline: "Excellence Through Learning",
  established_year: "2008",
  contact_email: "info@sansuniversity.edu",
  contact_phone: "+8801712345678",
  address: "Road 12, Sector 10, Uttara, Dhaka",
  website: "https://sansuniversity.edu",
  timezone: "Asia/Dhaka",
  currency: "BDT",
  date_format: "DD/MM/YYYY",
  logo_url: "https://placehold.co/80x80/png",
}

export default function GeneralSettingsPage() {
  const { user } = useAuth()

  const [isInitialLoading, setIsInitialLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [logoFile, setLogoFile] = useState<File | null>(null)
  const [logoPreview, setLogoPreview] = useState<string | null>(null)
  const [currentLogo, setCurrentLogo] = useState<string | null>(null)

  const form = useForm<GeneralSettingsFormValues>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      school_name: "",
      school_code: "",
      tagline: "",
      established_year: "",
      contact_email: "",
      contact_phone: "",
      address: "",
      website: "",
      timezone: "Asia/Dhaka",
      currency: "BDT",
      date_format: "DD/MM/YYYY",
    },
  })

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  useEffect(() => {
    let mounted = true

    const loadSettings = async () => {
      setIsInitialLoading(true)

      try {
        // API implementation intentionally commented for frontend-only flow.
        // const response = await fetch("/admin/settings/general", {
        //   method: "GET",
        //   headers: {
        //     "Content-Type": "application/json",
        //     "x-tenant-id": String(tenantId),
        //   },
        //   cache: "no-store",
        // })
        // if (!response.ok) throw new Error("Failed to load general settings")
        // const data = await response.json()

        await new Promise((resolve) => setTimeout(resolve, 300))
        const data = DUMMY_GENERAL_SETTINGS

        if (!mounted) return

        form.reset({
          school_name: data.school_name ?? "",
          school_code: data.school_code ?? "",
          tagline: data.tagline ?? "",
          established_year: data.established_year ?? "",
          contact_email: data.contact_email ?? "",
          contact_phone: data.contact_phone ?? "",
          address: data.address ?? "",
          website: data.website ?? "",
          timezone: data.timezone ?? "Asia/Dhaka",
          currency: data.currency ?? "BDT",
          date_format: data.date_format ?? "DD/MM/YYYY",
        })

        setCurrentLogo(data.logo_url ?? null)
      } catch {
        if (!mounted) return
        toast.error("Failed to load general settings")
      } finally {
        if (mounted) setIsInitialLoading(false)
      }
    }

    loadSettings()

    return () => {
      mounted = false
      if (logoPreview) {
        URL.revokeObjectURL(logoPreview)
      }
    }
  }, [form, tenantId, logoPreview])

  const handleLogoChange = (file: File | null) => {
    if (logoPreview) URL.revokeObjectURL(logoPreview)

    if (!file) {
      setLogoFile(null)
      setLogoPreview(null)
      return
    }

    setLogoFile(file)
    setLogoPreview(URL.createObjectURL(file))
  }

  const onSubmit = async (values: GeneralSettingsFormValues) => {
    if (!tenantId) {
      toast.error("Tenant information missing in session")
      return
    }

    setIsSaving(true)

    try {
      let uploadedLogoUrl = currentLogo

      if (logoFile) {
        // API implementation intentionally commented for frontend-only flow.
        // const uploadFormData = new FormData()
        // uploadFormData.append("file", logoFile)
        // uploadFormData.append("tenant_id", String(tenantId))
        //
        // const uploadRes = await fetch("/upload", {
        //   method: "POST",
        //   body: uploadFormData,
        // })
        // if (!uploadRes.ok) throw new Error("Logo upload failed")
        // const uploadData = await uploadRes.json()
        // uploadedLogoUrl = uploadData?.url ?? null

        uploadedLogoUrl = logoPreview || currentLogo
      }

      const payload = {
        tenant_id: tenantId,
        ...values,
        established_year: values.established_year || null,
        website: values.website || null,
        tagline: values.tagline || null,
        logo_url: uploadedLogoUrl,
      }

      // API implementation intentionally commented for frontend-only flow.
      // const response = await fetch("/admin/settings/general", {
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
      //   throw new Error(errorData?.message || "Failed to save settings")
      // }

      await new Promise((resolve) => setTimeout(resolve, 450))
      setCurrentLogo(payload.logo_url)
      setLogoFile(null)
      toast.success("Settings saved successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to save settings")
    } finally {
      setIsSaving(false)
    }
  }

  const previewLogo = logoPreview || currentLogo

  const LoadingCard = () => (
    <Card>
      <CardHeader>
        <Skeleton className="h-5 w-48" />
      </CardHeader>
      <CardContent className="grid gap-4 md:grid-cols-2">
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
        <Skeleton className="h-9 w-full" />
      </CardContent>
    </Card>
  )

  if (isInitialLoading) {
    return (
      <div className="space-y-5 pb-24">
        <div>
          <h1 className="text-2xl font-semibold">General Settings</h1>
          <p className="text-sm text-muted-foreground">Manage your school&apos;s basic information</p>
        </div>
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
        <LoadingCard />
      </div>
    )
  }

  return (
    <div className="space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-semibold">General Settings</h1>
        <p className="text-sm text-muted-foreground">Manage your school&apos;s basic information</p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">School Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="school_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="school_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>School Code</FormLabel>
                    <FormControl>
                      <Input {...field} readOnly />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="tagline"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Tagline</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="established_year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Established Year</FormLabel>
                    <FormControl>
                      <Input type="number" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Logo & Branding</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <FormItem>
                <FormLabel>Logo upload</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      handleLogoChange(file)
                    }}
                  />
                </FormControl>
              </FormItem>

              {previewLogo ? (
                <img
                  src={previewLogo}
                  alt="School logo preview"
                  className="h-20 w-20 rounded-lg border object-cover"
                />
              ) : (
                <div className="h-20 w-20 rounded-lg border bg-muted" />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contact Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="contact_email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="contact_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Contact Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="website"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Website</FormLabel>
                    <FormControl>
                      <Input type="url" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="hidden md:block" />

              <FormField
                control={form.control}
                name="address"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Address</FormLabel>
                    <FormControl>
                      <Textarea {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Locale</CardTitle>
              <CardDescription>Regional display defaults for this tenant.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="timezone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Timezone</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <option value="Asia/Dhaka">Asia/Dhaka</option>
                        <option value="UTC">UTC</option>
                        <option value="Asia/Kolkata">Asia/Kolkata</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="currency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Currency</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <option value="BDT">BDT</option>
                        <option value="USD">USD</option>
                        <option value="INR">INR</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="date_format"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date Format</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <option value="DD/MM/YYYY">DD/MM/YYYY</option>
                        <option value="MM/DD/YYYY">MM/DD/YYYY</option>
                        <option value="YYYY-MM-DD">YYYY-MM-DD</option>
                      </Select>
                    </FormControl>
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
