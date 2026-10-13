import { getProject } from "@/lib/project";
import { authorize } from "@/lib/policy";
import { fail, forbidden, ok, withUser } from "@/lib/api";

export const dynamic = "force-dynamic";

/**
 * GET /api/v1/projects/:id
 *
 * THIS ROUTE EXISTS TO DEMONSTRATE THE PERMISSION RULE, so read it before
 * adding any endpoint of your own.
 *
 * Access is decided by `authorize()` — the same function the web Server
 * Actions call, reading the same `policy.ts`. The route contributes no rule of
 * its own. It does not check membership, it does not look at roles, and it
 * must never start doing so: the instant a permission is expressed twice, the
 * two copies begin to disagree, and the version that is wrong is always the
 * one nobody tested.
 *
 * A FAILED AUTHORISATION RETURNS 403 WITH THE POLICY'S OWN REASON. Mobile
 * clients therefore show the same explanation as the website, written once.
 *
 * `getProject` separately returns null for a non-member, so a caller who is
 * not on the project cannot distinguish "exists but forbidden" from "does not
 * exist" — both produce 404. That is deliberate: a 403 on a real id confirms
 * the project exists, which is itself a leak when ids are guessable.
 */
export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;

  return withUser({ limitKey: "project-detail" }, async (userId) => {
    const authz = await authorize(id, userId, "project.view");
    if (!authz.ok) return forbidden(authz.error);

    const project = await getProject(id, userId);
    if (!project) return fail("NOT_FOUND", "Project not found.");

    /* Returned verbatim from `getProject`. Dates are ALREADY ISO strings
       there — re-serialising them here would throw, and inventing fields it
       does not return (a description, a task count, a member list) is how an
       API contract starts promising data the server cannot supply. If mobile
       needs task counts, `listProjects` computes them; that belongs in its
       own endpoint rather than being faked here. */
    return ok({
      id: project.id,
      name: project.name,
      department: project.department,
      stage: project.stage,
      stageEnteredAt: project.stageEnteredAt,
      targetEndDate: project.targetEndDate || null,
      objectives: project.objectives,
      scope: project.scope,
      isLeader: project.isLeader,
      pace: { status: project.pace.status },
      milestones: project.milestones,
      risks: project.risks,
      deliverables: project.deliverables,
      feedback: project.feedback,
    });
  });
}
