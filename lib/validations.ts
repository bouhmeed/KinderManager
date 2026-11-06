import { z } from "zod";

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  role: z.literal("PARENT"),
  guardianId: z.number("Guardian ID is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;

export const classRoomSchema = z.object({
  name: z.string().min(1, "Le nom de la classe est requis"),
  ageGroup: z.coerce.number().int("Le groupe d'âge doit être un entier"),
  capacity: z.coerce
    .number()
    .int("La capacité doit être un entier")
    .min(0, "La capacité ne peut pas être négative"),
});

export type ClassRoomInput = z.infer<typeof classRoomSchema>;

export const educatorCreateSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(1, "Le numéro de téléphone est requis"),
  password: z.string().min(6, "Le mot de passe doit contenir au moins 6 caractères"),
});

export type EducatorCreateInput = z.infer<typeof educatorCreateSchema>;

export const educatorUpdateSchema = z.object({
  name: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  email: z.string().email("Adresse email invalide"),
  phone: z.string().min(1, "Le numéro de téléphone est requis"),
  isActive: z.boolean().default(true),
  password: z
    .string()
    .min(6, "Le mot de passe doit contenir au moins 6 caractères")
    .optional()
    .or(z.literal("")),
});

export type EducatorUpdateInput = z.infer<typeof educatorUpdateSchema>;
