import { useState } from 'react';
import { fieldErrors } from './schemas.js';

/** Minimal form state: values, per-field errors (copy keys), and a validate() using a zod schema. */
export function useForm(initial) {
  const [values, setValues] = useState(initial);
  const [errors, setErrors] = useState({});
  const bind = (name) => ({
    name,
    value: values[name],
    onChange: (e) => setValues((v) => ({ ...v, [name]: e.target.value })),
  });
  const validate = (schema) => {
    const r = schema.safeParse(values);
    if (r.success) {
      setErrors({});
      return r.data;
    }
    setErrors(fieldErrors(r.error));
    return null;
  };
  return { values, setValues, errors, setErrors, bind, validate };
}
