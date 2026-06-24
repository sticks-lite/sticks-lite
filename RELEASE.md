# Release Checklist

This checklist is for formal Sticks Lite package releases.

Sticks Lite is intended for monitored educational environments. A release may be
public and widely used, but the project should not claim to be a production
application runtime, a security sandbox, or a safe executor for untrusted code.

## Version Bump

From the parent Sticks Lite workspace, run:

```sh
node scripts/bump-sticks-version.mjs <new-version>
```

This updates the interpreter package and docs package versions together.

## Required Local Checks

From the parent workspace, run:

```sh
node scripts/release-check-all.mjs
```

This verifies:

- version consistency,
- package tests,
- TypeScript build,
- production dependency audit,
- npm package dry run,
- docs production build,
- browser IDE production build,
- VS Code extension metadata.

## Package Tarball Check

The package dry run must show only the intended public npm package surface:

- `dist/`
- `README.md`
- `LICENSE`
- `package.json`

Run directly from this repo when reviewing package contents:

```sh
npm run package:dry-run
```

Do not leave generated `.tgz` files in the repository.

## Install Verification

After publishing, verify a clean global install in a temporary directory or
fresh shell:

```sh
npm install -g sticks-lite
sticks --version
sticks init verify-sticks-lite
cd verify-sticks-lite
sticks check
sticks run
```

The starter program asks for a name and score.

Also verify package import behavior in a separate test project when the public
TypeScript API changes:

```sh
npm install sticks-lite
```

Then import from `sticks-lite` rather than internal `dist` paths.

## README And Docs Review

Before publishing, check that:

- README install commands use `npm install -g sticks-lite` for CLI users.
- README verification commands are current.
- README links to documentation, support, security, changelog, and contributing
  guidance.
- Docs describe the same CLI behavior as the package.
- Docs do not hard-code release numbers where metadata should be used.
- Responsible-use language remains clear and consistent.

## GitHub Release Notes

Use `CHANGELOG.md` as the source for public release notes.

Release notes should include:

- what changed,
- whether behavior changed,
- whether docs changed,
- test/build/audit status,
- any known limitations.

Do not include private credentials, npm tokens, security exploit details, or
internal-only distribution notes.

## Publish

Publish from the package repo after checks pass:

```sh
npm publish
```

The package is installed globally by CLI users:

```sh
npm install -g sticks-lite
```

## After Publishing

Confirm the npm package page shows the new version, then run:

```sh
npm view sticks-lite version
npm view sticks-lite bin
```

Verify the installed command:

```sh
sticks --version
sticks --help
```

If a release problem is discovered, publish a patch release rather than editing
or deleting public release history.
