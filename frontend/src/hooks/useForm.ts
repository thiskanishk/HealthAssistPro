import { useState, useCallback, ChangeEvent } from 'react';
import { z } from 'zod';
import { validateForm } from '../utils/validation';

interface UseFormOptions<T> {
  initialValues: T;
  validationSchema?: z.Schema<T>;
  onSubmit: (values: T) => Promise<void>;
}

interface FormState<T> {
  values: T;
  errors: Partial<Record<keyof T, string>>;
  touched: Partial<Record<keyof T, boolean>>;
  isSubmitting: boolean;
  isValid: boolean;
}

export function useForm<T extends Record<string, any>>({
  initialValues,
  validationSchema,
  onSubmit,
}: UseFormOptions<T>) {
  const [formState, setFormState] = useState<FormState<T>>({
    values: initialValues,
    errors: {},
    touched: {},
    isSubmitting: false,
    isValid: false,
  });

  const validateField = useCallback(
    async (name: keyof T, value: any) => {
      if (!validationSchema) return '';

      try {
        await validationSchema.pick({ [name]: true }).parseAsync({ [name]: value });
        return '';
      } catch (error) {
        if (error instanceof z.ZodError) {
          return error.errors[0].message;
        }
        return 'Invalid value';
      }
    },
    [validationSchema]
  );

  const handleChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value, type } = e.target;
      let newValue = value;

      // Handle different input types
      if (type === 'checkbox') {
        newValue = (e.target as HTMLInputElement).checked;
      } else if (type === 'number') {
        newValue = value === '' ? '' : Number(value);
      }

      const error = await validateField(name as keyof T, newValue);

      setFormState((prev) => ({
        ...prev,
        values: {
          ...prev.values,
          [name]: newValue,
        },
        errors: {
          ...prev.errors,
          [name]: error,
        },
        touched: {
          ...prev.touched,
          [name]: true,
        },
      }));
    },
    [validateField]
  );

  const handleBlur = useCallback(
    async (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
      const { name, value } = e.target;
      const error = await validateField(name as keyof T, value);

      setFormState((prev) => ({
        ...prev,
        touched: {
          ...prev.touched,
          [name]: true,
        },
        errors: {
          ...prev.errors,
          [name]: error,
        },
      }));
    },
    [validateField]
  );

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      setFormState((prev) => ({ ...prev, isSubmitting: true }));

      if (validationSchema) {
        const validationResult = await validateForm(validationSchema, formState.values);
        
        if (!validationResult.success) {
          setFormState((prev) => ({
            ...prev,
            isSubmitting: false,
            errors: {
              ...prev.errors,
              form: validationResult.error,
            },
          }));
          return;
        }
      }

      try {
        await onSubmit(formState.values);
        setFormState((prev) => ({
          ...prev,
          errors: {},
          touched: {},
          isSubmitting: false,
        }));
      } catch (error) {
        setFormState((prev) => ({
          ...prev,
          isSubmitting: false,
          errors: {
            ...prev.errors,
            form: error instanceof Error ? error.message : 'Form submission failed',
          },
        }));
      }
    },
    [formState.values, validationSchema, onSubmit]
  );

  const setFieldValue = useCallback(
    async (name: keyof T, value: any) => {
      const error = await validateField(name, value);

      setFormState((prev) => ({
        ...prev,
        values: {
          ...prev.values,
          [name]: value,
        },
        errors: {
          ...prev.errors,
          [name]: error,
        },
        touched: {
          ...prev.touched,
          [name]: true,
        },
      }));
    },
    [validateField]
  );

  const resetForm = useCallback(() => {
    setFormState({
      values: initialValues,
      errors: {},
      touched: {},
      isSubmitting: false,
      isValid: false,
    });
  }, [initialValues]);

  return {
    values: formState.values,
    errors: formState.errors,
    touched: formState.touched,
    isSubmitting: formState.isSubmitting,
    isValid: Object.keys(formState.errors).length === 0,
    handleChange,
    handleBlur,
    handleSubmit,
    setFieldValue,
    resetForm,
  };
} 