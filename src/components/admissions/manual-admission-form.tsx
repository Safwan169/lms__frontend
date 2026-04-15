"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useQuery } from "@tanstack/react-query"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { useCreateManualAdmissionMutation } from "@/features/user/userApi"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

type ClassOption = { id: string; name: string }
type BatchOption = { id: string; name: string }
const yesterdayDate = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split("T")[0] ?? ""

const formSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  dob: z
    .string()
    .optional()
    .refine((value) => !value || value <= yesterdayDate, {
      message: "Date of birth must be before today",
    }),
  gender: z.enum(["Male", "Female", "Other"], { message: "Gender is required" }).optional(),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().optional(),
  class_id: z.string().min(1, "Class is required"),
  batch_id: z.string().min(1, "Batch is required"),
  father_name: z.string().optional(),
  mother_name: z.string().optional(),
  parent_phone: z.string().trim().min(1, "Parent phone is required"),
  parent_nid: z.string().optional(),
  parent_nid_front: z.custom<File | undefined>((value) => value == null || value instanceof File),
  parent_nid_back: z.custom<File | undefined>((value) => value == null || value instanceof File),
  amount: z.coerce.number().positive("Amount is required"),
  discount: z.coerce.number().min(0, "Discount cannot be negative").default(0),
  method: z.enum(["CASH", "BKASH", "CARD"], { message: "Method is required" }),
  transaction_id: z.string().optional(),
})

type FormValues = z.input<typeof formSchema>
type SubmitValues = z.output<typeof formSchema>

type ManualAdmissionFormProps = {
  mode?: "page" | "dialog"
  onCancel?: () => void
  onSuccess?: () => void
}

export default function ManualAdmissionForm({ mode = "page", onCancel, onSuccess }: ManualAdmissionFormProps) {
  const router = useRouter()
  const { user } = useAuth()
  const [createManualAdmission] = useCreateManualAdmissionMutation()
  const [parentNidFrontPreview, setParentNidFrontPreview] = useState<string | null>(null)
  const [parentNidBackPreview, setParentNidBackPreview] = useState<string | null>(null)

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant?.id ??
    null

  const form = useForm<FormValues, any, SubmitValues>({
    resolver: zodResolver(formSchema),
    mode: "onSubmit",
    defaultValues: {
      full_name: "",
      dob: "",
      gender: undefined,
      phone: "",
      email: "",
      address: "",
      class_id: "",
      batch_id: "",
      father_name: "",
      mother_name: "",
      parent_phone: "",
      parent_nid: "",
      parent_nid_front: undefined,
      parent_nid_back: undefined,
      amount: 0,
      discount: 0,
      method: undefined,
      transaction_id: "",
    },
  })

  const selectedClassId = form.watch("class_id")
  const isDialogMode = mode === "dialog"
  const { data: classes = [], isLoading: isClassesLoading } = useQuery({
    queryKey: ["manual-admission-classes", tenantId],
    queryFn: async (): Promise<ClassOption[]> => {
      if (!tenantId) return []

      const response = await api.get(`/api/tenants/${tenantId}/classes`, {
        params: {
          page: 1,
          limit: 100,
        },
      })

      const payload = response?.data
      const rawItems = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []

      return rawItems
        .map((item: any) => ({
          id: String(item?.id ?? item?.class_id ?? "").trim(),
          name: String(item?.class_name ?? item?.name ?? `Class ${item?.id ?? ""}`).trim(),
        }))
        .filter((item: ClassOption) => item.id.length > 0)
    },
    enabled: !!tenantId,
  })
  const { data: batches = [], isLoading: isBatchesLoading } = useQuery({
    queryKey: ["manual-admission-batches", tenantId, selectedClassId],
    queryFn: async (): Promise<BatchOption[]> => {
      if (!tenantId || !selectedClassId) return []

      const response = await api.get(`/api/tenants/${tenantId}/batches`, {
        params: {
          page: 1,
          limit: 100,
          class_id: selectedClassId,
        },
      })

      const payload = response?.data
      const rawItems = Array.isArray(payload?.data)
        ? payload.data
        : Array.isArray(payload)
          ? payload
          : []

      return rawItems
        .map((item: any) => ({
          id: String(item?.id ?? item?.batch_id ?? "").trim(),
          name: String(item?.batch_name ?? item?.name ?? item?.section ?? `Batch ${item?.id ?? ""}`).trim(),
        }))
        .filter((item: BatchOption) => item.id.length > 0)
    },
    enabled: !!tenantId && !!selectedClassId,
  })

  useEffect(() => {
    if (!selectedClassId) {
      form.setValue("batch_id", "")
      return
    }
    const currentBatchId = form.getValues("batch_id")
    if (currentBatchId && !batches.some((item) => item.id === currentBatchId)) {
      form.setValue("batch_id", "")
    }
  }, [selectedClassId, batches, form])

  useEffect(() => {
    return () => {
      if (parentNidFrontPreview) URL.revokeObjectURL(parentNidFrontPreview)
      if (parentNidBackPreview) URL.revokeObjectURL(parentNidBackPreview)
    }
  }, [parentNidFrontPreview, parentNidBackPreview])

  const handleParentNidImageChange = (type: "front" | "back", file: File | null) => {
    const currentPreview = type === "front" ? parentNidFrontPreview : parentNidBackPreview
    const setPreview = type === "front" ? setParentNidFrontPreview : setParentNidBackPreview
    const fieldName = type === "front" ? "parent_nid_front" : "parent_nid_back"

    if (currentPreview) URL.revokeObjectURL(currentPreview)

    if (file) {
      form.setValue(fieldName, file, { shouldValidate: true })
      setPreview(URL.createObjectURL(file))
      form.clearErrors(fieldName)
      return
    }

    setPreview(null)
    form.setValue(fieldName, undefined, { shouldValidate: true })
  }

  const closeForm = () => {
    if (onCancel) return onCancel()
    router.push("/dashboard/admissions")
  }

  const onSubmit = async (values: SubmitValues) => {
    try {
      if (!tenantId) {
        throw new Error("Tenant information missing. Please log in again.")
      }

      await createManualAdmission({
        student_name: values.full_name,
        student_email: values.email || undefined,
        student_phone: values.phone,
        class_id: values.class_id,
        batch_id: values.batch_id,
        amount: values.amount.toFixed(2),
        discount: values.discount.toFixed(2),
        payment_method: values.method,
        parent_phone: values.parent_phone,
      }).unwrap()
      toast.success("Student admitted successfully")
      if (onSuccess) return onSuccess()
      setTimeout(() => router.push("/dashboard/admissions"), 1500)
    } catch (error: unknown) {
      const maybeError = error as { data?: { message?: string }; message?: string }
      toast.error(maybeError?.data?.message || maybeError?.message || "Failed to create admission")
    }
  }

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(onSubmit)}
        className={cn("space-y-5", mode === "page" ? "pb-28 md:pb-32" : "")}
      >
        <div
          className={cn(
            isDialogMode
              ? "max-h-[68vh] overflow-y-auto pr-2 [scrollbar-gutter:stable] [scrollbar-width:thin] [&::-webkit-scrollbar]:w-2 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-slate-300 hover:[&::-webkit-scrollbar-thumb]:bg-slate-400"
              : ""
          )}
        >
          <div className="space-y-5">
            <Card className={cn("adm-card m-0", isDialogMode && "border-slate-200 shadow-none")}>
              <CardHeader className={cn(isDialogMode && "border-b bg-slate-50/70 px-5 py-4")}><CardTitle className="text-base">Student Information</CardTitle></CardHeader>
              <CardContent className={cn("grid gap-4 md:grid-cols-2", isDialogMode && "px-5 py-5")}>
                <FormField control={form.control} name="full_name" render={({ field }) => <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="dob" render={({ field }) => <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" max={yesterdayDate} {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="gender" render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} name="gender">
                        <RadioGroupItem id={`${mode}-gender-male`} value="Male">Male</RadioGroupItem>
                        <RadioGroupItem id={`${mode}-gender-female`} value="Female">Female</RadioGroupItem>
                        <RadioGroupItem id={`${mode}-gender-other`} value="Other">Other</RadioGroupItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="phone" render={({ field }) => <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="email" render={({ field }) => <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="address" render={({ field }) => <FormItem className="md:col-span-2"><FormLabel>Address</FormLabel><FormControl><Textarea {...field} /></FormControl><FormMessage /></FormItem>} />
              </CardContent>
            </Card>

            <Card className={cn("adm-card m-0", isDialogMode && "border-slate-200 shadow-none")}>
              <CardHeader className={cn(isDialogMode && "border-b bg-slate-50/70 px-5 py-4")}><CardTitle className="text-base">Class & Batch</CardTitle></CardHeader>
              <CardContent className={cn("grid gap-4 md:grid-cols-2", isDialogMode && "px-5 py-5")}>
                <FormField control={form.control} name="class_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <FormControl>
                      {isClassesLoading ? <Skeleton className="h-9 w-full" /> : (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!tenantId || classes.length === 0}>
                          <option value="">{tenantId ? "Select class" : "Tenant not found"}</option>
                          {classes.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="batch_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch</FormLabel>
                    <FormControl>
                      {isBatchesLoading ? <Skeleton className="h-9 w-full" /> : (
                        <Select value={field.value} onValueChange={field.onChange} disabled={!selectedClassId || batches.length === 0}>
                          <option value="">{selectedClassId ? "Select batch" : "Select class first"}</option>
                          {batches.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card className={cn("adm-card m-0", isDialogMode && "border-slate-200 shadow-none")}>
              <CardHeader className={cn(isDialogMode && "border-b bg-slate-50/70 px-5 py-4")}><CardTitle className="text-base">Parent Information & Documents</CardTitle></CardHeader>
              <CardContent className={cn("grid gap-4 md:grid-cols-2", isDialogMode && "px-5 py-5")}>
                <FormField control={form.control} name="father_name" render={({ field }) => <FormItem><FormLabel>Father Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="mother_name" render={({ field }) => <FormItem><FormLabel>Mother Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="parent_phone" render={({ field }) => <FormItem><FormLabel>Parent Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="parent_nid" render={({ field }) => <FormItem><FormLabel>Parent NID</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
                <FormItem>
                  <FormLabel>Parent NID Front Image (Optional)</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={(event) => handleParentNidImageChange("front", event.target.files?.[0] ?? null)} />
                  </FormControl>
                  {parentNidFrontPreview ? <div className="mt-2"><img src={parentNidFrontPreview} alt="Parent NID front preview" className="h-24 w-full max-w-[180px] rounded-lg border object-cover" /></div> : null}
                  <FormMessage>{form.formState.errors.parent_nid_front?.message}</FormMessage>
                </FormItem>
                <FormItem>
                  <FormLabel>Parent NID Back Image (Optional)</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={(event) => handleParentNidImageChange("back", event.target.files?.[0] ?? null)} />
                  </FormControl>
                  {parentNidBackPreview ? <div className="mt-2"><img src={parentNidBackPreview} alt="Parent NID back preview" className="h-24 w-full max-w-[180px] rounded-lg border object-cover" /></div> : null}
                  <FormMessage>{form.formState.errors.parent_nid_back?.message}</FormMessage>
                </FormItem>
              </CardContent>
            </Card>

            <Card className={cn("adm-card m-0", isDialogMode && "border-slate-200 shadow-none")}>
              <CardHeader className={cn(isDialogMode && "border-b bg-slate-50/70 px-5 py-4")}><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
              <CardContent className={cn("grid gap-4 md:grid-cols-3", isDialogMode && "px-5 py-5")}>
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
                    <FormControl>
                      <Input type="number" name={field.name} ref={field.ref} onBlur={field.onBlur} value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""} onChange={(event) => field.onChange(event.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="discount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Discount</FormLabel>
                    <FormControl>
                      <Input type="number" name={field.name} ref={field.ref} onBlur={field.onBlur} value={typeof field.value === "number" || typeof field.value === "string" ? field.value : ""} onChange={(event) => field.onChange(event.target.value)} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField control={form.control} name="method" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Method</FormLabel>
                    <FormControl>
                      <Select value={field.value} onValueChange={field.onChange}>
                        <option value="">Select method</option>
                        <option value="CASH">CASH</option>
                        <option value="BKASH">BKASH</option>
                        <option value="CARD">CARD</option>
                      </Select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )} />
                <FormField
                  control={form.control}
                  name="transaction_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Transaction / Reference ID (Optional)</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Receipt no / bKash trx ID / card slip no" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Use the payment reference from cash receipt, bKash transaction, or card slip.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className={mode === "page" ? "fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur" : "border-t pt-5"}>
          <div className={mode === "page" ? "mx-auto flex max-w-[1200px] flex-col-reverse gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-8" : "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end"}>
            <Button type="button" variant="ghost" onClick={closeForm} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting || !tenantId} className="w-full sm:w-auto">
              {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Admission"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
