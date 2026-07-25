import Link from "next/link";
import type { Metadata } from "next";
import { Building2, Users, Megaphone, MessagesSquare } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

export const metadata: Metadata = { title: "Collaboration" };

const channels = [
  {
    icon: Building2,
    title: "Department announcements",
    desc: "Your department admin posts updates everyone in the department sees.",
    href: "/dashboard/departments",
    cta: "Go to Departments",
  },
  {
    icon: Users,
    title: "Your project groups",
    desc: "Each group is a private space with tasks, files, meetings, and members.",
    href: "/dashboard/workspaces",
    cta: "Go to Groups",
  },
  {
    icon: Megaphone,
    title: "Cross-department projects",
    desc: "Invite another department to collaborate on a shared project (with approval).",
    href: "/dashboard/departments",
    cta: "Manage collaborations",
  },
];

export default function CollaborationPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Collaboration</h1>
        <p className="text-muted-foreground">
          Where your team communicates. Here&apos;s where each kind of
          collaboration happens today.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {channels.map((c) => (
          <Card key={c.title} className="flex flex-col">
            <CardHeader>
              <c.icon className="h-7 w-7 text-primary" />
              <CardTitle className="mt-2 text-base">{c.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-1 flex-col justify-between gap-4 text-sm text-muted-foreground">
              <p>{c.desc}</p>
              <Link
                href={c.href}
                className="font-medium text-primary hover:underline"
              >
                {c.cta} →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card className="border-dashed">
        <CardContent className="flex items-center gap-3 py-4 text-sm text-muted-foreground">
          <MessagesSquare className="h-5 w-5 text-primary" />
          A threaded <strong>discussion board</strong> and{" "}
          <strong>group quizzes</strong> are coming next — so your group can talk
          through ideas and test each other in one place.
        </CardContent>
      </Card>
    </div>
  );
}
