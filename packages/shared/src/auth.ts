import { z } from "zod";

const emailSchema = z.string().trim().toLowerCase().pipe(z.email("Enter a valid email"));

export const registerInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  email: emailSchema,
  password: z.string().min(8, "Use at least 8 characters").max(128, "Use at most 128 characters"),
});

export const loginInputSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Password is required").max(128),
});

export type RegisterInput = z.input<typeof registerInputSchema>;
export type LoginInput = z.input<typeof loginInputSchema>;

export type PublicUser = {
  id: string;
  email: string;
  name: string;
};
