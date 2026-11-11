import { z } from "zod";

export const childSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Date de naissance invalide",
  }),
  enrollmentStatus: z.enum(["INSCRIT", "EN_ATTENTE", "INACTIF"], {
    message: "Statut d'inscription invalide",
  }),
  classRoomId: z.number().optional(),
});

export type ChildInput = z.infer<typeof childSchema>;

export const childIdentitySchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  birthDate: z.string().refine((val) => !isNaN(Date.parse(val)), {
    message: "Date de naissance invalide",
  }),
});

export type ChildIdentityInput = z.infer<typeof childIdentitySchema>;

export const guardianSchema = z.object({
  firstName: z.string().min(2, "Le prénom doit contenir au moins 2 caractères"),
  lastName: z.string().min(2, "Le nom doit contenir au moins 2 caractères"),
  phone: z.string().min(10, "Le numéro de téléphone doit contenir au moins 10 caractères"),
  email: z.string().email("Email invalide").optional().or(z.literal("")),
});

export type GuardianInput = z.infer<typeof guardianSchema>;

export const linkGuardianSchema = z.object({
  childId: z.number("ID de l'enfant requis"),
  guardianId: z.number("ID du tuteur requis"),
  isLegalGuardian: z.boolean().default(false),
  isPrimaryContact: z.boolean().default(false),
  relationshipType: z.string().min(1, "Le type de relation est requis"),
});

export type LinkGuardianInput = z.infer<typeof linkGuardianSchema>;
