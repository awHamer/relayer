---
'@relayerjs/nestjs-crud': patch
---

- Fix ParseIdPipe: validate int32 range (1..2147483647), reject floats, zero, negative
- Fix handleUpdate: throw NotFoundException when entity not found (was returning `{ success: true }`)
