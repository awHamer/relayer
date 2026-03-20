---
name: feedback_no_decorative_comments
description: No decorative line-width comments with dashes/unicode borders
type: feedback
---

Never use decorative comments with dashes to fill line width like `// ── Section ──────────────────`.
Use simple section comments if needed.

**Why:** User has to manually edit the dashes to match line width when changing the comment text.
**How to apply:** Use plain `// Section` comments or no section comments at all.
