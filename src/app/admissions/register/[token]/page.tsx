"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useParams } from "next/navigation"
import { useForm } from "react-hook-form"
import { zodResolver } from "@hookform/resolvers/zod"
import { Check, Loader2, X } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Textarea } from "@/components/ui/textarea"

const schema = z
  .object({
    full_name: z.string().trim().min(1, "Full name is required"),
    dob: z.string().min(1, "Date of birth is required"),
    gender: z.enum(["Male", "Female", "Other"], {
      message: "Gender is required",
    }),
    address: z.string().trim().min(1, "Address is required"),
    father_name: z.string().trim().min(1, "Father name is required"),
    mother_name: z.string().trim().min(1, "Mother name is required"),
    parent_phone: z.string().trim().min(1, "Parent phone is required"),
    parent_nid: z.string().optional(),
    photo: z.custom<File>((value) => value instanceof File, {
      message: "Photo is required",
    }),
    documents: z.array(z.custom<File>((value) => value instanceof File)).min(1, "At least 1 document is required"),
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirm_password: z.string().min(1, "Confirm password is required"),
  })
  .refine((data) => data.password === data.confirm_password, {
    path: ["confirm_password"],
    message: "Passwords do not match",
  })

type FormValues = z.infer<typeof schema>

type TokenState = "checking" | "valid" | "invalid"

const STEP_FIELDS: Record<number, (keyof FormValues)[]> = {
  1: ["full_name", "dob", "gender", "address"],
  2: ["father_name", "mother_name", "parent_phone", "parent_nid", "photo", "documents"],
  3: ["password", "confirm_password"],
}

function getPasswordStrength(password: string) {
  let score = 0
  if (password.length >= 8) score += 1
  if (/[A-Z]/.test(password)) score += 1
  if (/[a-z]/.test(password)) score += 1
  if (/[0-9]/.test(password)) score += 1
  if (/[^A-Za-z0-9]/.test(password)) score += 1
  return score
}

export default function AdmissionsRegisterByTokenPage() {
  const params = useParams<{ token: string }>()
  const token = params?.token ?? ""

  const [tokenState, setTokenState] = useState<TokenState>("checking")
  const [step, setStep] = useState<1 | 2 | 3>(1)
  const [photoPreview, setPhotoPreview] = useState<string | null>(null)
  const [documentFiles, setDocumentFiles] = useState<File[]>([])
  const [isSubmittingFinal, setIsSubmittingFinal] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [applicationId, setApplicationId] = useState<string | null>(null)

  const form = useForm<FormValues>({
    resolver: zodResolver(schema),
    mode: "onChange",
    defaultValues: {
      full_name: "",
      dob: "",
      gender: undefined,
      address: "",
      father_name: "",
      mother_name: "",
      parent_phone: "",
      parent_nid: "",
      documents: [],
      password: "",
      confirm_password: "",
    },
  })

  const passwordValue = form.watch("password") ?? ""
  const passwordStrength = getPasswordStrength(passwordValue)

  useEffect(() => {
    let mounted = true

    const verifyToken = async () => {
      if (!token) {
        if (mounted) setTokenState("invalid")
        return
      }

      try {
        const res = await fetch(`/admissions/register/${token}`, { cache: "no-store" })
        if (!res.ok) {
          if (mounted) setTokenState("invalid")
          return
        }

        if (mounted) setTokenState("valid")
      } catch {
        if (mounted) setTokenState("invalid")
      }
    }

    verifyToken()

    return () => {
      mounted = false
      if (photoPreview) {
        URL.revokeObjectURL(photoPreview)
      }
    }
  }, [token, photoPreview])

  const onPhotoChange = (file: File | null) => {
    if (photoPreview) URL.revokeObjectURL(photoPreview)

    if (file) {
      form.setValue("photo", file, { shouldValidate: true })
      setPhotoPreview(URL.createObjectURL(file))
      return
    }

    setPhotoPreview(null)
    form.setError("photo", { message: "Photo is required" })
  }

  const onDocumentsChange = (files: File[]) => {
    setDocumentFiles(files)
    form.setValue("documents", files, { shouldValidate: true })
  }

  const removeDocument = (index: number) => {
    const next = documentFiles.filter((_, i) => i !== index)
    onDocumentsChange(next)
  }

  const goNext = async () => {
    const isValid = await form.trigger(STEP_FIELDS[step])
    if (!isValid) return
    if (step < 3) setStep((prev) => (prev + 1) as 2 | 3)
  }

  const goBack = () => {
    if (step > 1) setStep((prev) => (prev - 1) as 1 | 2)
  }

  const onSubmit = async (values: FormValues) => {
    setIsSubmittingFinal(true)

    try {
      const body = new FormData()
      body.append("full_name", values.full_name)
      body.append("dob", values.dob)
      body.append("gender", values.gender)
      body.append("address", values.address)
      body.append("father_name", values.father_name)
      body.append("mother_name", values.mother_name)
      body.append("parent_phone", values.parent_phone)
      body.append("parent_nid", values.parent_nid ?? "")
      body.append("password", values.password)
      body.append("confirm_password", values.confirm_password)
      body.append("photo", values.photo)
      values.documents.forEach((file) => body.append("documents", file))

      const res = await fetch(`/admissions/register/${token}`, {
        method: "POST",
        body,
      })

      if (!res.ok) {
        const errorData = await res.json().catch(() => null)
        toast.error(errorData?.message || "Registration failed. Please try again.")
        return
      }

      const data = await res.json().catch(() => null)
      const id = data?.applicationId || data?.application_id || data?.id || ""
      setApplicationId(String(id || ""))
      setSubmitted(true)
    } catch {
      toast.error("Registration failed. Please try again.")
    } finally {
      setIsSubmittingFinal(false)
    }
  }

  const stepMeta = [
    { id: 1, label: "Student Info" },
    { id: 2, label: "Parent & Documents" },
    { id: 3, label: "Set Password" },
  ] as const

  const submitButton = useMemo(() => {
    if (isSubmittingFinal) {
      return (
        <Button type="submit" disabled>
          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          Submitting...
        </Button>
      )
    }

    return <Button type="submit">Complete Registration</Button>
  }, [isSubmittingFinal])

  if (tokenState === "checking") {
    return (
      <div className="min-h-screen bg-slate-50 p-6 flex items-center justify-center">
        <Card className="w-full max-w-3xl">
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Checking registration link...
          </CardContent>
        </Card>
      </div>
    )
  }

  if (tokenState === "invalid") {
    return (
      <div className="min-h-screen p-6 bg-slate-50 flex items-center justify-center">
        <Alert variant="destructive" className="max-w-xl">
          <AlertTitle>This registration link has expired or is invalid.</AlertTitle>
          <AlertDescription>
            Please contact the school to request a new link.
          </AlertDescription>
        </Alert>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen p-6 bg-slate-50 flex items-center justify-center">
        <Card className="w-full max-w-xl">
          <CardContent className="pt-6 space-y-4">
            <Alert variant="success">
              <AlertTitle>Registration complete!</AlertTitle>
              <AlertDescription>
                Registration complete! Please proceed to pay your admission fee.
              </AlertDescription>
            </Alert>

            <Button asChild>
              <Link href={`/admissions/${applicationId || "unknown"}/pay`}>Pay Admission Fee</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen p-6 bg-slate-50">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>Admission Registration</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            <div className="flex flex-wrap items-center gap-2">
              {stepMeta.map((item) => {
                const isActive = step === item.id
                const isCompleted = step > item.id

                return (
                  <div
                    key={item.id}
                    className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm ${
                      isActive
                        ? "border-blue-600 bg-blue-50 text-blue-700"
                        : isCompleted
                          ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                          : "border-slate-300 bg-white text-slate-600"
                    }`}
                  >
                    {isCompleted ? <Check className="h-4 w-4" /> : <span>{item.id}</span>}
                    <span>{item.label}</span>
                  </div>
                )
              })}
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                {step === 1 && (
                  <>
                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Student full name" {...field} />
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
                        <FormItem>
                          <FormLabel>Gender</FormLabel>
                          <FormControl>
                            <RadioGroup
                              value={field.value}
                              onValueChange={field.onChange}
                              name="gender"
                            >
                              <RadioGroupItem id="gender-male" value="Male">Male</RadioGroupItem>
                              <RadioGroupItem id="gender-female" value="Female">Female</RadioGroupItem>
                              <RadioGroupItem id="gender-other" value="Other">Other</RadioGroupItem>
                            </RadioGroup>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="address"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Address</FormLabel>
                          <FormControl>
                            <Textarea placeholder="Full address" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                {step === 2 && (
                  <>
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
                      <FormLabel>Photo Upload</FormLabel>
                      <FormControl>
                        <Input
                          type="file"
                          accept="image/*"
                          onChange={(event) => {
                            const file = event.target.files?.[0] ?? null
                            onPhotoChange(file)
                          }}
                        />
                      </FormControl>
                      {photoPreview ? (
                        <div className="mt-2">
                          <img
                            src={photoPreview}
                            alt="Student preview"
                            className="h-28 w-28 rounded-lg border object-cover"
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
                          accept=".pdf,.jpg,.png"
                          multiple
                          onChange={(event) => {
                            const files = Array.from(event.target.files ?? [])
                            onDocumentsChange(files)
                          }}
                        />
                      </FormControl>

                      {documentFiles.length > 0 ? (
                        <ul className="mt-2 space-y-2">
                          {documentFiles.map((file, index) => (
                            <li key={`${file.name}-${index}`} className="flex items-center justify-between rounded-md border px-3 py-2 text-sm">
                              <span className="truncate">{file.name}</span>
                              <button
                                type="button"
                                className="ml-3 text-muted-foreground hover:text-destructive"
                                onClick={() => removeDocument(index)}
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
                  </>
                )}

                {step === 3 && (
                  <>
                    <FormField
                      control={form.control}
                      name="password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <div className="mt-2 space-y-1">
                            <div className="h-2 w-full rounded-full bg-slate-200">
                              <div
                                className={`h-2 rounded-full transition-all ${
                                  passwordStrength <= 2
                                    ? "bg-red-500"
                                    : passwordStrength <= 4
                                      ? "bg-yellow-500"
                                      : "bg-emerald-500"
                                }`}
                                style={{ width: `${(passwordStrength / 5) * 100}%` }}
                              />
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {passwordStrength <= 2
                                ? "Weak password"
                                : passwordStrength <= 4
                                  ? "Medium password"
                                  : "Strong password"}
                            </p>
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="confirm_password"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Confirm Password</FormLabel>
                          <FormControl>
                            <Input type="password" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </>
                )}

                <div className="flex items-center justify-between gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={goBack} disabled={step === 1 || isSubmittingFinal}>
                    Back
                  </Button>

                  {step < 3 ? (
                    <Button type="button" onClick={goNext}>
                      Next
                    </Button>
                  ) : (
                    submitButton
                  )}
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
