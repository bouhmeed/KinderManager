import type {
  ActivityCategory,
  ClubEnrollmentStatus,
  ParticipationStatus,
  TimetableSlotKind,
  Weekday,
} from "@/generated/prisma/enums";

export const WEEKDAYS: Weekday[] = [
  "MONDAY",
  "TUESDAY",
  "WEDNESDAY",
  "THURSDAY",
  "FRIDAY",
  "SATURDAY",
  "SUNDAY",
];

export const WEEKDAY_LABELS: Record<Weekday, string> = {
  MONDAY: "Lundi",
  TUESDAY: "Mardi",
  WEDNESDAY: "Mercredi",
  THURSDAY: "Jeudi",
  FRIDAY: "Vendredi",
  SATURDAY: "Samedi",
  SUNDAY: "Dimanche",
};

export const SLOT_KINDS: TimetableSlotKind[] = [
  "ACTIVITY",
  "MEAL",
  "NAP",
  "BREAK",
  "ARRIVAL",
  "DEPARTURE",
  "OTHER",
];

export const SLOT_KIND_LABELS: Record<TimetableSlotKind, string> = {
  ACTIVITY: "Activité",
  MEAL: "Repas",
  NAP: "Sieste",
  BREAK: "Pause",
  ARRIVAL: "Arrivée",
  DEPARTURE: "Départ",
  OTHER: "Autre",
};

export const ACTIVITY_CATEGORIES: ActivityCategory[] = [
  "EDUCATIONAL",
  "CARE",
  "CLUB",
  "OTHER",
];

export const ACTIVITY_CATEGORY_LABELS: Record<ActivityCategory, string> = {
  EDUCATIONAL: "Éducative",
  CARE: "Soins",
  CLUB: "Club",
  OTHER: "Autre",
};

export const PARTICIPATION_STATUS_LABELS: Record<ParticipationStatus, string> = {
  PENDING: "En attente",
  PRESENT: "Présent",
  PARTIAL: "Partiel",
  ABSENT: "Absent",
  CANCELLED: "Annulé",
};

export const ENROLLMENT_STATUS_LABELS: Record<ClubEnrollmentStatus, string> = {
  PENDING: "En attente",
  APPROVED: "Approuvée",
  REJECTED: "Refusée",
  CANCELLED: "Annulée",
};
