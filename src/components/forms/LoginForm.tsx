// src/components/forms/LoginForm.tsx
"use client";

import React from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { loginSchema, type LoginFormData } from "@/schemas";
import { useLoginMutation } from "@/features/user/userApi";
import { useAuth } from "@/context/AuthContext";

export default function LoginForm() {
  const { register, handleSubmit, formState } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema)
  });

  const [loginApi, { isLoading }] = useLoginMutation();
  const { login } = useAuth();

  const onSubmit = async (data: LoginFormData) => {
    try {
      const payload = data.identifier.includes("@")
        ? { email: data.identifier, password: data.password }
        : { phone: data.identifier, password: data.password };

      const res = await loginApi(payload).unwrap();
      // expected response: { token, user }
      login({ token: res.token, user: res.user });
    } catch (err) {
      // RTK Query will surface error and axios/toast will handle showing message
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 max-w-md">
      <div>
        <label>Email or Phone</label>
        <input {...register("identifier")} className="w-full p-2 border rounded" />
        {formState.errors.identifier && <p className="text-red-500">{formState.errors.identifier.message}</p>}
      </div>
      <div>
        <label>Password</label>
        <input type="password" {...register("password")} className="w-full p-2 border rounded" />
        {formState.errors.password && <p className="text-red-500">{formState.errors.password.message}</p>}
      </div>
      <button type="submit" className="px-4 py-2 bg-slate-800 text-white rounded" disabled={isLoading}>
        {isLoading ? "Logging..." : "Login"}
      </button>
    </form>
  );
}
