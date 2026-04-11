---
'@relayerjs/drizzle': patch
---

Fix `buildLinkCondition` to extract `_id` from object items during disconnect. Previously passed the entire object as the target id, which crashed when disconnecting via `{ _id: 5 }` shape.
