import type { Metadata } from "next";
import { ModulePlaceholder } from "@/components/module-placeholder";

export const metadata: Metadata = { title: "Projects" };

export default function Page() {
  return (
    <ModulePlaceholder
      title="Projects"
      description="Objectives, scope, milestones, risks, budget, and deliverables."
      phase="Phase 2"
    />
  );
}
