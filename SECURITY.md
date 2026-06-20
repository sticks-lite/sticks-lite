# Security Policy

## Supported Versions

Security updates are considered for the latest published version of Sticks Lite.
Older versions may not receive fixes.

## Reporting A Vulnerability

Please do not open a public GitHub issue for a suspected security vulnerability.

Use GitHub's private vulnerability reporting for this repository if available.
If private reporting is not available, contact the maintainers through the
repository owner profile and avoid including exploit details in public channels.

When reporting, include:

- the Sticks Lite version,
- your operating system and Node.js version,
- a minimal `.slite` source file or command that reproduces the issue,
- what you expected to happen,
- what actually happened,
- whether the issue affects classroom use, the `sticks` CLI, or the public API.

Do not include private student data, credentials, access tokens, classroom
records, or other sensitive information.

## Security Model

Sticks Lite is intended for monitored educational environments. It is not a
security sandbox, permissions boundary, production runtime, or safe executor for
untrusted code.

The language core does not expose file-system or network APIs, but the `sticks`
CLI reads `.slite` source files and uses terminal input/output. Teachers,
schools, and operators should provide their own supervision and external
controls when students run code.

## Dependency Security

The package has no runtime dependencies. Development dependencies are used for
tests, builds, and release checks. Production dependency audits are run with:

```sh
npm audit --omit=dev
```

## Maintainer Response

Maintainers will review security reports as time allows and may ask for more
information. If a vulnerability is confirmed, maintainers will prepare a fix,
publish a new version, and document the change when appropriate.
