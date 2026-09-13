import AdminShell from "@/layout/AdminShell";
import { createClient } from "@/lib/supabase/server";
import { getHeaderNotifications } from "@/lib/header-notifications";

export default async function AdminGroupLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  let userEmail: string | null = null;
  try {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    userEmail = user?.email ?? null;
  } catch {
    userEmail = null;
  }

  const notifications = await getHeaderNotifications(locale);

  return (
    <AdminShell locale={locale} userEmail={userEmail} notifications={notifications}>
      {children}
    </AdminShell>
  );
}
