"use client"

import { useMemo, useState } from "react"
import { zodResolver } from "@hookform/resolvers/zod"
import { type FieldErrors, useForm } from "react-hook-form"
import { Loader2, Upload, UserRound } from "lucide-react"
import toast from "react-hot-toast"
import { z } from "zod"

import api from "@/lib/api"
import { useAuth } from "@/context/AuthContext"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form"
import { Input } from "@/components/ui/input"
import { Select } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"

const profileSchema = z.object({
  address: z.string().trim().optional(),
  date_of_birth: z.string().optional(),
  gender: z.string().optional(),
  blood_group: z.string().trim().optional(),
  guardian_name: z.string().trim().optional(),
  guardian_phone: z.string().trim().optional(),
  school_name: z.string().trim().optional(),
  avatar_url: z.string().trim().optional(),
})

type ProfileFormValues = z.infer<typeof profileSchema>

type MediaUploadResponse = {
  id?: string
  url?: string
  file_url?: string
  secure_url?: string
  location?: string
  mime_type?: string
  original_name?: string
  file_size_bytes?: number
  public_id?: string
  created_at?: string
  data?: {
    url?: string
    file_url?: string
    secure_url?: string
    location?: string
    file?: {
      url?: string
      file_url?: string
      secure_url?: string
      location?: string
    }
  }
  file?: {
    url?: string
    file_url?: string
    secure_url?: string
    location?: string
  }
  result?: {
    url?: string
    file_url?: string
    secure_url?: string
    location?: string
  }
}

function extractMediaUrl(responseData: MediaUploadResponse | null) {
  if (!responseData) return ""

  const visited = new Set<unknown>()
  const candidateKeys = new Set([
    "url",
    "file_url",
    "secure_url",
    "location",
    "path",
    "filePath",
    "file_path",
  ])

  const collectCandidates = (value: unknown): string[] => {
    if (!value || typeof value !== "object") return []
    if (visited.has(value)) return []
    visited.add(value)

    if (Array.isArray(value)) {
      return value.flatMap((item) => collectCandidates(item))
    }

    return Object.entries(value as Record<string, unknown>).flatMap(([key, nestedValue]) => {
      const matchesKey = candidateKeys.has(key)
      const directValue =
        matchesKey && typeof nestedValue === "string" && !nestedValue.startsWith("blob:")
          ? [nestedValue]
          : []

      return [...directValue, ...collectCandidates(nestedValue)]
    })
  }

  const uploadedUrl = collectCandidates(responseData).find(
    (value) => typeof value === "string" && value.trim().length > 0
  )
  return uploadedUrl?.trim() ?? ""
}

function toDateInputValue(value?: string) {
  if (!value) return ""
  return value.includes("T") ? value.split("T")[0] : value
}

function sanitizeAvatarUrl(value?: string) {
  const normalized = String(value ?? "").trim()
  if (!normalized) return ""
  if (normalized.startsWith("blob:") || normalized.startsWith("data:")) {
    return ""
  }
  return normalized
}

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value))
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("Failed to load image for cropping"))
    image.src = src
  })
}

function getCropLayout(
  imageWidth: number,
  imageHeight: number,
  frameSize: number,
  zoom: number,
  offsetXPercent: number,
  offsetYPercent: number
) {
  const baseScale = Math.max(frameSize / imageWidth, frameSize / imageHeight)
  const scale = baseScale * zoom
  const scaledWidth = imageWidth * scale
  const scaledHeight = imageHeight * scale
  const maxOffsetX = Math.max(0, (scaledWidth - frameSize) / 2)
  const maxOffsetY = Math.max(0, (scaledHeight - frameSize) / 2)
  const offsetX = (offsetXPercent / 100) * maxOffsetX
  const offsetY = (offsetYPercent / 100) * maxOffsetY
  const left = (frameSize - scaledWidth) / 2 + offsetX
  const top = (frameSize - scaledHeight) / 2 + offsetY

  return { left, top, scaledWidth, scaledHeight }
}

async function createCroppedAvatarFile(
  sourceUrl: string,
  fileName: string,
  zoom: number,
  offsetXPercent: number,
  offsetYPercent: number
) {
  const outputSize = 512
  const image = await loadImage(sourceUrl)
  const canvas = document.createElement("canvas")
  canvas.width = outputSize
  canvas.height = outputSize

  const context = canvas.getContext("2d")
  if (!context) {
    throw new Error("Canvas is not available for image cropping")
  }

  const layout = getCropLayout(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    outputSize,
    zoom,
    offsetXPercent,
    offsetYPercent
  )

  context.clearRect(0, 0, outputSize, outputSize)
  context.drawImage(image, layout.left, layout.top, layout.scaledWidth, layout.scaledHeight)

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob((value) => resolve(value), "image/png")
  })

  if (!blob) {
    throw new Error("Failed to create cropped image")
  }

  return new File([blob], fileName.replace(/\.[^.]+$/, "") + "-cropped.png", { type: "image/png" })
}

function cleanPayload(values: ProfileFormValues) {
  const payload: Record<string, string> = {}

  const addIfPresent = (key: keyof ProfileFormValues) => {
    const rawValue = values[key]
    const value = key === "avatar_url" ? sanitizeAvatarUrl(rawValue) : rawValue
    if (typeof value === "string" && value.trim().length > 0) {
      payload[key] = value.trim()
    }
  }

  addIfPresent("gender")
  addIfPresent("address")
  addIfPresent("date_of_birth")
  addIfPresent("blood_group")
  addIfPresent("avatar_url")
  addIfPresent("guardian_name")
  addIfPresent("guardian_phone")
  addIfPresent("school_name")

  return payload
}

export default function ProfileManagementPage() {
  const { user, updateUser } = useAuth()
  const [avatarFile, setAvatarFile] = useState<File | null>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [cropDialogOpen, setCropDialogOpen] = useState(false)
  const [cropSourceUrl, setCropSourceUrl] = useState<string | null>(null)
  const [cropSourceFileName, setCropSourceFileName] = useState("avatar.png")
  const [cropZoom, setCropZoom] = useState(1)
  const [cropX, setCropX] = useState(0)
  const [cropY, setCropY] = useState(0)
  const [cropImageSize, setCropImageSize] = useState<{ width: number; height: number } | null>(null)
  const [isDraggingCrop, setIsDraggingCrop] = useState(false)
  const [dragStartPoint, setDragStartPoint] = useState<{ x: number; y: number } | null>(null)
  const [dragStartOffset, setDragStartOffset] = useState<{ x: number; y: number } | null>(null)
  const [isApplyingCrop, setIsApplyingCrop] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false)

  const tenantId =
    (user as any)?.tenant_id ??
    (user as any)?.tenantId ??
    (user as any)?.tenant_id_fk ??
    (user as any)?.tenant?.tenant_id ??
    (user as any)?.tenant?.id ??
    null

  const userId =
    (user as any)?.user_id ??
    (user as any)?.userId ??
    (user as any)?.id ??
    (user as any)?.uuid ??
    null

  const normalizedRole = String(
    (user as any)?.role ??
    (Array.isArray((user as any)?.roles) ? (user as any)?.roles[0] : (user as any)?.roles) ??
    ""
  ).toLowerCase()

  const isStudent = normalizedRole === "student"
  const displayName = String((user as any)?.name ?? "User")
  const displayEmail = String((user as any)?.email ?? "-")
  const displayPhone = String((user as any)?.phone ?? "-")
  const [currentAvatarUrl, setCurrentAvatarUrl] = useState(() =>
    sanitizeAvatarUrl(
      (user as any)?.avatar_url ??
      (user as any)?.avatarUrl ??
      (user as any)?.profile?.avatar_url ??
      ""
    )
  )
  const currentAvatar = currentAvatarUrl

  const form = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      address: String((user as any)?.address ?? (user as any)?.profile?.address ?? ""),
      date_of_birth: toDateInputValue(
        (user as any)?.date_of_birth ?? (user as any)?.profile?.date_of_birth ?? ""
      ),
      gender: String((user as any)?.gender ?? (user as any)?.profile?.gender ?? ""),
      blood_group: String((user as any)?.blood_group ?? (user as any)?.profile?.blood_group ?? ""),
      guardian_name: String((user as any)?.guardian_name ?? (user as any)?.profile?.guardian_name ?? ""),
      guardian_phone: String((user as any)?.guardian_phone ?? (user as any)?.profile?.guardian_phone ?? ""),
      school_name: String((user as any)?.school_name ?? (user as any)?.profile?.school_name ?? ""),
      avatar_url: sanitizeAvatarUrl(currentAvatarUrl),
    },
  })

  const previewAvatar = avatarFile ? avatarPreview || currentAvatar || "" : currentAvatar || avatarPreview || ""
  const tenantLabel = useMemo(() => {
    return String(
      (user as any)?.tenant?.school_name ??
      (user as any)?.tenant?.name ??
      (user as any)?.tenant_name ??
      "Tenant"
    )
  }, [user])
  const cropPreviewLayout = cropImageSize
    ? getCropLayout(cropImageSize.width, cropImageSize.height, 256, cropZoom, cropX, cropY)
    : null

  const handleCropPointerDown = (clientX: number, clientY: number) => {
    setIsDraggingCrop(true)
    setDragStartPoint({ x: clientX, y: clientY })
    setDragStartOffset({ x: cropX, y: cropY })
  }

  const handleCropPointerMove = (clientX: number, clientY: number) => {
    if (!isDraggingCrop || !dragStartPoint || !dragStartOffset || !cropImageSize) return

    const previewSize = 256
    const baseScale = Math.max(previewSize / cropImageSize.width, previewSize / cropImageSize.height)
    const scale = baseScale * cropZoom
    const scaledWidth = cropImageSize.width * scale
    const scaledHeight = cropImageSize.height * scale
    const maxOffsetXPx = Math.max(0, (scaledWidth - previewSize) / 2)
    const maxOffsetYPx = Math.max(0, (scaledHeight - previewSize) / 2)

    const deltaX = clientX - dragStartPoint.x
    const deltaY = clientY - dragStartPoint.y

    const deltaXPercent = maxOffsetXPx === 0 ? 0 : (deltaX / maxOffsetXPx) * 100
    const deltaYPercent = maxOffsetYPx === 0 ? 0 : (deltaY / maxOffsetYPx) * 100

    setCropX(clamp(dragStartOffset.x + deltaXPercent, -100, 100))
    setCropY(clamp(dragStartOffset.y + deltaYPercent, -100, 100))
  }

  const stopCropDragging = () => {
    setIsDraggingCrop(false)
    setDragStartPoint(null)
    setDragStartOffset(null)
  }

  const handleAvatarChange = (file: File | null) => {
    if (!file) {
      if (cropSourceUrl) {
        URL.revokeObjectURL(cropSourceUrl)
      }
      setCropSourceUrl(null)
      setCropImageSize(null)
      return
    }

    const nextUrl = URL.createObjectURL(file)
    setCropSourceFileName(file.name)
    setCropSourceUrl(nextUrl)
    setAvatarFile(file)
    if (avatarPreview) {
      URL.revokeObjectURL(avatarPreview)
    }
    setAvatarPreview(nextUrl)
    setCropZoom(1)
    setCropX(0)
    setCropY(0)
    setCropDialogOpen(true)

    void loadImage(nextUrl)
      .then((image) => {
        setCropImageSize({
          width: image.naturalWidth || image.width,
          height: image.naturalHeight || image.height,
        })
      })
      .catch((error: any) => {
        toast.error(error?.message || "Failed to open image cropper")
      })
  }

  const applyAvatarCrop = async () => {
    if (!cropSourceUrl) return

    setIsApplyingCrop(true)
    try {
      const croppedFile = await createCroppedAvatarFile(
        cropSourceUrl,
        cropSourceFileName,
        cropZoom,
        cropX,
        cropY
      )

      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }

      const croppedPreview = URL.createObjectURL(croppedFile)
      setAvatarFile(croppedFile)
      setAvatarPreview(croppedPreview)
      setCropDialogOpen(false)
      toast.success("Image cropped and ready to upload")
    } catch (error: any) {
      toast.error(error?.message || "Failed to crop image")
    } finally {
      setIsApplyingCrop(false)
    }
  }

  const uploadAvatarIfNeeded = async () => {
    if (!avatarFile) {
      return sanitizeAvatarUrl(form.getValues("avatar_url") || currentAvatar || "")
    }

    setIsUploadingAvatar(true)
    try {
      const formData = new FormData()
      formData.append("file", avatarFile, avatarFile.name)

      const uploadPaths = [
        tenantId ? `/api/tenants/${tenantId}/media/upload` : null,
        "/api/media/upload",
        "/api/upload",
      ].filter(Boolean) as string[]

      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("access_token")
          : null

      let uploadErrorMessage = "Image upload failed"

      for (const path of uploadPaths) {
        const response = await fetch(
          `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:8089"}${path}`,
          {
            method: "POST",
            headers: {
              accept: "*/*",
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          }
        )

        const responseData = (await response.json().catch(() => null)) as MediaUploadResponse | { message?: string } | null

        if (!response.ok) {
          uploadErrorMessage = (responseData as { message?: string } | null)?.message || `Image upload failed on ${path}`
          continue
        }

        const uploadedUrl = extractMediaUrl((responseData as MediaUploadResponse | null) ?? null)
        if (!uploadedUrl) {
          uploadErrorMessage = `Upload succeeded but file URL missing on ${path}`
          continue
        }

      const finalUrl = sanitizeAvatarUrl(uploadedUrl)
      form.setValue("avatar_url", finalUrl, { shouldDirty: true })
      setCurrentAvatarUrl(finalUrl)
      updateUser({
        avatar_url: finalUrl,
        avatarUrl: finalUrl,
        profile: {
          avatar_url: finalUrl,
        },
      })
      if (avatarPreview) {
        URL.revokeObjectURL(avatarPreview)
      }
        setAvatarPreview(null)
        setAvatarFile(null)
        return finalUrl
      }

      throw new Error(uploadErrorMessage)
    } catch (error: any) {
      throw error
    } finally {
      setIsUploadingAvatar(false)
    }
  }

  const onSubmit = async (values: ProfileFormValues) => {
    if (!tenantId || !userId) {
      toast.error("User/Tenant id is missing. Trying with available session values.")
    }

    setIsSaving(true)
    try {
      const uploadedAvatarUrl = await uploadAvatarIfNeeded()
      const payload = cleanPayload(
        {
          ...values,
          avatar_url: sanitizeAvatarUrl(uploadedAvatarUrl || values.avatar_url || ""),
        }
      )

      const params: Record<string, string | number> = {}
      if (userId) params.userId = userId
      if (tenantId) params.tenantId = tenantId

      await api.patch("/api/user-profiles", payload, {
        params,
      })

      updateUser({
        ...payload,
        ...(payload.avatar_url
          ? {
              avatar_url: payload.avatar_url,
              avatarUrl: payload.avatar_url,
            }
          : {}),
        profile: {
          ...payload,
        },
      })

      if (payload.avatar_url) {
        setCurrentAvatarUrl(payload.avatar_url)
        if (avatarPreview) {
          URL.revokeObjectURL(avatarPreview)
        }
        setAvatarPreview(null)
      }
      setAvatarFile(null)
      toast.success("Profile updated successfully")
    } catch (error: any) {
      toast.error(error?.message || "Failed to update profile")
    } finally {
      setIsSaving(false)
    }
  }

  const onInvalidSubmit = (errors: FieldErrors<ProfileFormValues>) => {
    console.error("[Profile Submit] Validation blocked submit", errors)
    toast.error("Form validation blocked submit. Check required/invalid fields.")
  }

  return (
    <div className="adm-root space-y-5 pb-24">
      <div>
        <h1 className="text-2xl font-semibold">Profile Management</h1>
        <p className="text-sm text-muted-foreground">Update your personal profile details and profile photo</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[320px,1fr]">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Account Summary</CardTitle>
            <CardDescription>Basic account details from your current session</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-4">
              {previewAvatar ? (
                <img
                  src={previewAvatar}
                  alt="Profile preview"
                  className="h-20 w-20 rounded-full border object-cover"
                />
              ) : (
                <div className="flex h-20 w-20 items-center justify-center rounded-full border bg-muted">
                  <UserRound className="h-8 w-8 text-muted-foreground" />
                </div>
              )}
              <div className="min-w-0">
                <p className="text-lg font-semibold">{displayName}</p>
                <p className="truncate text-sm text-muted-foreground">{displayEmail}</p>
                <Badge variant="info" className="mt-2 capitalize">{normalizedRole || "user"}</Badge>
              </div>
            </div>

            <div className="space-y-2 rounded-lg border p-4 text-sm">
              <div><span className="text-muted-foreground">Phone:</span> {displayPhone}</div>
              <div><span className="text-muted-foreground">Tenant:</span> {tenantLabel}</div>
              <div><span className="text-muted-foreground">User ID:</span> {userId ? String(userId) : "-"}</div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Profile Photo</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(event) => handleAvatarChange(event.target.files?.[0] ?? null)}
                disabled={isSaving}
              />
              <p className="text-xs text-muted-foreground">
                Choose an image, crop it to a square avatar, then save your profile.
              </p>
            </div>
          </CardContent>
        </Card>

        <Form {...form}>
          <form id="profile-management-form" onSubmit={form.handleSubmit(onSubmit, onInvalidSubmit)} className="space-y-5">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Basic Profile</CardTitle>
                <CardDescription>These fields are sent to the unified profile update API</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-4 md:grid-cols-2">
                <FormField
                  control={form.control}
                  name="gender"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Gender</FormLabel>
                      <FormControl>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <option value="">Select gender</option>
                          <option value="MALE">Male</option>
                          <option value="FEMALE">Female</option>
                          <option value="OTHER">Other</option>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="blood_group"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Blood Group</FormLabel>
                      <FormControl>
                        <Select value={field.value ?? ""} onValueChange={field.onChange}>
                          <option value="">Select blood group</option>
                          <option value="A+">A+</option>
                          <option value="A-">A-</option>
                          <option value="B+">B+</option>
                          <option value="B-">B-</option>
                          <option value="AB+">AB+</option>
                          <option value="AB-">AB-</option>
                          <option value="O+">O+</option>
                          <option value="O-">O-</option>
                        </Select>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="date_of_birth"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Date of Birth</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} value={field.value ?? ""} />
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
                        <Textarea {...field} value={field.value ?? ""} placeholder="Mirpur, Dhaka" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>

            {isStudent ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Student Profile Details</CardTitle>
                  <CardDescription>Student-specific fields supported by the unified profile API</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-4 md:grid-cols-2">
                  <FormField
                    control={form.control}
                    name="guardian_name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Abdur Rahman" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="guardian_phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Guardian Phone</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="+8801712345678" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="school_name"
                    render={({ field }) => (
                      <FormItem className="md:col-span-2">
                        <FormLabel>School Name</FormLabel>
                        <FormControl>
                          <Input {...field} value={field.value ?? ""} placeholder="Mirpur Govt. High School" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Notes</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    This profile form currently saves the shared fields supported across roles, plus student-specific fields when the logged-in role is student.
                  </p>
                </CardContent>
              </Card>
            )}
          </form>
        </Form>
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white">
        <div className="mx-auto flex max-w-[1200px] justify-end gap-3 px-4 py-3 md:px-8">
          <Button type="submit" form="profile-management-form" disabled={isSaving || isUploadingAvatar}>
            {isSaving || isUploadingAvatar ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {isUploadingAvatar ? "Uploading image..." : "Saving..."}
              </>
            ) : (
              <>
                <Upload className="mr-2 h-4 w-4" />
                Save Profile
              </>
            )}
          </Button>
        </div>
      </div>

      <Dialog
        open={cropDialogOpen}
        onOpenChange={(open) => {
          if (!isApplyingCrop) {
            setCropDialogOpen(open)
          }
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Crop Profile Photo</DialogTitle>
            <DialogDescription>Adjust the image to fit a square avatar frame before upload.</DialogDescription>
          </DialogHeader>

          <div className="grid gap-6 md:grid-cols-[256px,1fr]">
            <div className="mx-auto h-64 w-64 overflow-hidden rounded-2xl border bg-slate-100">
              {cropSourceUrl && cropPreviewLayout ? (
                <div
                  className={`relative h-full w-full overflow-hidden ${isDraggingCrop ? "cursor-grabbing" : "cursor-grab"}`}
                  onMouseDown={(event) => handleCropPointerDown(event.clientX, event.clientY)}
                  onMouseMove={(event) => handleCropPointerMove(event.clientX, event.clientY)}
                  onMouseUp={stopCropDragging}
                  onMouseLeave={stopCropDragging}
                  onTouchStart={(event) => {
                    const touch = event.touches[0]
                    if (touch) handleCropPointerDown(touch.clientX, touch.clientY)
                  }}
                  onTouchMove={(event) => {
                    const touch = event.touches[0]
                    if (touch) handleCropPointerMove(touch.clientX, touch.clientY)
                  }}
                  onTouchEnd={stopCropDragging}
                >
                  <img
                    src={cropSourceUrl}
                    alt="Crop preview"
                    className="absolute max-w-none select-none pointer-events-none"
                    style={{
                      left: `${cropPreviewLayout.left}px`,
                      top: `${cropPreviewLayout.top}px`,
                      width: `${cropPreviewLayout.scaledWidth}px`,
                      height: `${cropPreviewLayout.scaledHeight}px`,
                    }}
                  />
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-1 ring-black/10" />
                </div>
              ) : (
                <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                  Loading preview...
                </div>
              )}
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium">Zoom</label>
                <Input
                  type="range"
                  min="1"
                  max="3"
                  step="0.01"
                  value={cropZoom}
                  onChange={(event) => setCropZoom(Number(event.target.value))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Horizontal Position</label>
                <Input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={cropX}
                  onChange={(event) => setCropX(Number(event.target.value))}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Vertical Position</label>
                <Input
                  type="range"
                  min="-100"
                  max="100"
                  step="1"
                  value={cropY}
                  onChange={(event) => setCropY(Number(event.target.value))}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Drag the image inside the frame for quick positioning, or use the sliders for fine adjustments.
              </p>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setCropDialogOpen(false)} disabled={isApplyingCrop}>
              Cancel
            </Button>
            <Button type="button" onClick={applyAvatarCrop} disabled={isApplyingCrop || !cropSourceUrl || !cropImageSize}>
              {isApplyingCrop ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Applying...
                </>
              ) : (
                "Apply Crop"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
