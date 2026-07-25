import Link from "next/link";
import type { Metadata } from "next";
import { CalendarClock, CheckSquare, FolderKanban, Users } from "lucide-react";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ImageSlider, type Slide } from "@/components/image-slider";
import { RotatingText } from "@/components/rotating-text";
import { OnboardingCard } from "@/components/onboarding-card";

export const metadata: Metadata = { title: "Dashboard" };

// Slides use a gradient base + an optional photo from /public/images.
// Drop slide1.jpg … slide4.jpg (free engineering photos) to show real images.
const bannerSlides: Slide[] = [
  { src: "/images/slide1.jpg", label: "Electrical", gradient: "from-blue-600 to-cyan-500" },
  { src: "/images/slide2.jpg", label: "Mechanical", gradient: "from-slate-700 to-slate-500" },
  { src: "/images/slide3.jpg", label: "Civil", gradient: "from-amber-600 to-orange-500" },
  { src: "/images/slide4.jpg", label: "Computer", gradient: "from-violet-600 to-fuchsia-500" },
];

const bannerPhrases = [
  "Build. Test. Ship.",
  "Coordinate your team.",
  "Never miss a deadline.",
  "Engineer, together.",
];

export default async function DashboardPage() {
  const session = await auth();
  const userId = session!.user.id;

  const wsIds = (
    await prisma.workspaceMember.findMany({
      where: { userId },
      select: { workspaceId: true },
    })
  ).map((m) => m.workspaceId);

  const [workspaceCount, memberships, openTasks, deptCount, totalTaskCount] =
    await Promise.all([
      prisma.workspace.count({ where: { members: { some: { userId } } } }),
      prisma.workspaceMember.findMany({
        where: { userId },
        include: { workspace: true },
        take: 5,
      }),
      prisma.task.count({
        where: {
          status: { not: "DONE" },
          OR: [
            { creatorId: userId },
            { assigneeId: userId },
            { workspaceId: { in: wsIds } },
          ],
        },
      }),
      prisma.departmentMember.count({ where: { userId } }),
      prisma.task.count({
        where: {
          OR: [
            { creatorId: userId },
            { assigneeId: userId },
            { workspaceId: { in: wsIds } },
          ],
        },
      }),
    ]);

  const projectWithObjectives = await prisma.workspace.count({
    where: {
      members: { some: { userId } },
      NOT: { objectives: null },
    },
  });

  const onboardingSteps = [
    { label: "Join your engineering department", href: "/dashboard/departments", done: deptCount > 0 },
    { label: "Create or join a project group", href: "/dashboard/workspaces", done: workspaceCount > 0 },
    { label: "Add your first task", href: "/dashboard/tasks", done: totalTaskCount > 0 },
    { label: "Set your project objectives", href: "/dashboard/projects", done: projectWithObjectives > 0 },
  ];

  const stats = [
    { label: "My Workspaces", value: workspaceCount, icon: FolderKanban },
    { label: "Open Tasks", value: openTasks, icon: CheckSquare },
    { label: "Upcoming Meetings", value: 0, icon: CalendarClock },
    { label: "Teammates", value: memberships.length, icon: Users },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">
          Welcome back, {session?.user.name?.split(" ")[0] ?? "Engineer"} 👋
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s an overview of your work.
        </p>
      </div>

      {/* Animated banner: sliding images + rotating text */}
      <div className="relative h-40 overflow-hidden rounded-2xl shadow-soft sm:h-48">
        <ImageSlider slides={bannerSlides} className="h-full w-full" />
        <div className="absolute inset-0 bg-gradient-to-r from-black/60 via-black/30 to-transparent" />
        <div className="absolute inset-0 flex flex-col justify-center gap-1 p-6 text-white">
          <p className="text-sm/relaxed opacity-90">EngiSync</p>
          <h2 className="text-2xl font-bold sm:text-3xl">
            <RotatingText phrases={bannerPhrases} />
          </h2>
          <p className="max-w-md text-sm text-white/80">
            Projects, teams, meetings and deadlines — all in one workspace.
          </p>
        </div>
      </div>

      <OnboardingCard steps={onboardingSteps} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {s.label}
              </CardTitle>
              <s.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your Workspaces</CardTitle>
        </CardHeader>
        <CardContent>
          {memberships.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              You&apos;re not part of any workspace yet. Create one or join with a
              code to get started.
            </p>
          ) : (
            <ul className="divide-y">
              {memberships.map((m) => (
                <li key={m.id}>
                  <Link
                    href={`/dashboard/workspaces/${m.workspace.id}`}
                    className="flex items-center justify-between py-3 hover:opacity-80"
                  >
                    <div>
                      <p className="font-medium">{m.workspace.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {m.workspace.description}
                      </p>
                    </div>
                    <span className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                      {m.role}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
