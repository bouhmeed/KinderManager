import { getBillableChildren } from "@/app/actions/billing";
import { requireAdminPage } from "@/lib/auth";
import InvoiceForm from "./InvoiceForm";

export const instant = false;

export default async function NewInvoicePage() {
  await requireAdminPage();
  const children = await getBillableChildren();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      

      <main className="max-w-4xl mx-auto py-6 sm:px-6 lg:px-8">
        <InvoiceForm childOptions={children} />
      </main>
    </div>
  );
}
