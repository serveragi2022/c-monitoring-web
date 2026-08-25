import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/session";
import AppShellClient from "@/components/AppShellClient";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getSessionUser();
  if (!user) {
    redirect("/login");
  }

  return <AppShellClient user={user}>{children}</AppShellClient>;
}
