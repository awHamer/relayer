# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| 0.4.x   | Yes       |
| < 0.4   | No        |

## Reporting a Vulnerability

If you discover a security vulnerability, please report it responsibly:

1. **Do not** open a public issue
2. Email the maintainers or use [GitHub Security Advisories](https://github.com/awHamer/relayer/security/advisories/new)
3. Include a description of the vulnerability and steps to reproduce

We will acknowledge receipt within 48 hours and provide a fix timeline.

## Security Measures

- All user-controlled values in SQL queries use parameterized queries (Drizzle `sql` tagged template)
- JSON path segments validated with `assertSafeIdentifier` to prevent injection via `sql.raw`
- No `eval`, no dynamic `require`, no user-controlled code execution
