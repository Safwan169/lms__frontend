import api from "@/lib/api";

export interface AssignTeacherPayload {
  subject_id: string;
  teacher_id: string;
}

export interface AssignTeacherResponse {
  success: boolean;
  message: string;
  data?: any;
}

/**
 * Assign a teacher to a batch-subject combination
 * POST /api/tenants/{tenantId}/batches/{batchId}/teachers
 */
export const assignTeacherToBatch = async (
  tenantId: string,
  batchId: string,
  payload: AssignTeacherPayload
): Promise<AssignTeacherResponse> => {
  try {
    const response = await api.post(
      `/api/tenants/${tenantId}/batches/${batchId}/teachers`,
      payload
    );
    return {
      success: true,
      message: response.data?.message || "Teacher assigned successfully",
      data: response.data,
    };
  } catch (error: any) {
    const errorMessage =
      error.response?.data?.message || "Failed to assign teacher";
    return {
      success: false,
      message: errorMessage,
    };
  }
};

/**
 * Get batches for a tenant
 */
export const getBatches = async (tenantId: string) => {
  try {
    const response = await api.get(`/api/tenants/${tenantId}/batches`);
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error("Failed to fetch batches:", error);
    return [];
  }
};

/**
 * Get subjects for a batch
 * Backend returns { source: 'CLASS_SUBJECTS' | 'BATCH_OVERRIDE', subjects: [...] }
 */
export const getBatchSubjects = async (tenantId: string, batchId: string) => {
  try {
    const response = await api.get(
      `/api/tenants/${tenantId}/batches/${batchId}/subjects`
    );
    const data = response.data?.data || response.data;
    return data?.subjects ?? (Array.isArray(data) ? data : []);
  } catch (error) {
    console.error("Failed to fetch batch subjects:", error);
    return [];
  }
};

/**
 * Get teachers for a tenant
 */
export const getTenantTeachers = async (
  tenantId: string,
  params?: { search?: string; limit?: number }
) => {
  try {
    const response = await api.get(`/api/tenants/${tenantId}/teachers`, {
      params: { limit: 100, ...params },
    });
    // Response is paginated: { data: [...], total, page, limit, totalPages }
    return response.data?.data ?? [];
  } catch (error) {
    console.error("Failed to fetch teachers:", error);
    return [];
  }
};

/**
 * Get all teacher-subject mappings for a batch
 * Returns BatchTeacherMappingView[]: { subject_id, subject_name, teacher_id, teacher_name, teacher_email }
 */
export const getBatchTeachers = async (tenantId: string, batchId: string) => {
  try {
    const response = await api.get(
      `/api/tenants/${tenantId}/batches/${batchId}/teachers`
    );
    return Array.isArray(response.data) ? response.data : (response.data?.data ?? []);
  } catch (error) {
    console.error("Failed to fetch batch teachers:", error);
    return [];
  }
};

export interface TeacherAssignmentView {
  assignment_id: string;
  is_active: boolean;
  assigned_at: string;
  removed_at: string | null;
  teacher: {
    user_id: string;
    teacher_id: string;
    name: string;
    email: string;
    phone?: string;
    is_active: boolean;
  };
  class: {
    id: string;
    name: string;
    code?: string;
    group?: string;
    level?: string;
  };
  batch: {
    id: string;
    name: string;
    section?: string;
    shift?: string;
    status?: string;
    start_date?: string;
    end_date?: string | null;
  };
  subject: {
    id: string;
    name: string;
    code?: string;
  };
}

export interface TeacherAssignmentListParams {
  page?: number;
  limit?: number;
  search?: string;
  status?: "active" | "inactive";
  batchId?: string;
  classId?: string;
  subjectId?: string;
  teacherId?: string;
}

export interface TeacherAssignmentListResponse {
  data: TeacherAssignmentView[];
  meta: {
    total: number;
    page: number;
    limit: number;
    totalPages: number;
    hasNext: boolean;
    hasPrev: boolean;
  };
}

/**
 * Get all teacher assignments for a tenant (paginated)
 * GET /tenants/:tenantId/teachers/assign
 */
export const getAllTeacherAssignments = async (
  tenantId: string,
  params: TeacherAssignmentListParams = {}
): Promise<TeacherAssignmentListResponse> => {
  try {
    const cleanParams: Record<string, string | number> = {
      page: params.page ?? 1,
      limit: params.limit ?? 10,
    };
    if (params.search) cleanParams.search = params.search;
    if (params.status) cleanParams.status = params.status;
    if (params.batchId) cleanParams.batchId = params.batchId;
    if (params.classId) cleanParams.classId = params.classId;
    if (params.subjectId) cleanParams.subjectId = params.subjectId;
    if (params.teacherId) cleanParams.teacherId = params.teacherId;

    const response = await api.get(`/api/tenants/${tenantId}/teachers/assign`, {
      params: cleanParams,
    });
    const payload = response.data;
    return {
      data: Array.isArray(payload?.data) ? payload.data : [],
      meta:
        payload?.meta ?? {
          total: 0,
          page: 1,
          limit: params.limit ?? 10,
          totalPages: 0,
          hasNext: false,
          hasPrev: false,
        },
    };
  } catch (error) {
    console.error("Failed to fetch teacher assignments:", error);
    return {
      data: [],
      meta: {
        total: 0,
        page: 1,
        limit: params.limit ?? 10,
        totalPages: 0,
        hasNext: false,
        hasPrev: false,
      },
    };
  }
};

/**
 * Remove a teacher from a batch subject
 * DELETE /tenants/:tenantId/batches/:batchId/teachers/:subjectId
 */
export const removeTeacherFromBatch = async (
  tenantId: string,
  batchId: string,
  subjectId: string
) => {
  try {
    await api.delete(
      `/api/tenants/${tenantId}/batches/${batchId}/teachers/${subjectId}`
    );
    return { success: true };
  } catch (error: any) {
    return { success: false, message: error.response?.data?.message || "Failed to remove teacher" };
  }
};
