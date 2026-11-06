"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth";
import { getParentChildIds } from "@/lib/permissions";
import { parseDay } from "@/lib/dates";

type SessionUser = { id: number; role: string };

function requireAdmin(user: SessionUser) {
  if (user.role !== "ADMIN") {
    throw new Error("Forbidden");
  }
}

function parseAmount(value: string): number | null {
  const n = Number(value);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

const INVOICE_STATUSES = ["UNPAID", "PAID", "CANCELLED"] as const;

// ---------- Plans ----------

export async function getPlans() {
  const user = await requireAuth();
  requireAdmin(user);
  return prisma.subscriptionPlan.findMany({
    orderBy: { name: "asc" },
    include: { _count: { select: { children: true } } },
  });
}

export async function createPlan(formData: FormData) {
  const user = await requireAuth();
  requireAdmin(user);

  const name = ((formData.get("name") as string) || "").trim();
  const startTime = ((formData.get("startTime") as string) || "").trim();
  const endTime = ((formData.get("endTime") as string) || "").trim();
  const price = parseAmount(formData.get("price") as string);

  if (!name || !startTime || !endTime || price === null) {
    return { error: "Tous les champs sont obligatoires" };
  }

  await prisma.subscriptionPlan.create({
    data: { name, startTime, endTime, price },
  });
  return { success: true };
}

export async function deletePlan(id: number) {
  const user = await requireAuth();
  requireAdmin(user);
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }

  const count = await prisma.childSubscription.count({
    where: { planId: id },
  });
  if (count > 0) {
    return { error: "Ce plan est utilisé par des abonnements" };
  }

  await prisma.subscriptionPlan.delete({ where: { id } });
  return { success: true };
}

// ---------- Subscriptions ----------

export async function getSubscriptions() {
  const user = await requireAuth();
  requireAdmin(user);
  return prisma.childSubscription.findMany({
    orderBy: { startDate: "desc" },
    include: {
      plan: { select: { id: true, name: true, price: true } },
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classRoom: { select: { name: true } },
        },
      },
    },
  });
}

export async function getParentSubscriptions() {
  const user = await requireAuth();
  if (user.role !== "PARENT") {
    throw new Error("Forbidden");
  }
  const childIds = await getParentChildIds(user.id);
  if (childIds.length === 0) {
    return [];
  }
  return prisma.childSubscription.findMany({
    where: { childId: { in: childIds } },
    orderBy: { startDate: "desc" },
    include: {
      plan: { select: { id: true, name: true, price: true } },
      child: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          classRoom: { select: { name: true } },
        },
      },
    },
  });
}

export async function createSubscription(formData: FormData) {
  const user = await requireAuth();
  requireAdmin(user);

  const childId = parseInt(formData.get("childId") as string);
  const planId = parseInt(formData.get("planId") as string);
  const agreedPrice = parseAmount(formData.get("agreedPrice") as string);
  const startDate = parseDay(formData.get("startDate") as string);
  const endDateRaw = formData.get("endDate") as string;
  const endDate = endDateRaw ? parseDay(endDateRaw) : null;

  if (
    !Number.isInteger(childId) ||
    !Number.isInteger(planId) ||
    agreedPrice === null ||
    !startDate
  ) {
    return { error: "Paramètres invalides" };
  }
  if (endDateRaw && !endDate) {
    return { error: "Date de fin invalide" };
  }

  const [child, plan] = await Promise.all([
    prisma.child.findUnique({ where: { id: childId }, select: { id: true } }),
    prisma.subscriptionPlan.findUnique({
      where: { id: planId },
      select: { id: true },
    }),
  ]);
  if (!child || !plan) {
    return { error: "Enfant ou plan introuvable" };
  }

  await prisma.childSubscription.create({
    data: { childId, planId, agreedPrice, startDate, endDate },
  });
  return { success: true };
}

export async function deleteSubscription(id: number) {
  const user = await requireAuth();
  requireAdmin(user);
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }
  await prisma.childSubscription.delete({ where: { id } });
  return { success: true };
}

// ---------- Invoices ----------

const invoiceInclude = {
  child: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      classRoom: { select: { name: true } },
    },
  },
  items: true,
  payments: { orderBy: { paymentDate: "desc" as const } },
} as const;

export async function getInvoices(filters: {
  childName?: string;
  status?: string;
} = {}) {
  const user = await requireAuth();

  let scopeWhere: Record<string, unknown> = {};
  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    scopeWhere = { childId: { in: childIds } };
  } else {
    requireAdmin(user);
  }

  return prisma.invoice.findMany({
    where: {
      ...scopeWhere,
      ...(filters.status ? { status: filters.status } : {}),
      ...(filters.childName
        ? {
            child: {
              OR: [
                { firstName: { contains: filters.childName } },
                { lastName: { contains: filters.childName } },
              ],
            },
          }
        : {}),
    },
    include: invoiceInclude,
    orderBy: { issueDate: "desc" },
    take: 200,
  });
}

export async function getInvoice(id: number) {
  const user = await requireAuth();
  if (!Number.isInteger(id)) {
    throw new Error("Paramètres invalides");
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: invoiceInclude,
  });
  if (!invoice) {
    throw new Error("Facture non trouvée");
  }

  if (user.role === "PARENT") {
    const childIds = await getParentChildIds(user.id);
    if (!childIds.includes(invoice.childId)) {
      throw new Error("Forbidden");
    }
  } else {
    requireAdmin(user);
  }

  return invoice;
}

export async function getBillableChildren() {
  const user = await requireAuth();
  requireAdmin(user);
  return prisma.child.findMany({
    orderBy: { lastName: "asc" },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      classRoom: { select: { name: true } },
    },
  });
}

export async function createInvoice(formData: FormData) {
  const user = await requireAuth();
  requireAdmin(user);

  const childId = parseInt(formData.get("childId") as string);
  const dueDateRaw = formData.get("dueDate") as string;
  const dueDate = dueDateRaw ? parseDay(dueDateRaw) : null;
  const itemsRaw = formData.get("items") as string;

  if (!Number.isInteger(childId) || (dueDateRaw && !dueDate)) {
    return { error: "Paramètres invalides" };
  }

  let items: { description: string; quantity: number; unitPrice: number }[];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { error: "Lignes de facture invalides" };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Ajoutez au moins une ligne" };
  }

  const cleanItems = items
    .map((item) => ({
      description: String(item.description || "").trim(),
      quantity: Math.floor(Number(item.quantity)),
      unitPrice: Number(item.unitPrice),
    }))
    .filter(
      (item) =>
        item.description &&
        Number.isInteger(item.quantity) &&
        item.quantity > 0 &&
        Number.isFinite(item.unitPrice) &&
        item.unitPrice >= 0
    );

  if (cleanItems.length === 0) {
    return { error: "Les lignes de facture sont invalides" };
  }

  const child = await prisma.child.findUnique({
    where: { id: childId },
    select: { id: true },
  });
  if (!child) {
    return { error: "Enfant non trouvé" };
  }

  const totalAmount = cleanItems.reduce(
    (sum, item) => sum + item.quantity * item.unitPrice,
    0
  );

  const invoice = await prisma.invoice.create({
    data: {
      childId,
      totalAmount,
      status: "UNPAID",
      issueDate: new Date(),
      dueDate,
      items: {
        create: cleanItems.map((item) => ({
          description: item.description,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
          total: item.quantity * item.unitPrice,
        })),
      },
    },
  });

  return { success: true, invoiceId: invoice.id };
}

export async function deleteInvoice(id: number) {
  const user = await requireAuth();
  requireAdmin(user);
  if (!Number.isInteger(id)) {
    return { error: "Paramètres invalides" };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: { payments: { select: { id: true } } },
  });
  if (!invoice) {
    return { error: "Facture non trouvée" };
  }
  if (invoice.payments.length > 0) {
    return { error: "Impossible de supprimer une facture avec des paiements" };
  }

  await prisma.invoice.delete({ where: { id } });
  return { success: true };
}

// ---------- Payments ----------

export async function addPayment(formData: FormData) {
  const user = await requireAuth();
  requireAdmin(user);

  const invoiceId = parseInt(formData.get("invoiceId") as string);
  const amount = parseAmount(formData.get("amount") as string);
  const method = ((formData.get("method") as string) || "").trim();
  const paymentDateRaw = formData.get("paymentDate") as string;
  const paymentDate = paymentDateRaw ? new Date(paymentDateRaw) : new Date();

  if (!Number.isInteger(invoiceId) || amount === null || amount <= 0 || !method) {
    return { error: "Paramètres invalides" };
  }
  if (isNaN(paymentDate.getTime())) {
    return { error: "Date de paiement invalide" };
  }

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true },
  });
  if (!invoice) {
    return { error: "Facture non trouvée" };
  }
  if (invoice.status === "CANCELLED") {
    return { error: "Facture annulée" };
  }

  const paid = invoice.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  if (paid + amount > Number(invoice.totalAmount) + 0.001) {
    return { error: "Le montant dépasse le solde restant" };
  }

  await prisma.$transaction(async (tx) => {
    await tx.payment.create({
      data: { invoiceId, amount, paymentDate, method },
    });

    const newPaid = paid + amount;
    const newStatus =
      newPaid >= Number(invoice.totalAmount) - 0.001 ? "PAID" : "UNPAID";
    if (newStatus !== invoice.status) {
      await tx.invoice.update({
        where: { id: invoiceId },
        data: { status: newStatus },
      });
    }
  });

  return { success: true };
}

export async function updateInvoiceStatus(id: number, status: string) {
  const user = await requireAuth();
  requireAdmin(user);

  if (
    !Number.isInteger(id) ||
    !INVOICE_STATUSES.includes(status as (typeof INVOICE_STATUSES)[number])
  ) {
    return { error: "Paramètres invalides" };
  }

  const invoice = await prisma.invoice.findUnique({ where: { id } });
  if (!invoice) {
    return { error: "Facture non trouvée" };
  }

  await prisma.invoice.update({ where: { id }, data: { status } });
  return { success: true };
}
