"use client";

import { cancelRequest } from "@/app/actions/communication";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function CancelRequestButton({ requestId }: { requestId: number }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");

  const handleCancel = async () => {
    if (!window.confirm("Annuler cette demande ?")) return;
    setPending(true);
    setError("");
    const result = await cancelRequest(requestId);
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-600">
      {error && <p className="text-sm text-red-600 mb-2">{error}</p>}
      <button
        onClick={handleCancel}
        disabled={pending}
        className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
      >
        {pending ? "Annulation..." : "Annuler ma demande"}
      </button>
    </div>
  );
}
