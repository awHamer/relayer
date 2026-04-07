---
'@relayerjs/drizzle': minor
---

- Add typed Context support — `createRelayerEntity` accepts a `TContext` generic that propagates into `@computed` and `@derived` resolvers, and `context` is now passed through on every read AND mutation method
