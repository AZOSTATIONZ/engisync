# EngiSync — User Manual

**Audience:** Everyone who uses EngiSync — students, group leaders, supervisors, and administrators.
**Last updated:** 26 July 2026

> Screenshots: placeholders are marked like *[Screenshot: …]*. Replace them with real captures from your deployment before distributing.

---

## Getting started (all users)

- **Open the app** at your EngiSync URL (e.g., `https://engisync.vercel.app`). *[Screenshot: landing page]*
- **Light/dark mode:** toggle from the top bar.
- **Navigation:** the left sidebar (desktop) or the menu button (mobile) groups features into sections — Overview, Workspace, Schedule, Collaborate, Insights, and (for supervisors) Teaching.

---

## 1. Guest

A guest is anyone not logged in. Guests can view the public landing page and the login/registration pages only. To do anything else, register or log in.

- **Register:** click **Get started** → enter name, email, password → submit. If email is configured, verify via the link sent to you. *[Screenshot: register]*
- **Log in:** click **Log in** → enter credentials → if you enabled two-factor, enter your 6-digit code.

---

## 2. Student / Individual User

The default role after registering.

- **Login & registration:** as above; reset a forgotten password from **Log in → Forgot password**.
- **Navigation & dashboard:** your dashboard shows open tasks, your groups, activity, an animated banner, and a "Get set up" checklist guiding you through the first steps. *[Screenshot: dashboard]*
- **Task management:** open **Tasks** to create personal or group tasks with priority, due date, assignee, and dependencies; start/stop the live timer to log time.
- **Project management:** open **Projects** to set objectives, scope, milestones, and deliverables.
- **Meetings:** view and join meetings; check in to record attendance.
- **Budget:** view group contributions and expenses.
- **Analytics:** see your group's health, workload, and burndown.
- **AI Assistant:** if enabled, get summaries, task suggestions, and engineering guidance.
- **Notifications:** the bell shows reminders, approvals, and nudges; opt into email/push in **Settings**.
- **Reports & file sharing:** upload files in **Resources** and share them with secure, expiring links.
- **Security:** enable two-factor and manage your password in **Settings**.

---

## 3. Group Member

A student who has joined a group workspace.

- **Join a group:** **Groups → Join** using a code (and PIN if required), an invite link, or by scanning a QR code.
- **Dashboard:** your group appears on your dashboard and in **Groups**.
- **Tasks & project:** pick up assigned tasks, log time, and contribute to the group's **Documentation** (the 22-section project report) — write sections and **Submit for review**. *[Screenshot: documentation editor]*
- **Meetings/budget/files:** participate, contribute, and share as above.
- **Participation:** if you have not started contributing, you'll see a friendly prompt to pick up a task — activity is visible to your leader and supervisor, so stay engaged.
- **Notifications:** you're notified when a supervisor approves a section or requests corrections.

---

## 4. Group Leader

A member who created the group or was promoted to co-leader.

- **Create a group:** **Groups → New group** → name, department, optional starter template (seeds milestones/deliverables), optional PIN. *[Screenshot: create group]*
- **Invite members:** share the join code, link, or QR; create one-time/expiring invite links; or email an invite.
- **Access control:** set a member cap and require approval for new joiners; approve/reject join requests.
- **Coordinate the team:** set member roles/titles, promote/demote co-leaders, and **nudge** inactive members.
- **Inactive members:** a banner tells you how many members aren't participating; each is badged **Inactive** with a nudge button.
- **Documentation & submission:** oversee the project document and **Submit report version** snapshots for supervisor review; download the compiled document.
- Everything a member can do, plus the above.

---

## 5. Supervisor / Lecturer

A department member whose role is set to **Supervisor** by a department admin.

- **Login/registration:** as any user; your account must be assigned the Supervisor role in a department.
- **Navigation:** a **Supervisor** item appears in your sidebar (only visible to supervisors).
- **Dashboard:** the **Supervisor dashboard** lists every project in the departments you supervise with progress bars. *[Screenshot: supervisor dashboard]*
- **Project review:** open a project → read the team, milestones, deliverables, risks, and completion stats (read-only, no membership needed).
- **Documentation review:** **Review documentation** shows all 22 sections; per section you can **Approve**, **Request corrections**, and leave comments. Lock/unlock the whole document to freeze editing. *[Screenshot: supervisor review]*
- **Approvals:** approve individual **milestones**, the **final report**, and **project completion**.
- **Version history:** view submitted report versions and **compare** any version with the current draft side by side.
- **Analytics report:** **Analytics report** shows overall/team/individual metrics with Daily/Weekly/Monthly/Semester/Final ranges, and a **Printable PDF** button that opens a formatted report you can save as PDF. *[Screenshot: analytics report]*
- **Feedback:** leave written feedback that appears on the students' project page.
- **Downloads:** download the project's compiled documentation.

---

## 6. Administrator

A platform administrator.

- **Admin panel:** open **Admin** to manage global settings.
- **AI switch:** turn AI features on or off platform-wide (independent of whether a key is configured).
- **App settings:** manage other key/value settings that gate features.
- **Security:** administrators should have 2FA enabled and use a strong, rotated password.

---

## Common tasks reference

| I want to… | Where |
|---|---|
| Reset my password | Log in → Forgot password |
| Turn on two-factor | Settings → Security |
| Join a group | Groups → Join (code/PIN/invite/QR) |
| Write the project report | Group → Documentation |
| Submit the report for review | Group → Documentation → Submit report version |
| Approve a section (supervisor) | Supervisor → project → Review documentation |
| Get a printable grade report (supervisor) | Supervisor → project → Analytics report → Printable PDF |
| Enable email/push reminders | Settings → Notifications |

## Tips

- If AI features say "not configured," an administrator needs to add an AI key — this is expected, not an error.
- Keep sections short and submit them as you finish so your supervisor can review continuously.
- Leaders: use nudges early; the inactive badge is a prompt to help teammates, not a penalty.
