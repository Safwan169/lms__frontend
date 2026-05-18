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
