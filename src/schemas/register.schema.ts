import z from "zod";

export const register=z.object({
 name: z.string().min(2, "Name must be at least 2 characters"),
 email: z.string().email("Invalid email"),
 password: z.string().min(6, "Password must be at least 6 characters"),
 confirmPassword: z.string().min(6, "Confirm Password must be at least 6 characters")
}).refine((data) => data.password === data.confirmPassword, {
 message: "Passwords do not match",
 path: ["confirmPassword"]
}).refine((data) => /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&]).{6,}$/.test(data.password), {
  message: "Password must include uppercase, lowercase, number & special character",
  path: ["password"], 
});

export type RegisterFormData = z.infer<typeof register>;