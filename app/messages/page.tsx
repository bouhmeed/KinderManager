import { getMyConversations } from "@/app/actions/communication";
import { requireAuthPage } from "@/lib/auth";
import Link from "next/link";

export const instant = false;

export default async function MessagesPage() {
  const user = await requireAuthPage();
  const conversations = await getMyConversations();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <nav className="bg-white dark:bg-gray-800 shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16 items-center">
            <Link href="/dashboard" className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
              ← Retour
            </Link>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">
              KinderManager - Messages
            </h1>
            <div></div>
          </div>
        </div>
      </nav>

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <div className="px-4 py-6 sm:px-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
                Mes conversations
              </h2>
              <Link
                href="/messages/nouvelle"
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg transition-colors"
              >
                + Nouvelle conversation
              </Link>
            </div>

            {conversations.length === 0 ? (
              <p className="text-gray-500 dark:text-gray-400 text-center py-12">
                Aucune conversation
              </p>
            ) : (
              <ul className="divide-y divide-gray-200 dark:divide-gray-700">
                {conversations.map((conv) => {
                  const lastMessage = conv.messages[0];
                  const others = conv.participants.filter(
                    (p) => p.user.id !== user.id
                  );
                  return (
                    <li key={conv.id}>
                      <Link
                        href={`/messages/${conv.id}`}
                        className="flex items-center justify-between py-4 hover:bg-gray-50 dark:hover:bg-gray-700 px-2 rounded"
                      >
                        <div>
                          <p className="font-medium text-gray-900 dark:text-white">
                            {conv.child
                              ? `${conv.child.firstName} ${conv.child.lastName}`
                              : "Conversation générale"}
                          </p>
                          <p className="text-sm text-gray-500 dark:text-gray-400">
                            {others
                              .map((p) => p.user.name)
                              .join(", ")}
                          </p>
                          {lastMessage && (
                            <p className="text-sm text-gray-400 dark:text-gray-500 mt-1 truncate max-w-md">
                              {lastMessage.sender.name} : {lastMessage.content}
                            </p>
                          )}
                        </div>
                        <div className="text-right">
                          {lastMessage && (
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                              {new Date(lastMessage.sentAt).toLocaleDateString(
                                "fr-FR"
                              )}
                            </p>
                          )}
                          <span className="text-indigo-600 dark:text-indigo-400 text-sm">
                            Ouvrir →
                          </span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
