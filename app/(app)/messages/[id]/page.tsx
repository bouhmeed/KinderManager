"use client";

import { getConversation, sendMessage } from "@/app/actions/communication";
import { useParams } from "next/navigation";
import { useState, useEffect, Suspense } from "react";

export default function ConversationPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
        </div>
      }
    >
      <ConversationThread />
    </Suspense>
  );
}

function ConversationThread() {
  const params = useParams<{ id: string }>();
  const conversationId = parseInt(params.id);
  const [data, setData] = useState<Awaited<
    ReturnType<typeof getConversation>
  > | null>(null);
  const [content, setContent] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = () => {
    getConversation(conversationId)
      .then(setData)
      .catch(() => setError("Conversation introuvable ou accès refusé"))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [conversationId]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!content.trim()) return;
    setPending(true);
    setError("");
    const result = await sendMessage(conversationId, content);
    setPending(false);
    if (result?.error) {
      setError(result.error);
    } else {
      setContent("");
      load();
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">Chargement...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <p className="text-gray-500 dark:text-gray-400">
          {error || "Conversation introuvable"}
        </p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex flex-col">
      

      <main className="flex-1 max-w-5xl w-full mx-auto py-6 sm:px-6 lg:px-8 flex flex-col">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 overflow-y-auto p-4 space-y-3 max-h-[60vh]">
            {data.messages.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-8">
                Aucun message. Commencez la conversation !
              </p>
            ) : (
              data.messages.map((message) => {
                const isMine = message.senderId === data.viewerId;
                return (
                  <div
                    key={message.id}
                    className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                  >
                    <div
                      className={`max-w-md rounded-lg px-4 py-2 ${
                        isMine
                          ? "bg-indigo-600 text-white"
                          : "bg-gray-100 dark:bg-gray-700 text-gray-900 dark:text-white"
                      }`}
                    >
                      {!isMine && (
                        <p className="text-xs font-medium opacity-75 mb-1">
                          {message.sender.name}
                        </p>
                      )}
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      <p
                        className={`text-xs mt-1 ${
                          isMine ? "text-indigo-200" : "text-gray-500 dark:text-gray-400"
                        }`}
                      >
                        {new Date(message.sentAt).toLocaleString("fr-FR")}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {error && (
            <div className="px-4 pb-2">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          <form onSubmit={handleSend} className="border-t border-gray-200 dark:border-gray-600 p-4 flex gap-3">
            <input
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="Écrire un message..."
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <button
              type="submit"
              disabled={pending || !content.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50"
            >
              {pending ? "..." : "Envoyer"}
            </button>
          </form>
        </div>
      </main>
    </div>
  );
}
