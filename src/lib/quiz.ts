import { prisma } from "@/lib/prisma";
import { getMembership } from "@/lib/workspace";

export async function listQuizzes(workspaceId: string, userId: string) {
  const quizzes = await prisma.quiz.findMany({
    where: { workspaceId },
    include: {
      _count: { select: { questions: true } },
      attempts: {
        where: { userId },
        orderBy: { score: "desc" },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });
  return quizzes.map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    questionCount: q._count.questions,
    bestScore: q.attempts[0] ? `${q.attempts[0].score}/${q.attempts[0].total}` : null,
  }));
}

/** Quiz for taking — options WITHOUT the correct answer. Members only. */
export async function getQuizForTaking(quizId: string, userId: string) {
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: {
      questions: { orderBy: { order: "asc" } },
      attempts: { orderBy: { score: "desc" } },
    },
  });
  if (!quiz) return null;
  if (!(await getMembership(quiz.workspaceId, userId))) return null;

  return {
    id: quiz.id,
    workspaceId: quiz.workspaceId,
    createdById: quiz.createdById,
    title: quiz.title,
    description: quiz.description,
    questions: quiz.questions.map((q) => ({
      id: q.id,
      text: q.text,
      options: (q.options as string[]) ?? [],
    })),
    leaderboard: quiz.attempts.map((a) => ({
      userName: a.userName,
      score: a.score,
      total: a.total,
      at: a.createdAt.toISOString(),
    })),
  };
}
