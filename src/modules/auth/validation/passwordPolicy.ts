import * as yup from "yup";

export const emailFieldSchema = yup
  .string()
  .trim()
  .email("Email inválido")
  .required("Ingresá tu email");

export const passwordFieldSchema = yup
  .string()
  .min(10, "Mínimo 10 caracteres")
  .matches(/[0-9]/, "Incluí un número")
  .matches(/[A-Z]/, "Incluí una mayúscula")
  .matches(/[^A-Za-z0-9]/, "Incluí un carácter especial")
  .required("Ingresá una contraseña");

export const passwordConfirmFieldSchema = yup
  .string()
  .oneOf([yup.ref("password")], "Las contraseñas no coinciden")
  .required("Repetí la contraseña");

export const newPasswordFormSchema = yup.object({
  password: passwordFieldSchema,
  passwordConfirm: passwordConfirmFieldSchema,
});

export type NewPasswordFormValues = yup.InferType<typeof newPasswordFormSchema>;
