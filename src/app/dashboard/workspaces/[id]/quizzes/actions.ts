"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getMembership, isWorkspaceLeader } from "@/lib/workspace";

export type QuizState = { error?: string; success?: string } | null;
export type SubmitState =
  | { error?: string; score?: number; total?: number }
  | null;

async function requireUser() {
  const session = await auth();
  if (!session?.user?.id) redirect("/login");
  return session.user;
}

type QuestionInput = {
  text: string;
  options: string[];
  correctIndex: number;
};

/** Create a quiz from JSON built in the client. Leader only. */
export async function createQuiz(
  workspaceId: string,
  _prev: QuizState,
  formData: FormData,
): Promise<QuizState> {
  const user = await requireUser();
  if (!(await isWorkspaceLeader(workspaceId, user.id))) {
    return { error: "Only a group leader can create quizzes." };
  }

  const title = String(formData.get("title") ?? "").trim();
  if (title.length < 3) return { error: "Give the quiz a title." };

  let questions: QuestionInput[];
  try {
    questions = JSON.parse(String(formData.get("questions") ?? "[]"));
  } catch {
    return { error: "Could not read the questions." };
  }

  const valid = questions.filter(
    (q) =>
      q.text?.trim() &&
      Array.isArray(q.options) &&
      q.options.filter((o) => o.trim()).length >= 2 &&
      q.correctIndex >= 0 &&
      q.correctIndex < q.options.length,
  );
  if (valid.length === 0) {
    return { error: "Add at least one question with 2+ options and a correct answer." };
  }

  const quiz = await prisma.quiz.create({
    data: {
      workspaceId,
      createdById: user.id,
      title,
      description: (formData.get("description") as string)?.trim() || null,
      questions: {
        create: valid.map((q, i) => ({
          text: q.text.trim(),
          options: q.options.map((o) => o.trim()).filter(Boolean),
          correctIndex: q.correctIndex,
          order: i,
        })),
      },
    },
  });

  revalidatePath(`/dashboard/workspaces/${workspaceId}/quizzes`);
  redirect(`/dashboard/workspaces/${workspaceId}/quizzes/${quiz.id}`);
}

/** Grade an attempt server-side and record the score. */
export async function submitQuiz(
  quizId: string,
  answers: number[],
): Promise<SubmitState> {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!quiz) return { error: "Quiz not found." };
  if (!(await getMembership(quiz.workspaceId, user.id))) {
    return { error: "You're not a member of this group." };
  }

  let score = 0;
  quiz.questions.forEach((q, i) => {
    if (answers[i] === q.correctIndex) score++;
  });
  const total = quiz.questions.length;

  await prisma.quizAttempt.create({
    data: {
      quizId,
      userId: user.id,
      userName: user.name ?? user.email ?? "Member",
      score,
      total,
    },
  });

  revalidatePath(`/dashboard/workspaces/${quiz.workspaceId}/quizzes/${quizId}`);
  return { score, total };
}

export async function deleteQuiz(quizId: string): Promise<QuizState> {
  const user = await requireUser();
  const quiz = await prisma.quiz.findUnique({
    where: { id: quizId },
    select: { workspaceId: true, createdById: true },
  });
  if (!quiz) return { error: "Not found." };
  const allowed =
    quiz.createdById === user.id ||
    (await isWorkspaceLeader(quiz.workspaceId, user.id));
  if (!allowed) return { error: "You can't delete this quiz." };

  await prisma.quiz.delete({ where: { id: quizId } });
  redirect(`/dashboard/workspaces/${quiz.workspaceId}/quizzes`);
}
