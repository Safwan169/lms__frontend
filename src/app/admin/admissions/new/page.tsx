"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { ArrowLeft, Loader2, X } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Select } from "@/components/ui/select"
import { Skeleton } from "@/components/ui/skeleton"
import { Textarea } from "@/components/ui/textarea"

type ClassOption = {
  id: string
  name: string
}

type BatchOption = {
  id: string
  name: string
}

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
  "6": [
    { id: "6-a", name: "Batch A" },
    { id: "6-b", name: "Batch B" },
  ],
  "7": [
    { id: "7-a", name: "Batch A" },
    { id: "7-b", name: "Batch B" },
  ],
  "8": [
    { id: "8-a", name: "Batch A" },
    { id: "8-b", name: "Batch B" },
  ],
  "9": [
    { id: "9-sci", name: "Science" },
    { id: "9-com", name: "Commerce" },
    { id: "9-art", name: "Arts" },
  ],
  "10": [
    { id: "10-sci", name: "Science" },
    { id: "10-com", name: "Commerce" },
    { id: "10-art", name: "Arts" },
  ],
  "11": [
    { id: "11-sci", name: "Science" },
    { id: "11-com", name: "Commerce" },
    { id: "11-art", name: "Arts" },
  ],
  "12": [
    { id: "12-sci", name: "Science" },
    { id: "12-com", name: "Commerce" },
    { id: "12-art", name: "Arts" },
  ],
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
  photo: z.custom<File>((value) => value instanceof File, {
    message: "Photo is required",
  }),
  documents: z.array(z.custom<File>((value) => value instanceof File)).min(1, "At least 1 document is required"),
  amount: z.coerce.number().positive("Amount is required"),
  method: z.enum(["CASH", "MFS", "POS", "ONLINE"], { message: "Method is required" }),
  transaction_id: z.string().trim().min(1, "Transaction / Reference ID is required"),
})

type FormValues = z.input<typeof formSchema>
type SubmitValues = z.output<typeof formSchema>

export default function NewManualAdmissionPage() {
  const router = useRouter()

  const [classes, setClasses] = useState<ClassOption[]>([])
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [isClassesLoading, setIsClassesLoading] = useState(true)
  const [isBatchesLoading, setIsBatchesLoading] = useState(false)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [documentFiles, setDocumentFiles] = useState<File[]>([])

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
      documents: [],
      amount: 0,
      method: undefined,
      transaction_id: "",
    },
  })

  const selectedClassId = form.watch("class_id")

  // Guard implementation intentionally commented for frontend-only flow.
  // const isAdmin = useMemo(() => {
  //   if (!user) return false
  //   const role = String((user as any)?.role ?? "").toLowerCase()
  //   return role === "admin" || role === "rektor"
  // }, [user])
  //
  // useEffect(() => {
  //   if (!user) {
  //     router.push("/login")
  //     return
  //   }
  //
  //   if (!isAdmin) {
  //     router.push("/dashboard")
  //   }
  // }, [user, isAdmin, router])

  useEffect(() => {
    let mounted = true

    const loadClasses = async () => {
      setIsClassesLoading(true)

      try {
        // API implementation intentionally kept for later integration.
        // const response = await fetch("/api/classes", { cache: "no-store" })
        // if (!response.ok) throw new Error("Failed to load classes")
        //
        // const data = await response.json()
        // if (!mounted) return
        //
        // const normalized = Array.isArray(data)
        //   ? data
        //   : Array.isArray(data?.data)
        //     ? data.data
        //     : []
        //
        // const mapped = normalized.map((item: any) => ({
        //   id: String(item.id),
        //   name: String(item.name ?? item.title ?? `Class ${item.id}`),
        // }))
        //
        // setClasses(mapped.length > 0 ? mapped : DUMMY_CLASSES)
        await new Promise((resolve) => setTimeout(resolve, 150))
        if (!mounted) return
        setClasses(DUMMY_CLASSES)
      } catch {
        if (!mounted) return
        setClasses(DUMMY_CLASSES)
      } finally {
        if (mounted) setIsClassesLoading(false)
      }
    }

    loadClasses()

    return () => {
      mounted = false
    }
  }, [])

  useEffect(() => {
    let mounted = true

    const loadBatches = async () => {
      if (!selectedClassId) {
        form.setValue("batch_id", "")
        setBatches([])
        return
      }

      setIsBatchesLoading(true)
      form.setValue("batch_id", "")

      try {
        // API implementation intentionally kept for later integration.
        // const response = await fetch(`/api/batches?classId=${selectedClassId}`, {
        //   cache: "no-store",
        // })
        //
        // if (!response.ok) throw new Error("Failed to load batches")
        //
        // const data = await response.json()
        // if (!mounted) return
        //
        // const normalized = Array.isArray(data)
        //   ? data
        //   : Array.isArray(data?.data)
        //     ? data.data
        //     : []
        //
        // const mapped = normalized.map((item: any) => ({
        //   id: String(item.id),
        //   name: String(item.name ?? item.title ?? `Batch ${item.id}`),
        // }))
        //
        // setBatches(mapped.length > 0 ? mapped : DUMMY_BATCHES_BY_CLASS[selectedClassId] ?? [])
        await new Promise((resolve) => setTimeout(resolve, 150))
        if (!mounted) return
        setBatches(DUMMY_BATCHES_BY_CLASS[selectedClassId] ?? [])
      } catch {
        if (!mounted) return
        setBatches(DUMMY_BATCHES_BY_CLASS[selectedClassId] ?? [])
      } finally {
        if (mounted) setIsBatchesLoading(false)
      }
    }

    loadBatches()

    return () => {
      mounted = false
    }
  }, [selectedClassId, form])

  const handlePhotoChange = (file: File | null) => {
    if (photoPreview) {
      URL.revokeObjectURL(photoPreview)
    }

    if (file) {
      form.setValue("photo", file, { shouldValidate: true })
      setPhotoPreview(URL.createObjectURL(file))
      return
    }

    setPhotoPreview(null)
    form.setError("photo", { message: "Photo is required" })
  }

  const handleDocumentsChange = (files: File[]) => {
    setDocumentFiles(files)
    form.setValue("documents", files, { shouldValidate: true })
  }

  const removeDocument = (index: number) => {
    const next = documentFiles.filter((_, i) => i !== index)
    handleDocumentsChange(next)
  }

  const onSubmit = async (values: SubmitValues) => {
    const formData = new FormData()
    formData.append("full_name", values.full_name)
    formData.append("dob", values.dob)
    formData.append("gender", values.gender)
    formData.append("phone", values.phone)
    formData.append("email", values.email || "")
    formData.append("address", values.address)
    formData.append("class_id", values.class_id)
    formData.append("batch_id", values.batch_id)
    formData.append("father_name", values.father_name)
    formData.append("mother_name", values.mother_name)
    formData.append("parent_phone", values.parent_phone)
    formData.append("parent_nid", values.parent_nid || "")
    formData.append("photo", values.photo)
    values.documents.forEach((file) => formData.append("documents", file))
    formData.append("amount", String(values.amount))
    formData.append("method", values.method)
    formData.append("transaction_id", values.transaction_id)

    try {
      // API implementation intentionally kept for later integration.
      // const response = await fetch("/admin/admissions/manual", {
      //   method: "POST",
      //   body: formData,
      // })
      //
      // if (!response.ok) {
      //   const errorData = await response.json().catch(() => null)
      //   toast.error(errorData?.message || "Failed to create admission")
      //   return
      // }
      await new Promise((resolve) => setTimeout(resolve, 450))

      toast.success("Student admitted successfully")
      setTimeout(() => {
        router.push("/dashboard/admissions")
      }, 1500)
    } catch {
      toast.error("Failed to create admission")
    }
  }

  return (
    <div className="adm-root pb-24">
      <div className="adm-topbar">
        <div className="adm-topbar-left">
          <Link href="/dashboard/admissions" className="mb-2 inline-flex items-center gap-2 text-sm text-[#6366f1] hover:underline">
            <ArrowLeft className="h-4 w-4" />
            Back to Admissions
          </Link>
          <h1>New Admission</h1>
        </div>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card className="adm-card m-0">
            <CardHeader>
              <CardTitle className="text-base">Student Information</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dob"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Birth</FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="gender"
                render={({ field }) => (
                  <FormItem className="md:col-span-2">
                    <FormLabel>Gender</FormLabel>
                    <FormControl>
                      <RadioGroup value={field.value} onValueChange={field.onChange} name="gender">
                        <RadioGroupItem id="manual-gender-male" value="Male">Male</RadioGroupItem>
                        <RadioGroupItem id="manual-gender-female" value="Female">Female</RadioGroupItem>
                        <RadioGroupItem id="manual-gender-other" value="Other">Other</RadioGroupItem>
                      </RadioGroup>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

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

          <Card className="adm-card m-0">
            <CardHeader>
              <CardTitle className="text-base">Class & Batch</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="class_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Class</FormLabel>
                    <FormControl>
                      {isClassesLoading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <Select value={field.value} onValueChange={field.onChange}>
                          <option value="">Select class</option>
                          {classes.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="batch_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Batch</FormLabel>
                    <FormControl>
                      {isBatchesLoading ? (
                        <Skeleton className="h-9 w-full" />
                      ) : (
                        <Select
                          value={field.value}
                          onValueChange={field.onChange}
                          disabled={!selectedClassId}
                        >
                          <option value="">{selectedClassId ? "Select batch" : "Select class first"}</option>
                          {batches.map((item) => (
                            <option key={item.id} value={item.id}>
                              {item.name}
                            </option>
                          ))}
                        </Select>
                      )}
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <Card className="adm-card m-0">
            <CardHeader>
              <CardTitle className="text-base">Parent Information & Documents</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-2">
              <FormField
                control={form.control}
                name="father_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Father Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="mother_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Mother Name</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent Phone</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="parent_nid"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Parent NID (optional)</FormLabel>
                    <FormControl>
                      <Input {...field} value={field.value ?? ""} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormItem>
                <FormLabel>Photo upload</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    accept="image/*"
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null
                      handlePhotoChange(file)
                    }}
                  />
                </FormControl>
                {photoPreview ? (
                  <div className="mt-2">
                    <img
                      src={photoPreview}
                      alt="Photo preview"
                      className="h-24 w-24 rounded-lg border object-cover"
                    />
                  </div>
                ) : null}
                <FormMessage>{form.formState.errors.photo?.message}</FormMessage>
              </FormItem>

              <FormItem>
                <FormLabel>Documents</FormLabel>
                <FormControl>
                  <Input
                    type="file"
                    multiple
                    onChange={(event) => {
                      const files = Array.from(event.target.files ?? [])
                      handleDocumentsChange(files)
                    }}
                  />
                </FormControl>
                {documentFiles.length > 0 ? (
                  <ul className="mt-2 space-y-2">
                    {documentFiles.map((file, index) => (
                      <li
                        key={`${file.name}-${index}`}
                        className="flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                      >
                        <span className="truncate">{file.name}</span>
                        <button
                          type="button"
                          onClick={() => removeDocument(index)}
                          className="ml-2 text-muted-foreground hover:text-destructive"
                          aria-label={`Remove ${file.name}`}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <FormMessage>{form.formState.errors.documents?.message as string}</FormMessage>
              </FormItem>
            </CardContent>
          </Card>

          <Card className="adm-card m-0">
            <CardHeader>
              <CardTitle className="text-base">Payment Details</CardTitle>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              <FormField
                control={form.control}
                name="amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Amount</FormLabel>
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
                name="method"
                render={({ field }) => (
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
                )}
              />

              <FormField
                control={form.control}
                name="transaction_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Transaction / Reference ID</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white">
            <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3 md:px-8">
              <Button type="button" variant="ghost" onClick={() => router.push("/dashboard/admissions")}>Cancel</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  "Create Admission"
                )}
              </Button>
            </div>
          </div>
        </form>
      </Form>
    </div>
  )
}
