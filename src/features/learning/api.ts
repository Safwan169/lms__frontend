/**
 * Learning API — Content & Assessment endpoints
 *
 * Strategy: Try the real backend first.
 * If the backend is unavailable (network error) OR returns 404/405/501/503,
 * fall back to in-memory mock data automatically.
 * When a real 200/201 response comes, mock is never used.
 */

import api from "@/lib/api"

// ─── Mock fallback decision ────────────────────────────────────────────────────

function shouldUseMockFallback(error: any): boolean {
  if (!error.response) return true // network error — backend is down
  const status = error.response?.status
  return [404, 405, 501, 503].includes(status)
}

async function withMockFallback<T>(
  realFn: () => Promise<T>,
  mockFn: () => T
): Promise<T> {
  try {
    return await realFn()
  } catch (err: any) {
    if (shouldUseMockFallback(err)) {
      return mockFn()
    }
    throw err
  }
}

// ─── Mock stores ──────────────────────────────────────────────────────────────

let mockMediaStore: Array<{
  id: string
  url: string
  mime_type: string
  file_name: string
  size: number
  created_at: string
}> = [
  {
    id: "media-001",
    url: "https://example.com/files/chapter1.pdf",
    mime_type: "application/pdf",
    file_name: "chapter1.pdf",
    size: 204800,
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
]

let mockContentStore: Array<{
  id: string
  title: string
  description: string
  content_type: "PDF" | "VIDEO_LINK" | "ONLINE_CLASS"
  class_id: string
  class_name: string
  batch_id: string
  batch_name: string
  subject_id: string
  subject_name: string
  file: { id: string; url: string; mime_type: string } | null
  external_url: string | null
  meet_link: string | null
  start_at: string | null
  end_at: string | null
  visibility: "BATCH_ONLY" | "CLASS_ALL_BATCHES"
  publish_status: "DRAFT" | "PUBLISHED"
  teacher: { id: string; name: string }
  created_at: string
}> = [
  {
    id: "content-001",
    title: "Chapter 1: Introduction to Algebra",
    description: "Basic algebra concepts for beginners",
    content_type: "PDF",
    class_id: "class-001",
    class_name: "Class 9",
    batch_id: "batch-001",
    batch_name: "Batch A",
    subject_id: "sub-001",
    subject_name: "Mathematics",
    file: { id: "media-001", url: "https://example.com/files/chapter1.pdf", mime_type: "application/pdf" },
    external_url: null,
    meet_link: null,
    start_at: null,
    end_at: null,
    visibility: "BATCH_ONLY",
    publish_status: "PUBLISHED",
    teacher: { id: "teacher-001", name: "Mr. Rahman" },
    created_at: new Date(Date.now() - 86400000 * 5).toISOString(),
  },
  {
    id: "content-002",
    title: "Science Chapter 3 Video Lecture",
    description: "Video lecture on Newton's Laws",
    content_type: "VIDEO_LINK",
    class_id: "class-001",
    class_name: "Class 9",
    batch_id: "batch-001",
    batch_name: "Batch A",
    subject_id: "sub-002",
    subject_name: "Science",
    file: null,
    external_url: "https://www.youtube.com/watch?v=dummyvideo",
    meet_link: null,
    start_at: null,
    end_at: null,
    visibility: "CLASS_ALL_BATCHES",
    publish_status: "PUBLISHED",
    teacher: { id: "teacher-001", name: "Mr. Rahman" },
    created_at: new Date(Date.now() - 86400000 * 3).toISOString(),
  },
  {
    id: "content-003",
    title: "Live Online Class — Trigonometry",
    description: "Interactive session on trigonometry",
    content_type: "ONLINE_CLASS",
    class_id: "class-001",
    class_name: "Class 9",
    batch_id: "batch-001",
    batch_name: "Batch A",
    subject_id: "sub-001",
    subject_name: "Mathematics",
    file: null,
    external_url: null,
    meet_link: "https://meet.google.com/abc-defg-hij",
    start_at: new Date(Date.now() + 86400000).toISOString(),
    end_at: new Date(Date.now() + 86400000 + 3600000).toISOString(),
    visibility: "BATCH_ONLY",
    publish_status: "DRAFT",
    teacher: { id: "teacher-001", name: "Mr. Rahman" },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

let mockAssessmentStore: Array<{
  id: string
  title: string
  description: string
  assessment_type: "ASSIGNMENT" | "QUIZ" | "EXAM"
  class_id: string
  class_name: string
  batch_id: string
  batch_name: string
  subject_id: string
  subject_name: string
  total_marks: number
  passing_marks: number
  visibility: string
  publish_status: "DRAFT" | "PUBLISHED"
  instructions: string
  deadline: string | null
  submission_count: number
  teacher: { id: string; name: string }
  created_at: string
}> = [
  {
    id: "assess-001",
    title: "Mid-Term Math Assignment",
    description: "Chapter 1–4 problem set",
    assessment_type: "ASSIGNMENT",
    class_id: "class-001",
    class_name: "Class 9",
    batch_id: "batch-001",
    batch_name: "Batch A",
    subject_id: "sub-001",
    subject_name: "Mathematics",
    total_marks: 100,
    passing_marks: 40,
    visibility: "BATCH_ONLY",
    publish_status: "PUBLISHED",
    instructions: "Solve all problems and submit as PDF",
    deadline: new Date(Date.now() + 86400000 * 7).toISOString(),
    submission_count: 12,
    teacher: { id: "teacher-001", name: "Mr. Rahman" },
    created_at: new Date(Date.now() - 86400000 * 2).toISOString(),
  },
  {
    id: "assess-002",
    title: "Science Quiz — Chapter 3",
    description: "Multiple choice quiz on Newton's Laws",
    assessment_type: "QUIZ",
    class_id: "class-001",
    class_name: "Class 9",
    batch_id: "batch-001",
    batch_name: "Batch A",
    subject_id: "sub-002",
    subject_name: "Science",
    total_marks: 30,
    passing_marks: 15,
    visibility: "CLASS_ALL_BATCHES",
    publish_status: "PUBLISHED",
    instructions: "Answer within 20 minutes",
    deadline: new Date(Date.now() + 86400000 * 2).toISOString(),
    submission_count: 5,
    teacher: { id: "teacher-001", name: "Mr. Rahman" },
    created_at: new Date(Date.now() - 86400000).toISOString(),
  },
]

let mockSubmissionStore: Array<{
  id: string
  assessment_id: string
  student: { id: string; name: string }
  file_url: string | null
  answer_link: string | null
  comment: string | null
  submitted_at: string
  marks_obtained: number | null
  marks_feedback: string | null
  is_marked: boolean
}> = [
  {
    id: "sub-001",
    assessment_id: "assess-001",
    student: { id: "student-001", name: "Rahim Uddin" },
    file_url: "https://example.com/submissions/rahim_math.pdf",
    answer_link: null,
    comment: "Done all problems",
    submitted_at: new Date(Date.now() - 86400000).toISOString(),
    marks_obtained: 85,
    marks_feedback: "Excellent work! Minor mistakes in Q5.",
    is_marked: true,
  },
  {
    id: "sub-002",
    assessment_id: "assess-001",
    student: { id: "student-002", name: "Karim Hossain" },
    file_url: null,
    answer_link: "https://docs.google.com/document/d/karim_math",
    comment: null,
    submitted_at: new Date(Date.now() - 43200000).toISOString(),
    marks_obtained: null,
    marks_feedback: null,
    is_marked: false,
  },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function generateId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

function wrapData<T>(data: T) {
  return { data }
}

// ─── Media ────────────────────────────────────────────────────────────────────

export async function uploadMedia(tenantId: string, file: File) {
  return withMockFallback(
    async () => {
      const formData = new FormData()
      formData.append("file", file)
      return api.post(`/tenants/${tenantId}/media/upload`, formData)
    },
    () => {
      const mock = {
        id: generateId("media"),
        url: URL.createObjectURL(file),
        mime_type: file.type,
        file_name: file.name,
        size: file.size,
        created_at: new Date().toISOString(),
      }
      mockMediaStore.push(mock)
      return wrapData(mock)
    }
  )
}

// ─── Teacher Content ──────────────────────────────────────────────────────────

export async function createContent(tenantId: string, payload: Record<string, unknown>) {
  return withMockFallback(
    () => api.post(`/tenants/${tenantId}/content`, payload),
    () => {
      const newItem = {
        id: generateId("content"),
        title: String(payload.title ?? "Untitled"),
        description: String(payload.description ?? ""),
        content_type: (payload.content_type as any) ?? "PDF",
        class_id: String(payload.class_id ?? ""),
        class_name: String(payload.class_id ?? ""),
        batch_id: String(payload.batch_id ?? ""),
        batch_name: String(payload.batch_id ?? ""),
        subject_id: String(payload.subject_id ?? ""),
        subject_name: String(payload.subject_id ?? ""),
        file: payload.file_id
          ? { id: String(payload.file_id), url: "#", mime_type: "application/pdf" }
          : null,
        external_url: (payload.external_url as string) ?? null,
        meet_link: (payload.meet_link as string) ?? null,
        start_at: (payload.start_at as string) ?? null,
        end_at: (payload.end_at as string) ?? null,
        visibility: (payload.visibility as any) ?? "BATCH_ONLY",
        publish_status: (payload.publish_status as any) ?? "DRAFT",
        teacher: { id: "mock-teacher", name: "Current Teacher" },
        created_at: new Date().toISOString(),
      }
      mockContentStore.push(newItem)
      return wrapData(newItem)
    }
  )
}

export async function getTeacherContent(
  tenantId: string,
  params: Record<string, unknown> = {}
) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/content`, { params }),
    () =>
      wrapData({
        items: mockContentStore,
        meta: { total: mockContentStore.length, page: 1, limit: 50 },
      })
  )
}

export async function getTeacherContentById(tenantId: string, contentId: string) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/content/${contentId}`),
    () => {
      const item = mockContentStore.find(c => c.id === contentId)
      if (!item) throw Object.assign(new Error("Not found"), { response: { status: 404 } })
      return wrapData(item)
    }
  )
}

export async function updateContent(
  tenantId: string,
  contentId: string,
  payload: Record<string, unknown>
) {
  return withMockFallback(
    () => api.put(`/tenants/${tenantId}/content/${contentId}`, payload),
    () => {
      const idx = mockContentStore.findIndex(c => c.id === contentId)
      if (idx === -1) throw Object.assign(new Error("Not found"), { response: { status: 404 } })
      mockContentStore[idx] = { ...mockContentStore[idx], ...(payload as any) }
      return wrapData(mockContentStore[idx])
    }
  )
}

export async function deleteContent(tenantId: string, contentId: string) {
  return withMockFallback(
    () => api.delete(`/tenants/${tenantId}/content/${contentId}`),
    () => {
      mockContentStore = mockContentStore.filter(c => c.id !== contentId)
      return wrapData({ success: true })
    }
  )
}

// ─── Student Content ──────────────────────────────────────────────────────────

export async function getStudentContent(
  tenantId: string,
  params: Record<string, unknown> = {}
) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/student/content`, { params }),
    () => {
      const published = mockContentStore.filter(c => c.publish_status === "PUBLISHED")
      return wrapData({
        items: published,
        meta: { total: published.length, page: 1, limit: 50 },
      })
    }
  )
}

export async function getStudentContentById(tenantId: string, contentId: string) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/student/content/${contentId}`),
    () => {
      const item = mockContentStore.find(c => c.id === contentId && c.publish_status === "PUBLISHED")
      if (!item) throw Object.assign(new Error("Not found"), { response: { status: 404 } })
      return wrapData(item)
    }
  )
}

// ─── Teacher Assessments ──────────────────────────────────────────────────────

export async function createAssessment(tenantId: string, payload: Record<string, unknown>) {
  return withMockFallback(
    () => api.post(`/tenants/${tenantId}/assessments`, payload),
    () => {
      const newItem = {
        id: generateId("assess"),
        title: String(payload.title ?? "Untitled"),
        description: String(payload.description ?? ""),
        assessment_type: (payload.assessment_type as any) ?? "ASSIGNMENT",
        class_id: String(payload.class_id ?? ""),
        class_name: String(payload.class_id ?? ""),
        batch_id: String(payload.batch_id ?? ""),
        batch_name: String(payload.batch_id ?? ""),
        subject_id: String(payload.subject_id ?? ""),
        subject_name: String(payload.subject_id ?? ""),
        total_marks: Number(payload.total_marks ?? 100),
        passing_marks: Number(payload.passing_marks ?? 40),
        visibility: String(payload.visibility ?? "BATCH_ONLY"),
        publish_status: (payload.publish_status as any) ?? "DRAFT",
        instructions: String(payload.instructions ?? ""),
        deadline: (payload.deadline as string) ?? null,
        submission_count: 0,
        teacher: { id: "mock-teacher", name: "Current Teacher" },
        created_at: new Date().toISOString(),
      }
      mockAssessmentStore.push(newItem)
      return wrapData(newItem)
    }
  )
}

export async function getTeacherAssessments(
  tenantId: string,
  params: Record<string, unknown> = {}
) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/assessments`, { params }),
    () =>
      wrapData({
        items: mockAssessmentStore,
        meta: { total: mockAssessmentStore.length, page: 1, limit: 50 },
      })
  )
}

export async function getTeacherAssessmentById(tenantId: string, assessmentId: string) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/assessments/${assessmentId}`),
    () => {
      const item = mockAssessmentStore.find(a => a.id === assessmentId)
      if (!item) throw Object.assign(new Error("Not found"), { response: { status: 404 } })
      return wrapData(item)
    }
  )
}

export async function updateAssessment(
  tenantId: string,
  assessmentId: string,
  payload: Record<string, unknown>
) {
  return withMockFallback(
    () => api.put(`/tenants/${tenantId}/assessments/${assessmentId}`, payload),
    () => {
      const idx = mockAssessmentStore.findIndex(a => a.id === assessmentId)
      if (idx === -1) throw Object.assign(new Error("Not found"), { response: { status: 404 } })
      mockAssessmentStore[idx] = { ...mockAssessmentStore[idx], ...(payload as any) }
      return wrapData(mockAssessmentStore[idx])
    }
  )
}

export async function deleteAssessment(tenantId: string, assessmentId: string) {
  return withMockFallback(
    () => api.delete(`/tenants/${tenantId}/assessments/${assessmentId}`),
    () => {
      mockAssessmentStore = mockAssessmentStore.filter(a => a.id !== assessmentId)
      return wrapData({ success: true })
    }
  )
}

// ─── Student Assessments ──────────────────────────────────────────────────────

export async function getStudentAssessments(
  tenantId: string,
  params: Record<string, unknown> = {}
) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/student/assessments`, { params }),
    () => {
      const published = mockAssessmentStore.filter(a => a.publish_status === "PUBLISHED")
      return wrapData({
        items: published,
        meta: { total: published.length, page: 1, limit: 50 },
      })
    }
  )
}

export async function getStudentAssessmentById(tenantId: string, assessmentId: string) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/student/assessments/${assessmentId}`),
    () => {
      const item = mockAssessmentStore.find(a => a.id === assessmentId && a.publish_status === "PUBLISHED")
      if (!item) throw Object.assign(new Error("Not found"), { response: { status: 404 } })
      return wrapData(item)
    }
  )
}

export async function submitAssessment(
  tenantId: string,
  assessmentId: string,
  payload: Record<string, unknown>
) {
  return withMockFallback(
    () => api.post(`/tenants/${tenantId}/student/assessments/${assessmentId}/submit`, payload),
    () => {
      const newSub = {
        id: generateId("sub"),
        assessment_id: assessmentId,
        student: { id: "mock-student", name: "Current Student" },
        file_url: (payload.file_id as string) ?? null,
        answer_link: (payload.answer_link as string) ?? null,
        comment: (payload.comment as string) ?? null,
        submitted_at: new Date().toISOString(),
        marks_obtained: null,
        marks_feedback: null,
        is_marked: false,
      }
      mockSubmissionStore.push(newSub)
      const aIdx = mockAssessmentStore.findIndex(a => a.id === assessmentId)
      if (aIdx !== -1) mockAssessmentStore[aIdx].submission_count += 1
      return wrapData(newSub)
    }
  )
}

export async function getStudentMark(tenantId: string, assessmentId: string) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/student/assessments/${assessmentId}/mark`),
    () => {
      const sub = mockSubmissionStore.find(
        s => s.assessment_id === assessmentId && s.is_marked
      )
      if (!sub) return wrapData(null)
      return wrapData({
        marks_obtained: sub.marks_obtained,
        marks_feedback: sub.marks_feedback,
        submitted_at: sub.submitted_at,
      })
    }
  )
}

// ─── Teacher: Submissions & Marking ──────────────────────────────────────────

export async function getSubmissions(tenantId: string, assessmentId: string) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/assessments/${assessmentId}/submissions`),
    () => {
      const subs = mockSubmissionStore.filter(s => s.assessment_id === assessmentId)
      return wrapData({ submissions: subs })
    }
  )
}

export async function getSubmissionById(
  tenantId: string,
  assessmentId: string,
  submissionId: string
) {
  return withMockFallback(
    () => api.get(`/tenants/${tenantId}/assessments/${assessmentId}/submissions/${submissionId}`),
    () => {
      const sub = mockSubmissionStore.find(
        s => s.assessment_id === assessmentId && s.id === submissionId
      )
      if (!sub) throw Object.assign(new Error("Not found"), { response: { status: 404 } })
      return wrapData(sub)
    }
  )
}

export async function markSubmission(
  tenantId: string,
  assessmentId: string,
  submissionId: string,
  payload: { marks_obtained: number; feedback?: string | null }
) {
  return withMockFallback(
    () => api.post(`/tenants/${tenantId}/assessments/${assessmentId}/submissions/${submissionId}/mark`, payload),
    () => {
      const idx = mockSubmissionStore.findIndex(
        s => s.assessment_id === assessmentId && s.id === submissionId
      )
      if (idx === -1) throw Object.assign(new Error("Not found"), { response: { status: 404 } })
      mockSubmissionStore[idx] = {
        ...mockSubmissionStore[idx],
        marks_obtained: payload.marks_obtained,
        marks_feedback: payload.feedback ?? null,
        is_marked: true,
      }
      return wrapData(mockSubmissionStore[idx])
    }
  )
}

export async function updateMark(
  tenantId: string,
  assessmentId: string,
  submissionId: string,
  payload: { marks_obtained: number; feedback?: string | null }
) {
  return withMockFallback(
    () => api.put(`/tenants/${tenantId}/assessments/${assessmentId}/submissions/${submissionId}/mark`, payload),
    () => {
      const idx = mockSubmissionStore.findIndex(
        s => s.assessment_id === assessmentId && s.id === submissionId
      )
      if (idx === -1) throw Object.assign(new Error("Not found"), { response: { status: 404 } })
      mockSubmissionStore[idx] = {
        ...mockSubmissionStore[idx],
        marks_obtained: payload.marks_obtained,
        marks_feedback: payload.feedback ?? null,
        is_marked: true,
      }
      return wrapData(mockSubmissionStore[idx])
    }
  )
}

// ─── Named export object (convenience) ────────────────────────────────────────

export const learningApi = {
  uploadMedia,
  createContent,
  getTeacherContent,
  getTeacherContentById,
  updateContent,
  deleteContent,
  getStudentContent,
  getStudentContentById,
  createAssessment,
  getTeacherAssessments,
  getTeacherAssessmentById,
  updateAssessment,
  deleteAssessment,
  getStudentAssessments,
  getStudentAssessmentById,
  submitAssessment,
  getStudentMark,
  getSubmissions,
  getSubmissionById,
  markSubmission,
  updateMark,
}
