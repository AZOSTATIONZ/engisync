import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { GraduationCap } from "lucide-react";
import { auth } from "@/auth";
import { getMembership, isWorkspaceLeader } from "@/lib/workspace";
import { listQuizzes } from "@/lib/quiz";
import { Card, CardContent } from "@/components/ui/card";
import { QuizBuilder } from "./quiz-ui";

export const metadata: Metadata = { title: "Quizzes" };

export default async function QuizzesPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await auth();
  const userId = session!.user.id;
  if (!(await getMembership(id, userId))) notFound();

  const [quizzes, isLeader] = await Promise.all([
    listQuizzes(id, userId),
    isWorkspaceLeader(id, userId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="page-title">Quizzes</h1>
          </div>
          {isLeader && <QuizBuilder workspaceId={id} />}
        </div>
      </div>

      {quizzes.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-2 py-12 text-center text-sm text-muted-foreground">
            <GraduationCap className="h-8 w-8 text-primary" />
            No quizzes yet.
            {isLeader ? " Create one to test your group." : " Check back soon."}
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          {quizzes.map((q) => (
            <Link key={q.id} href={`/dashboard/projects/${id}/quizzes/${q.id}`}>
              <Card className="card-hover h-full">
                <CardContent className="py-4">
                  <p className="font-medium">{q.title}</p>
                  {q.description && (
                    <p className="text-sm text-muted-foreground">{q.description}</p>
                  )}
                  <div className="mt-2 flex items-center gap-3 text-xs text-muted-foreground">
                    <span>{q.questionCount} questions</span>
                    {q.bestScore && (
                      <span className="text-primary">Best: {q.bestScore}</span>
                    )}
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
