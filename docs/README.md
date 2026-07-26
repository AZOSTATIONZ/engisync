# EngiSync Documentation

Complete documentation set for the EngiSync platform. Start here.

1. **[SRS & Technical Documentation](01-SRS-and-Technical-Documentation.md)** — requirements, architecture, database, security, deployment, testing, change log.
2. **[Development Journal](02-Development-Journal.md)** — the full story of the project so a new engineer can get up to speed fast: why it exists, every major feature and technology, how modules connect, and current status.
3. **[System Configuration Guide](03-System-Configuration-Guide.md)** — setup, required software/accounts, and where every configuration value lives (secrets-safe).
4. **[User Manual](04-User-Manual.md)** — how to use EngiSync for each role: Guest, Student, Group Member, Group Leader, Supervisor/Lecturer, Administrator.
5. **[Maintenance Manual](05-Maintenance-Manual.md)** — operations: migrations, monitoring, backups, disaster recovery, troubleshooting, and the release process.

> Security: none of these documents contain real passwords, tokens, or keys. They explain where configuration lives and how to set, replace, and rotate it. Actual secrets belong only in `.env` (local, git-ignored) or your host's environment/secret manager.
