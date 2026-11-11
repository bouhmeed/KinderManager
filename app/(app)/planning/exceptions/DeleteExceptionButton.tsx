"use client";

import { deleteScheduleException } from "@/app/actions/exceptions";
import { useRouter } from "next/navigation";
import { useTransition } from "react";

export default function DeleteExceptionButton({ id }: { id: number }) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm("Supprimer cette exception de planning ?")) return;
    startTransition(async () => {
      await deleteScheduleException(id);
      router.refresh();
    });
  };

  return (
    <button
      onClick={handleDelete}
      disabled={isPending}
      className="text-red-600 hover:text-red-700 dark:text-red-400 text-sm disabled:opacity-50"
    >
      {isPending ? "Suppression..." : "Supprimer"}
    </button>
  );
}
