import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Collaboration" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Collaboration"
      description="Chat, announcements, discussions, and activity feeds."
      phase="Phase 2"
    />
  );
}
