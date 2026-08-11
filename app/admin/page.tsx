import { AgentAdminPanel } from "@/components/admin/AgentAdminPanel";

export const metadata = {
  title: "Agent Admin — Deriv EA",
  robots: { index: false, follow: false },
};

export default function AdminPage() {
  return <AgentAdminPanel />;
}
