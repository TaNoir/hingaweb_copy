import { describe, it, expect } from 'vitest';
import {
  registerSchema,
  loginSchema,
  newPasswordSchema,
  totpSchema,
  fieldErrors,
} from './schemas.js';

const valid = {
  fullName: 'Ana Reyes',
  email: ' Ana@Example.test ',
  gradeLevel: '12',
  section: 'HUMSS-A',
  classAdviser: 'Mr. Ramon Cruz',
  password: 'a-long-password',
  confirmPassword: 'a-long-password',
};

describe('registerSchema', () => {
  it('accepts a valid form and normalises the email', () => {
    const r = registerSchema.safeParse(valid);
    expect(r.success).toBe(true);
    expect(r.data.email).toBe('ana@example.test');
  });
  it('reports each problem with a copy key', () => {
    const r = registerSchema.safeParse({
      ...valid,
      fullName: 'A',
      email: 'nope',
      gradeLevel: '',
      section: '',
      classAdviser: '',
      password: 'short',
      confirmPassword: 'x',
    });
    expect(fieldErrors(r.error)).toEqual({
      fullName: 'auth.errors.fullName',
      email: 'auth.errors.email',
      gradeLevel: 'auth.errors.gradeLevel',
      section: 'auth.errors.section',
      classAdviser: 'auth.errors.adviser',
      password: 'auth.errors.passwordShort',
    });
  });
  it('requires matching passwords', () => {
    const r = registerSchema.safeParse({ ...valid, confirmPassword: 'different-password' });
    expect(fieldErrors(r.error)).toEqual({ confirmPassword: 'auth.errors.passwordMatch' });
  });
});

describe('other schemas', () => {
  it('validate login, new password, and TOTP code', () => {
    expect(loginSchema.safeParse({ email: 'a@b.test', password: 'x' }).success).toBe(true);
    expect(
      newPasswordSchema.safeParse({ password: '123456789012', confirmPassword: '123456789012' })
        .success,
    ).toBe(true);
    expect(totpSchema.safeParse({ code: '123456' }).success).toBe(true);
    expect(fieldErrors(totpSchema.safeParse({ code: '12a456' }).error)).toEqual({
      code: 'staff.errors.codeFormat',
    });
  });
});
