"use client";

import { deleteTimetableVersion } from "@/app/actions/planning";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

export default function VersionActions({ versionId }: { versionId: number }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const handleDelete = () => {
    if (!window.confirm("Supprimer définitivement cette version du planning ?")) {
      return;
    }
    setError("");
    startTransition(async () => {
      const result = await deleteTimetableVersion(versionId);
      if (result?.error) {
        setError(result.error);
      } else {
        router.push("/planning");
      }
    });
  };

  return (
    <span className="inline-flex items-center space-x-2">
      {error && <span className="text-xs text-red-600">{error}</span>}
      <button
        onClick={handleDelete}
        disabled={isPending}
        className="text-red-600 hover:text-red-700 dark:text-red-400 text-sm disabled:opacity-50"
      >
        {isPending ? "Suppression..." : "Supprimer"}
      </button>
    </span>
  );
}
