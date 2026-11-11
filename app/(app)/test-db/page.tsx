
import { connection } from "next/server";
import { prisma } from "@/lib/prisma";

export const instant = false;

export default async function TestDatabasePage() {
  await connection();

  let result = "";

  try {
    const usersCount = await prisma.user.count();
    const childrenCount = await prisma.child.count();

    result = `Connection successful! Users: ${usersCount}, Children: ${childrenCount}`;
  } catch (error) {
    console.error("Database connection error:", error);
    result = "Database connection failed. Check the terminal.";
  }

  return (
    <main className="p-10">
      <h1 className="text-2xl font-bold">
        KinderManager Database Test
      </h1>
      <p className="mt-4">{result}</p>
    </main>
  );
}
