"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Loader2 } from "lucide-react"
import { z } from "zod"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"

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

const getDummyBatches = (classId: string): BatchOption[] => {
  return DUMMY_BATCHES_BY_CLASS[classId] ?? [
    { id: `${classId}-a`, name: "Batch A" },
    { id: `${classId}-b`, name: "Batch B" },
  ]
}

const admissionsSchema = z.object({
  student_name: z.string().trim().min(1, "Student name is required"),
  phone: z.string().trim().min(1, "Phone number is required"),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .optional()
    .or(z.literal("")),
  class_id: z.string().min(1, "Class is required"),
  batch_id: z.string().min(1, "Batch is required"),
})

type AdmissionsFormValues = z.infer<typeof admissionsSchema>

export default function AdmissionsApplyPage() {
  const [classes, setClasses] = useState<ClassOption[]>([])
  const [batches, setBatches] = useState<BatchOption[]>([])
  const [isClassesLoading, setIsClassesLoading] = useState(true)
  const [isBatchesLoading, setIsBatchesLoading] = useState(false)
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState(false)

  const form = useForm<AdmissionsFormValues>({
    resolver: zodResolver(admissionsSchema),
    defaultValues: {
      student_name: "",
      phone: "",
      email: "",
      class_id: "",
      batch_id: "",
    },
    mode: "onChange",
  })

  const selectedClassId = form.watch("class_id")
  const isBatchDisabled = useMemo(
    () => !selectedClassId || isBatchesLoading,
    [selectedClassId, isBatchesLoading]
  )

  useEffect(() => {
    let isMounted = true

    const loadClasses = async () => {
      setIsClassesLoading(true)
      try {
        const response = await fetch("/api/classes", { cache: "no-store" })
        if (!response.ok) {
          throw new Error("Failed to load classes")
        }
        const data = await response.json()
        if (!isMounted) return

        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : []

        const mapped = normalized.map((item: any) => ({
          id: String(item.id),
          name: String(item.name ?? item.title ?? `Class ${item.id}`),
        }))

        setClasses(mapped.length > 0 ? mapped : DUMMY_CLASSES)
      } catch {
        if (!isMounted) return
        setClasses(DUMMY_CLASSES)
      } finally {
        if (isMounted) {
          setIsClassesLoading(false)
        }
      }
    }

    loadClasses()

    return () => {
      isMounted = false
    }
  }, [])

  useEffect(() => {
    let isMounted = true

    const loadBatches = async () => {
      if (!selectedClassId) {
        setBatches([])
        form.setValue("batch_id", "")
        return
      }

      setIsBatchesLoading(true)
      form.setValue("batch_id", "")

      try {
        const response = await fetch(`/api/batches?classId=${selectedClassId}`, {
          cache: "no-store",
        })

        if (!response.ok) {
          throw new Error("Failed to load batches")
        }

        const data = await response.json()
        if (!isMounted) return

        const normalized = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : []

        const mapped = normalized.map((item: any) => ({
          id: String(item.id),
          name: String(item.name ?? item.title ?? `Batch ${item.id}`),
        }))

        setBatches(mapped.length > 0 ? mapped : getDummyBatches(selectedClassId))
      } catch {
        if (!isMounted) return
        setBatches(getDummyBatches(selectedClassId))
      } finally {
        if (isMounted) {
          setIsBatchesLoading(false)
        }
      }
    }

    loadBatches()

    return () => {
      isMounted = false
    }
  }, [selectedClassId, form])

  const onSubmit = async (values: AdmissionsFormValues) => {
    setSubmitError(null)
    form.clearErrors("phone")

    const payload = {
      student_name: values.student_name,
      phone: values.phone,
      email: values.email || undefined,
      class_id: values.class_id,
      batch_id: values.batch_id,
    }

    try {
      const response = await fetch("/api/admissions/apply", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      })

      if (response.status === 409) {
        form.setError("phone", {
          type: "server",
          message: "An application with this number already exists",
        })
        return
      }

      if (!response.ok) {
        const data = await response.json().catch(() => null)
        setSubmitError(data?.message || "Submission failed. Please try again.")
        return
      }

      setSubmitted(true)
    } catch {
      setSubmitError("Submission failed. Please check your connection and try again.")
    }
  }

  return (
    <div className="adm-root min-h-screen flex items-start justify-center">
      <Card className="w-full max-w-lg border-[#e8eaf0] shadow-sm">
        <CardHeader>
          <CardTitle className="font-[Lora] text-[1.75rem] text-[#1a1d2e]">
            Admission Application
          </CardTitle>
          <CardDescription className="text-[#9095a8] text-[0.82rem]">
            Class 6-12
          </CardDescription>
        </CardHeader>

        <CardContent>
          {submitted ? (
            <Alert variant="success">
              <AlertDescription>
                Application submitted! You will be notified once reviewed.
              </AlertDescription>
            </Alert>
          ) : (
            <Form {...form}>
              <form className="space-y-4" onSubmit={form.handleSubmit(onSubmit)}>
                <FormField
                  control={form.control}
                  name="student_name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Student Name</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter student full name" {...field} />
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
                      <FormLabel>Phone Number</FormLabel>
                      <FormControl>
                        <Input placeholder="01XXXXXXXXX" {...field} />
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
                      <FormLabel>Email (Optional)</FormLabel>
                      <FormControl>
                        <Input type="email" placeholder="student@example.com" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="class_id"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Class</FormLabel>
                      <FormControl>
                        {isClassesLoading ? (
                          <Skeleton className="h-9 w-full rounded-lg" />
                        ) : (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                          >
                            <option value="">Select class</option>
                            {classes.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
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
                          <Skeleton className="h-9 w-full rounded-lg" />
                        ) : (
                          <Select
                            value={field.value}
                            onValueChange={field.onChange}
                            disabled={isBatchDisabled}
                          >
                            <option value="">
                              {selectedClassId ? "Select batch" : "Select class first"}
                            </option>
                            {batches.map((option) => (
                              <option key={option.id} value={option.id}>
                                {option.name}
                              </option>
                            ))}
                          </Select>
                        )}
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {submitError ? (
                  <Alert variant="destructive">
                    <AlertDescription>{submitError}</AlertDescription>
                  </Alert>
                ) : null}

                <Button type="submit" className="w-full" disabled={form.formState.isSubmitting}>
                  {form.formState.isSubmitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    "Submit Application"
                  )}
                </Button>
              </form>
            </Form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
