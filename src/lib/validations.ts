import { z } from "zod";

export const passwordSchema = z
  .string()
  .min(8, "Password must be at least 8 characters")
  .regex(/[A-Z]/, "Must contain an uppercase letter")
  .regex(/[a-z]/, "Must contain a lowercase letter")
  .regex(/[0-9]/, "Must contain a number");

export const registerSchema = z
  .object({
    name: z.string().min(2, "Name is too short").max(80),
    email: z.string().email("Enter a valid email"),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const loginSchema = z.object({
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Password is required"),
});

export const forgotPasswordSchema = z.object({
  email: z.string().email("Enter a valid email"),
});

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1),
    password: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

export const createWorkspaceSchema = z.object({
  name: z.string().min(3, "Workspace name is too short").max(100),
  description: z.string().max(500).optional().or(z.literal("")),
  pin: z
    .string()
    .regex(/^\d{4,6}$/, "PIN must be 4–6 digits")
    .optional()
    .or(z.literal("")),
  departmentId: z.string().min(1, "Choose a department"),
});

export const departmentSchema = z.object({
  name: z.string().min(3, "Department name is too short").max(100),
  code: z
    .string()
    .min(2, "Code is too short")
    .max(10)
    .regex(/^[A-Za-z0-9]+$/, "Code must be letters/numbers only")
    .transform((s) => s.toUpperCase()),
  description: z.string().max(500).optional().or(z.literal("")),
});

export type DepartmentInput = z.infer<typeof departmentSchema>;

export const announcementSchema = z.object({
  departmentId: z.string().min(1),
  title: z.string().min(3, "Title is too short").max(160),
  body: z.string().min(3, "Write an announcement").max(4000),
});

export const deptRoleEnum = z.enum(["ADMIN", "MEMBER"]);

export const joinWorkspaceSchema = z.object({
  joinCode: z
    .string()
    .min(4, "Enter a valid join code")
    .max(16)
    .transform((s) => s.trim().toUpperCase()),
  pin: z.string().optional().or(z.literal("")),
});

export const taskStatusEnum = z.enum([
  "TODO",
  "IN_PROGRESS",
  "BLOCKED",
  "DONE",
]);
export const taskPriorityEnum = z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]);
export const recurrenceEnum = z.enum(["NONE", "DAILY", "WEEKLY", "MONTHLY"]);

const optionalString = z.preprocess(
  (v) => (v === null || v === undefined || v === "" ? undefined : v),
  z.string().optional(),
);

export const taskSchema = z.object({
  title: z.string().min(2, "Title is too short").max(160),
  description: optionalString,
  priority: taskPriorityEnum.default("MEDIUM"),
  status: taskStatusEnum.default("TODO"),
  dueDate: optionalString, // ISO date string from <input type="date">
  recurrence: recurrenceEnum.default("NONE"),
  estimatedMinutes: z.coerce.number().int().min(0).max(100000).optional(),
  workspaceId: optionalString,
  assigneeId: optionalString,
  dependsOn: z.array(z.string()).optional(),
});

export const logTimeSchema = z.object({
  taskId: z.string().min(1),
  minutes: z.coerce.number().int().min(1, "Log at least 1 minute").max(100000),
  note: optionalString,
});

export type TaskInput = z.infer<typeof taskSchema>;

export const eventTypeEnum = z.enum([
  "EVENT",
  "DEADLINE",
  "MEETING",
  "REMINDER",
]);

export const eventSchema = z.object({
  title: z.string().min(2, "Title is too short").max(160),
  description: optionalString,
  location: optionalString,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  startTime: optionalString, // HH:MM
  endTime: optionalString,
  type: eventTypeEnum.default("EVENT"),
  workspaceId: optionalString,
});

export type EventInput = z.infer<typeof eventSchema>;

export const shareLinkSchema = z.object({
  fileId: z.string().min(1),
  expiresInHours: z.coerce.number().int().min(0).max(8760).optional(), // 0 = never
  maxDownloads: z.coerce.number().int().min(1).max(100000).optional(),
});

export type ShareLinkInput = z.infer<typeof shareLinkSchema>;

export const meetingProviderEnum = z.enum([
  "GOOGLE_MEET",
  "ZOOM",
  "MS_TEAMS",
  "GOOGLE_CLASSROOM",
  "OTHER",
]);
export const attendanceStatusEnum = z.enum([
  "PRESENT",
  "ABSENT",
  "LATE",
  "EXCUSED",
]);

export const meetingSchema = z.object({
  title: z.string().min(2, "Title is too short").max(160),
  description: optionalString,
  provider: meetingProviderEnum.default("OTHER"),
  meetingUrl: optionalString,
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Pick a valid date"),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Pick a start time"),
  endTime: optionalString,
  workspaceId: z.string().min(1, "Choose a workspace"),
});

export type MeetingInput = z.infer<typeof meetingSchema>;

export const contributionMethodEnum = z.enum([
  "ECOCASH",
  "ONEMONEY",
  "INNBUCKS",
  "CASH",
  "BANK",
  "OTHER",
]);
export const expenseCategoryEnum = z.enum([
  "COMPONENTS",
  "TOOLS",
  "PRINTING",
  "TRANSPORT",
  "SOFTWARE",
  "SERVICES",
  "OTHER",
]);

export const contributionSchema = z.object({
  workspaceId: z.string().min(1),
  amount: z.coerce
    .number()
    .positive("Amount must be greater than 0")
    .max(1_000_000_000),
  method: contributionMethodEnum.default("ECOCASH"),
  reference: optionalString,
  note: optionalString,
  userId: optionalString, // contributor; defaults to the current user
});

export const expenseSchema = z.object({
  workspaceId: z.string().min(1),
  amount: z.coerce.number().positive("Amount must be greater than 0").max(1_000_000_000),
  category: expenseCategoryEnum.default("OTHER"),
  description: z.string().min(2, "Add a short description").max(200),
  reference: optionalString,
  spentById: optionalString,
});

export const budgetSettingsSchema = z.object({
  workspaceId: z.string().min(1),
  budgetTarget: z.coerce.number().min(0).max(1_000_000_000).optional(),
  currency: z.string().min(1).max(8),
});

export type ContributionInput = z.infer<typeof contributionSchema>;
export type ExpenseInput = z.infer<typeof expenseSchema>;

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type CreateWorkspaceInput = z.infer<typeof createWorkspaceSchema>;
export type JoinWorkspaceInput = z.infer<typeof joinWorkspaceSchema>;
