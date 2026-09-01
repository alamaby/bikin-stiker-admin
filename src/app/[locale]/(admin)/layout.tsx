import { AdminSidebar } from "@/components/admin-sidebar";

export default async function AdminGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  return (
    <div className="flex min-h-screen">
      <AdminSidebar locale={locale} />
      <main className="flex-1 overflow-auto bg-muted/20 p-4 md:p-6 lg:p-8">{children}</main>
    </div>
  );
}
