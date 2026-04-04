"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import { useCreateManualAdmissionMutation } from "@/features/user/userApi"
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

const DUMMY_CLASSES: ClassOption[] = [
  { id: "6", name: "Class 6" },
  { id: "7", name: "Class 7" },
  { id: "8", name: "Class 8" },
  { id: "9", name: "Class 9" },
  { id: "10", name: "Class 10" },
  { id: "11", name: "Class 11" },
  { id: "12", name: "Class 12" },
]

const DUMMY_BATCHES_BY_CLASS: Record<string, BatchOption[]> = {
  "6": [{ id: "6-a", name: "Batch A" }, { id: "6-b", name: "Batch B" }],
  "7": [{ id: "7-a", name: "Batch A" }, { id: "7-b", name: "Batch B" }],
  "8": [{ id: "8-a", name: "Batch A" }, { id: "8-b", name: "Batch B" }],
  "9": [{ id: "9-sci", name: "Science" }, { id: "9-com", name: "Commerce" }, { id: "9-art", name: "Arts" }],
  "10": [{ id: "10-sci", name: "Science" }, { id: "10-com", name: "Commerce" }, { id: "10-art", name: "Arts" }],
  "11": [{ id: "11-sci", name: "Science" }, { id: "11-com", name: "Commerce" }, { id: "11-art", name: "Arts" }],
  "12": [{ id: "12-sci", name: "Science" }, { id: "12-com", name: "Commerce" }, { id: "12-art", name: "Arts" }],
}

const formSchema = z.object({
  full_name: z.string().trim().min(1, "Full name is required"),
  dob: z.string().min(1, "Date of birth is required"),
  gender: z.enum(["Male", "Female", "Other"], { message: "Gender is required" }),
  phone: z.string().trim().min(1, "Phone is required"),
  email: z.string().trim().email("Enter a valid email").optional().or(z.literal("")),
  address: z.string().trim().min(1, "Address is required"),
  class_id: z.string().min(1, "Class is required"),
  batch_id: z.string().min(1, "Batch is required"),
  father_name: z.string().trim().min(1, "Father name is required"),
  mother_name: z.string().trim().min(1, "Mother name is required"),
  parent_phone: z.string().trim().min(1, "Parent phone is required"),
  parent_nid: z.string().optional(),
  parent_nid_front: z.custom<File>((value) => value instanceof File, { message: "Front NID image is required" }),
  parent_nid_back: z.custom<File>((value) => value instanceof File, { message: "Back NID image is required" }),
  amount: z.coerce.number().positive("Amount is required"),
  method: z.enum(["CASH", "MFS", "POS", "ONLINE"], { message: "Method is required" }),
  transaction_id: z.string().trim().min(1, "Transaction / Reference ID is required"),
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
  const [createManualAdmission] = useCreateManualAdmissionMutation()
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [isClassesLoading, setIsClassesLoading] = useState(true)
  const [isBatchesLoading, setIsBatchesLoading] = useState(false)
  const [parentNidFrontPreview, setParentNidFrontPreview] = useState<string | null>(null)
  const [parentNidBackPreview, setParentNidBackPreview] = useState<string | null>(null)

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
      method: undefined,
      transaction_id: "",
    },
  })

  const selectedClassId = form.watch("class_id")

  useEffect(() => {
    let mounted = true
    ;(async () => {
      setIsClassesLoading(true)
      await new Promise((resolve) => setTimeout(resolve, 150))
      if (mounted) {
        setClasses(DUMMY_CLASSES)
        setIsClassesLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true
    ;(async () => {
      if (!selectedClassId) {
        form.setValue("batch_id", "")
        setBatches([])
        return
      }
      setIsBatchesLoading(true)
      form.setValue("batch_id", "")
      await new Promise((resolve) => setTimeout(resolve, 150))
      if (mounted) {
        setBatches(DUMMY_BATCHES_BY_CLASS[selectedClassId] ?? [])
        setIsBatchesLoading(false)
      }
    })()
    return () => {
      mounted = false
    }
  }, [selectedClassId, form])

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
    const label = type === "front" ? "Front NID image is required" : "Back NID image is required"

    if (currentPreview) URL.revokeObjectURL(currentPreview)

    if (file) {
      form.setValue(fieldName, file, { shouldValidate: true })
      setPreview(URL.createObjectURL(file))
      return
    }

    setPreview(null)
    form.setError(fieldName, { message: label })
  }

  const closeForm = () => {
    if (onCancel) return onCancel()
    router.push("/dashboard/admissions")
  }

  const onSubmit = async (values: SubmitValues) => {
    try {
      await createManualAdmission({
        student_name: values.full_name,
        student_email: values.email || undefined,
        student_phone: values.phone,
        class_id: values.class_id,
        batch_id: values.batch_id,
        amount: String(values.amount),
        discount: "0.00",
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
        className={mode === "page" ? "space-y-5 pb-28 md:pb-32" : "space-y-5"}
      >
        <div className={mode === "dialog" ? "max-h-[70vh] overflow-y-auto pr-1 pb-4" : ""}>
          <div className="space-y-5">
            <Card className="adm-card m-0">
              <CardHeader><CardTitle className="text-base">Student Information</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="full_name" render={({ field }) => <FormItem><FormLabel>Full Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="dob" render={({ field }) => <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} /></FormControl><FormMessage /></FormItem>} />
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

            <Card className="adm-card m-0">
              <CardHeader><CardTitle className="text-base">Class & Batch</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="class_id" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <FormControl>
                      {isClassesLoading ? <Skeleton className="h-9 w-full" /> : (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <option value="">Select class</option>
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
                        <Select value={field.value} onValueChange={field.onChange} disabled={!selectedClassId}>
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

            <Card className="adm-card m-0">
              <CardHeader><CardTitle className="text-base">Parent Information & Documents</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField control={form.control} name="father_name" render={({ field }) => <FormItem><FormLabel>Father Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="mother_name" render={({ field }) => <FormItem><FormLabel>Mother Name</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="parent_phone" render={({ field }) => <FormItem><FormLabel>Parent Phone</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>} />
                <FormField control={form.control} name="parent_nid" render={({ field }) => <FormItem><FormLabel>Parent NID</FormLabel><FormControl><Input {...field} value={field.value ?? ""} /></FormControl><FormMessage /></FormItem>} />
                <FormItem>
                  <FormLabel>Parent NID Front Image</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={(event) => handleParentNidImageChange("front", event.target.files?.[0] ?? null)} />
                  </FormControl>
                  {parentNidFrontPreview ? <div className="mt-2"><img src={parentNidFrontPreview} alt="Parent NID front preview" className="h-24 w-full max-w-[180px] rounded-lg border object-cover" /></div> : null}
                  <FormMessage>{form.formState.errors.parent_nid_front?.message}</FormMessage>
                </FormItem>
                <FormItem>
                  <FormLabel>Parent NID Back Image</FormLabel>
                  <FormControl>
                    <Input type="file" accept="image/*" onChange={(event) => handleParentNidImageChange("back", event.target.files?.[0] ?? null)} />
                  </FormControl>
                  {parentNidBackPreview ? <div className="mt-2"><img src={parentNidBackPreview} alt="Parent NID back preview" className="h-24 w-full max-w-[180px] rounded-lg border object-cover" /></div> : null}
                  <FormMessage>{form.formState.errors.parent_nid_back?.message}</FormMessage>
                </FormItem>
              </CardContent>
            </Card>

            <Card className="adm-card m-0">
              <CardHeader><CardTitle className="text-base">Payment Details</CardTitle></CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-3">
                <FormField control={form.control} name="amount" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
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
                        <option value="MFS">MFS</option>
                        <option value="POS">POS</option>
                        <option value="ONLINE">ONLINE</option>
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
                      <FormLabel>Transaction / Reference ID</FormLabel>
                      <FormControl>
                        <Input {...field} placeholder="Receipt no / bKash trx ID / POS slip no" />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Use the payment reference from cash receipt, mobile banking, POS, or online payment.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          </div>
        </div>

        <div className={mode === "page" ? "fixed bottom-0 left-0 right-0 z-40 border-t bg-white/95 backdrop-blur" : "sticky bottom-0 border-t bg-background pt-4"}>
          <div className={mode === "page" ? "mx-auto flex max-w-[1200px] flex-col-reverse gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between md:px-8" : "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end"}>
            <Button type="button" variant="ghost" onClick={closeForm} className="w-full sm:w-auto">Cancel</Button>
            <Button type="submit" disabled={form.formState.isSubmitting} className="w-full sm:w-auto">
              {form.formState.isSubmitting ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Creating...</> : "Create Admission"}
            </Button>
          </div>
        </div>
      </form>
    </Form>
  )
}
