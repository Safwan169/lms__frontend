// src/features/user/userApi.ts
import { baseApi } from "../../lib/baseApi";
import type { EndpointBuilder } from "@reduxjs/toolkit/query";

type LoginByEmail = {
  password: string;
  email: string;
  phone?: never;
};

type LoginByPhone = {
  password: string;
  phone: string;
  email?: never;
};

export type LoginRequest = LoginByEmail | LoginByPhone;

export type ForgotPasswordRequest = {
  email: string;
};

export type ResetPasswordRequest = {
  email: string;
  otp: string;
  new_password: string;
};

export type CreateBatchRequest = {
  class_id: string;
  name: string;
  section?: string;
  capacity: number;
  fee?: string;
  start_date?: string;
  end_date?: string;
  status?: "ACTIVE" | "ARCHIVED";
};

export type UpdateBatchRequest = {
  class_id?: string;
  name?: string;
  section?: string;
  capacity?: number;
  fee?: string;
  start_date?: string;
  end_date?: string;
  status?: "ACTIVE" | "ARCHIVED";
};

export type ManualAdmissionRequest = {
  student_id?: string;
  student_name: string;
  student_email?: string;
  student_phone: string;
  class_id: string;
  batch_id: string;
  amount: string;
  discount?: string;
  payment_method: "CASH" | "MFS" | "POS" | "ONLINE";
  parent_phone?: string;
};

export type GetAdmissionsParams = {
  page?: number;
  limit?: number;
  search?: string;
  student_id?: string;
  class_id?: string;
  batch_id?: string;
};

export type UpdateAdmissionRequest = {
  class_id?: string;
  batch_id?: string;
  status?: string;
};

export type GetStudentProfilesParams = {
  tenantId: number | string;
  page?: number;
  limit?: number;
  search?: string;
  user_id?: string;
  student_id?: string;
};

export type UpdateStudentProfileRequest = {
  full_name?: string;
  phone?: string;
  email?: string;
  gender?: string;
  dob?: string;
  address?: string;
  father_name?: string;
  mother_name?: string;
  parent_phone?: string;
  class_id?: string;
  batch_id?: string;
  session?: string;
  status?: string;
  status_reason?: string;
  status_effective_date?: string;
};

export type CreateClassRequest = {
  name: string;
  description?: string;
  subject?: string;
  level?: string;
};

export type GetClassesParams = {
  tenantId: number | string;
  page?: number;
  limit?: number;
  search?: string;
  subject?: string;
  level?: string;
};

export type GetBatchesParams = {
  tenantId: number | string;
  page?: number;
  limit?: number;
  search?: string;
  class_id?: string;
  min_fee?: number | string;
  max_fee?: number | string;
  start_date_from?: string;
  start_date_to?: string;
};

export const userApi = baseApi.injectEndpoints({
  endpoints: (builder: EndpointBuilder<any, any, any>) => ({
    getProfile: builder.query<any, void>({
      query: () => "/api/auth/me",
      providesTags: ["User"]
    }),
    login: builder.mutation<any, LoginRequest>({
      query: (body: LoginRequest) => ({ url: "/api/auth/login", method: "POST", body }),
      invalidatesTags: ["User"]
    }),
    logout: builder.mutation<any, void>({
      query: () => ({ url: "/api/auth/logout", method: "POST" }),
      invalidatesTags: ["User"]
    }),
    forgotPassword: builder.mutation<any, ForgotPasswordRequest>({
      query: (body: ForgotPasswordRequest) => ({ url: "/api/auth/forgot-password", method: "POST", body })
    }),
    resetPassword: builder.mutation<any, ResetPasswordRequest>({
      query: (body: ResetPasswordRequest) => ({ url: "/api/auth/reset-password", method: "POST", body })
    }),
    createBatch: builder.mutation<any, { tenantId: number | string; batch: CreateBatchRequest }>({
      query: ({ tenantId, batch }) => ({ url: `/api/tenants/${tenantId}/batches`, method: "POST", body: batch }),
      invalidatesTags: ["User"]
    }),
    createClass: builder.mutation<any, { tenantId: number | string; classData: CreateClassRequest }>({
      query: ({ tenantId, classData }) => ({ url: `/api/tenants/${tenantId}/classes`, method: "POST", body: classData }),
      invalidatesTags: ["User"]
    }),
    getClasses: builder.query<any, GetClassesParams>({
      query: ({ tenantId, page = 1, limit = 10, search, subject, level }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (subject) params.set("subject", subject);
        if (level) params.set("level", level);
        return `/api/tenants/${tenantId}/classes?${params.toString()}`;
      },
      providesTags: ["User"]
    }),
    getBatches: builder.query<any, GetBatchesParams>({
      query: ({ tenantId, page = 1, limit = 10, search, class_id, min_fee, max_fee, start_date_from, start_date_to }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (class_id) params.set("class_id", class_id);
        if (min_fee) params.set("min_fee", String(min_fee));
        if (max_fee) params.set("max_fee", String(max_fee));
        if (start_date_from) params.set("start_date_from", start_date_from);
        if (start_date_to) params.set("start_date_to", start_date_to);
        return `/api/tenants/${tenantId}/batches?${params.toString()}`;
      },
      providesTags: ["User"]
    }),
    getBatch: builder.query<any, { tenantId: number | string; batchId: number | string }>({
      query: ({ tenantId, batchId }) => `/api/tenants/${tenantId}/batches/${batchId}`,
      providesTags: ["User"]
    }),
    updateBatch: builder.mutation<any, { tenantId: number | string; batchId: number | string; batch: UpdateBatchRequest }>({
      query: ({ tenantId, batchId, batch }) => ({ url: `/api/tenants/${tenantId}/batches/${batchId}`, method: "PATCH", body: batch }),
      invalidatesTags: ["User"]
    }),
    deleteBatch: builder.mutation<any, { tenantId: number | string; batchId: number | string }>({
      query: ({ tenantId, batchId }) => ({ url: `/api/tenants/${tenantId}/batches/${batchId}`, method: "DELETE" }),
      invalidatesTags: ["User"]
    }),
    updateClass: builder.mutation<any, { tenantId: number | string; classId: number | string; classData: CreateClassRequest }>({

      query: ({ tenantId, classId, classData }) => ({ url: `/api/tenants/${tenantId}/classes/${classId}`, method: "PATCH", body: classData }),
      invalidatesTags: ["User"]
    }),
    createManualAdmission: builder.mutation<any, ManualAdmissionRequest>({
      query: (body) => ({ url: "/api/admissions/manual", method: "POST", body }),
      invalidatesTags: ["User"]
    }),
    getAdmissions: builder.query<any, GetAdmissionsParams>({
      query: ({ page = 1, limit = 10, search, student_id, class_id, batch_id }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (student_id) params.set("student_id", student_id);
        if (class_id) params.set("class_id", class_id);
        if (batch_id) params.set("batch_id", batch_id);
        return `/api/admissions?${params.toString()}`;
      },
      providesTags: ["User"]
    }),
    updateAdmission: builder.mutation<any, { admissionId: number | string; data: UpdateAdmissionRequest }>({
      query: ({ admissionId, data }) => ({ url: `/api/admissions/${admissionId}`, method: "PATCH", body: data }),
      invalidatesTags: ["User"]
    }),
    getStudentProfiles: builder.query<any, GetStudentProfilesParams>({
      query: ({ tenantId, page = 1, limit = 10, search, user_id, student_id }) => {
        const params = new URLSearchParams();
        params.set("page", String(page));
        params.set("limit", String(limit));
        if (search) params.set("search", search);
        if (user_id) params.set("user_id", user_id);
        if (student_id) params.set("student_id", student_id);
        return `/api/tenants/${tenantId}/student-profiles?${params.toString()}`;
      },
      providesTags: ["User"]
    }),
    getStudentProfile: builder.query<any, { tenantId: number | string; profileId: number | string }>({
      query: ({ tenantId, profileId }) => `/api/tenants/${tenantId}/student-profiles/${profileId}`,
      providesTags: ["User"]
    }),
    updateStudentProfile: builder.mutation<any, { tenantId: number | string; profileId: number | string; data: UpdateStudentProfileRequest }>({
      query: ({ tenantId, profileId, data }) => ({ url: `/api/tenants/${tenantId}/student-profiles/${profileId}`, method: "PATCH", body: data }),
      invalidatesTags: ["User"]
    }),
    register:builder.mutation({
      query:(body)=>({url:"/auth/register",method:"POST",body}),
      invalidatesTags:["User"]
    })
  }),
  overrideExisting: true
});

export const {
  useGetProfileQuery,
  useLoginMutation,
  useLogoutMutation,
  useForgotPasswordMutation,
  useResetPasswordMutation,
  useCreateBatchMutation,
  useCreateClassMutation,
  useGetClassesQuery,
  useGetBatchesQuery,
  useGetBatchQuery,
  useUpdateBatchMutation,
  useDeleteBatchMutation,
  useUpdateClassMutation,
  useCreateManualAdmissionMutation,
  useGetAdmissionsQuery,
  useUpdateAdmissionMutation,
  useGetStudentProfilesQuery,
  useGetStudentProfileQuery,
  useUpdateStudentProfileMutation,
  useRegisterMutation
} = userApi;
