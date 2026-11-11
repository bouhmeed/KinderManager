import Badge from "./Badge";

const STATUS_MAP: Record<string, { label: string; tone: "amber" | "blue" | "teal" | "green" | "red" | "gray" }> = {
  PENDING: { label: "En attente", tone: "amber" },
  APPROVED: { label: "Approuvée", tone: "green" },
  REJECTED: { label: "Rejetée", tone: "red" },
  IN_PROGRESS: { label: "En cours", tone: "blue" },
  READY: { label: "Prête", tone: "teal" },
  COMPLETED: { label: "Terminée", tone: "green" },
  CANCELLED: { label: "Annulée", tone: "gray" },
  UNPAID: { label: "Impayée", tone: "red" },
  PAID: { label: "Payée", tone: "green" },
  PARTIALLY_PAID: { label: "Partiellement payée", tone: "amber" },
  PRESENT: { label: "Présent", tone: "green" },
  ABSENT: { label: "Absent", tone: "red" },
  LATE: { label: "En retard", tone: "amber" },
  EXCUSED: { label: "Excusé", tone: "blue" },
  UNREAD: { label: "Non lu", tone: "blue" },
  READ: { label: "Lu", tone: "gray" },
  ACTIF: { label: "Actif", tone: "green" },
  EXPIRE: { label: "Expiré", tone: "red" },
  SUSPENDU: { label: "Suspendu", tone: "amber" },
  EN_ATTENTE: { label: "En attente", tone: "amber" },
  INSCRIT: { label: "Inscrit", tone: "green" },
  INACTIF: { label: "Inactif", tone: "gray" },
};

export default function StatusBadge({ status }: { status: string }) {
  const entry = STATUS_MAP[status];
  if (!entry) {
    return <Badge>{status}</Badge>;
  }
  return <Badge tone={entry.tone}>{entry.label}</Badge>;
}
