// Form validation (zod 4). Messages are copy keys; the UI shows t(message).
import { z } from 'zod';

const email = z.string().trim().toLowerCase().pipe(z.email('auth.errors.email'));
const newPassword = z.string().min(12, 'auth.errors.passwordShort').max(72, 'auth.errors.generic');

export const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, 'auth.errors.fullName').max(120, 'auth.errors.fullName'),
    email,
    gradeLevel: z.enum(['11', '12'], { error: 'auth.errors.gradeLevel' }),
    section: z.string().trim().min(1, 'auth.errors.section').max(60, 'auth.errors.section'),
    classAdviser: z.string().trim().min(2, 'auth.errors.adviser').max(120, 'auth.errors.adviser'),
    password: newPassword,
    confirmPassword: z.string(),
  })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'auth.errors.passwordMatch',
  });

export const loginSchema = z.object({
  email,
  password: z.string().min(1, 'auth.errors.invalidCredentials'),
});

export const emailOnlySchema = z.object({ email });

export const newPasswordSchema = z
  .object({ password: newPassword, confirmPassword: z.string() })
  .refine((v) => v.password === v.confirmPassword, {
    path: ['confirmPassword'],
    message: 'auth.errors.passwordMatch',
  });

export const totpSchema = z.object({
  code: z
    .string()
    .trim()
    .regex(/^\d{6}$/, 'staff.errors.codeFormat'),
});

/** Turns a zod error into { fieldName: copyKey } (first issue per field). */
export function fieldErrors(zodError) {
  const out = {};
  for (const issue of zodError.issues) {
    const key = String(issue.path[0] ?? 'form');
    if (!out[key]) out[key] = issue.message;
  }
  return out;
}
