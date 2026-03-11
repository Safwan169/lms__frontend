// src/features/user/userApi.ts
import { baseApi } from "../../lib/baseApi";
import type { EndpointBuilder } from "@reduxjs/toolkit/query";
export const userApi = baseApi.injectEndpoints({
  endpoints: (builder: EndpointBuilder<any, any, any>) => ({
    getProfile: builder.query<any, void>({
      query: () => "/auth/profile",
      providesTags: ["User"]
    }),
    login: builder.mutation<any, { email: string; password: string }>({
      query: (body: { email: string; password: string }) => ({ url: "/auth/login", method: "POST", body }),
      invalidatesTags: ["User"]
    }),
    register:builder.mutation({
      query:(body)=>({url:"/auth/register",method:"POST",body}),
      invalidatesTags:["User"]
    })
  }),
  overrideExisting: true
});

export const { useGetProfileQuery, useLoginMutation,useRegisterMutation } = userApi;
