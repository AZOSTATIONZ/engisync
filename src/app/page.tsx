import Link from "next/link";
import {
  Calendar,
  CheckSquare,
  Cpu,
  FolderKanban,
  MessagesSquare,
  ShieldCheck,
  Sparkles,
  Zap,
  CircuitBoard,
  Cog,
  Building,
  FlaskConical,
  Factory,
  Server,
  Mountain,
  Radio,
} from "lucide-react";
import { Navbar } from "@/components/navbar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { HeroBackground } from "@/components/hero-background";
import { AnimatedCounter } from "@/components/animated-counter";

const features = [
  { icon: FolderKanban, title: "Group Workspaces", desc: "Project groups with join codes, PINs, QR codes, approvals, and invite links." },
  { icon: CheckSquare, title: "Task Management", desc: "Priorities, deadlines, dependencies, recurring tasks, and a live timer." },
  { icon: Calendar, title: "Calendar & Meetings", desc: "Deadlines, countdowns, Meet/Zoom/Teams sessions, and attendance." },
  { icon: MessagesSquare, title: "Collaboration", desc: "Departments, cross-department projects, files, and announcements." },
  { icon: Sparkles, title: "AI Assistant", desc: "Meeting summaries, task generation, risk detection, and project insights." },
  { icon: ShieldCheck, title: "Secure by design", desc: "RBAC, 2FA, encrypted sharing, audit logs, and email/push notifications." },
];

const departments = [
  { icon: Zap, name: "Electrical" },
  { icon: CircuitBoard, name: "Electronic" },
  { icon: Cog, name: "Mechanical" },
  { icon: Building, name: "Civil" },
  { icon: Factory, name: "Industrial" },
  { icon: FlaskConical, name: "Chemical" },
  { icon: Server, name: "Computer" },
  { icon: Mountain, name: "Mining" },
];

const stats = [
  { value: 8, suffix: "", label: "Engineering departments" },
  { value: 12, suffix: "+", label: "Integrated modules" },
  { value: 60, suffix: " FPS", label: "Smooth by design" },
  { value: 100, suffix: "%", label: "Built for teamwork" },
];

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />

      <main className="flex-1">
        {/* Hero */}
        <section className="relative overflow-hidden">
          <HeroBackground />
          <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/70 to-background" />
          <div className="container relative flex flex-col items-center gap-6 py-28 text-center">
            <span className="animate-float inline-flex items-center gap-2 rounded-full border bg-background/60 px-4 py-1.5 text-sm backdrop-blur">
              <Radio className="h-4 w-4 text-primary" />
              Built for university engineering teams
            </span>
            <h1 className="max-w-4xl text-4xl font-bold tracking-tight sm:text-6xl">
              The engineering platform for{" "}
              <span className="text-gradient">
                projects, teams &amp; deadlines
              </span>
            </h1>
            <p className="max-w-2xl text-lg text-muted-foreground">
              Departments, group projects, tasks, calendars, meetings, secure
              files, budgets, analytics, and an AI assistant — one polished
              workspace for engineering coursework and collaboration.
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <Button asChild size="lg" className="shadow-soft">
                <Link href="/register">Get started free</Link>
              </Button>
              <Button asChild size="lg" variant="outline" className="backdrop-blur">
                <Link href="/login">Log in</Link>
              </Button>
            </div>

            {/* Stats */}
            <div className="mt-10 grid w-full max-w-3xl grid-cols-2 gap-4 sm:grid-cols-4">
              {stats.map((s) => (
                <div
                  key={s.label}
                  className="glass rounded-xl p-4 shadow-soft"
                >
                  <div className="text-3xl font-bold text-primary">
                    <AnimatedCounter value={s.value} suffix={s.suffix} />
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Departments */}
        <section className="container py-16">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Every engineering discipline
          </h2>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {departments.map((d) => (
              <div
                key={d.name}
                className="card-hover flex flex-col items-center gap-2 rounded-xl border bg-card p-6 text-center"
              >
                <d.icon className="h-8 w-8 text-primary" />
                <span className="text-sm font-medium">{d.name}</span>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="container pb-24">
          <h2 className="mb-8 text-center text-2xl font-bold">
            Everything your team needs
          </h2>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <Card key={f.title} className="card-hover border-border/60">
                <CardHeader>
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primary/10">
                    <f.icon className="h-6 w-6 text-primary" />
                  </div>
                  <CardTitle className="mt-3">{f.title}</CardTitle>
                </CardHeader>
                <CardContent className="text-sm text-muted-foreground">
                  {f.desc}
                </CardContent>
              </Card>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="container pb-24">
          <div className="glass-strong relative overflow-hidden rounded-2xl p-10 text-center shadow-soft">
            <Cpu className="mx-auto mb-4 h-10 w-10 text-primary" />
            <h2 className="text-2xl font-bold">Ready to sync your engineering team?</h2>
            <p className="mx-auto mt-2 max-w-xl text-muted-foreground">
              Create your workspace in minutes and bring projects, people, and
              deadlines together.
            </p>
            <Button asChild size="lg" className="mt-6 shadow-soft">
              <Link href="/register">Create your workspace</Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t py-8">
        <div className="container flex flex-col items-center justify-between gap-2 text-center text-sm text-muted-foreground sm:flex-row sm:text-left">
          <span className="flex items-center gap-2">
            <Cpu className="h-5 w-5 text-primary" /> EngiSync
          </span>
          <span>Engineering collaboration &amp; productivity platform.</span>
        </div>
      </footer>
    </div>
  );
}
