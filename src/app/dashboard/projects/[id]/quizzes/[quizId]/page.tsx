import Link from "next/link";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ArrowLeft, Trophy } from "lucide-react";
import { auth } from "@/auth";
import { getQuizForTaking } from "@/lib/quiz";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { TakeQuiz, DeleteQuizButton } from "../quiz-ui";

export const metadata: Metadata = { title: "Quiz" };

export default async function QuizPage({
  params,
}: {
  params: Promise<{ id: string; quizId: string }>;
}) {
  const { id, quizId } = await params;
  const session = await auth();
  const userId = session!.user.id;

  const quiz = await getQuizForTaking(quizId, userId);
  if (!quiz) notFound();

  const canDelete = quiz.createdById === userId;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Link
          href={`/dashboard/projects/${id}/quizzes`}
          className="mb-2 inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> All quizzes
        </Link>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{quiz.title}</h1>
            {quiz.description && (
              <p className="text-muted-foreground">{quiz.description}</p>
            )}
          </div>
          {canDelete && <DeleteQuizButton quizId={quiz.id} />}
        </div>
      </div>

      <TakeQuiz quizId={quiz.id} questions={quiz.questions} />

      {quiz.leaderboard.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="h-5 w-5 text-primary" /> Leaderboard
            </CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="divide-y text-sm">
              {quiz.leaderboard.slice(0, 10).map((a, i) => (
                <li key={i} className="flex flex-wrap items-center justify-between gap-2 py-2">
                  <span>
                    {i + 1}. {a.userName}
                  </span>
                  <span className="font-medium">
                    {a.score}/{a.total}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
