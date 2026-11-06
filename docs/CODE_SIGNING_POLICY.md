# Code signing policy

**Status: application in preparation.** The Windows installer is currently **not signed**. This page describes how signing will work once a certificate is granted, so users and the signing service can check it.

When active, the installer will be signed with a certificate provided by **[SignPath Foundation](https://signpath.org/)**, through the free open-source programme of **[SignPath.io](https://signpath.io/)**. The publisher shown by Windows will then be *SignPath Foundation*.

> Free code signing provided by [SignPath.io](https://signpath.io/), certificate by [SignPath Foundation](https://signpath.org/).

## What is signed

Only the Windows installer `Mr-Emulator-Setup-<version>.exe` published in the project's [GitHub Releases](https://github.com/VjAlbert/Mr.Emulator/releases), built from this repository's source code. Nothing else is signed with this certificate.

## How it is built

- The installer is built **only by the GitHub Actions workflow** [`release.yml`](../.github/workflows/release.yml) on a GitHub-hosted Windows runner, from the commit that is tagged `v<version>`. Typecheck and the automated tests must pass first.
- The built file is submitted to SignPath from that workflow; the signed file is returned and attached to the release. No private key is stored in the repository or on any developer machine.
- The project is open source under the [MIT licence](../LICENSE). It does not contain malware, adware or hacking tools, and it does not bundle ROMs, BIOS files or emulators.

## Team roles

| Role | Person |
|---|---|
| **Author / committer** | [VjAlbert](https://github.com/VjAlbert) |
| **Reviewer** | [VjAlbert](https://github.com/VjAlbert) (all changes go through the repository's public history) |
| **Approver** (releases a signing request) | [VjAlbert](https://github.com/VjAlbert) |

Signing requests are approved manually for each release.

## Privacy policy

Mr. Emulator does **not** collect or send usage data and does not need an account. It makes network requests only for functions the user uses or can turn off:

- covers and screenshots (libretro-thumbnails, can be turned off);
- core and cheat-database downloads (only when the user asks);
- a **new-version check** against this repository's GitHub releases, at most once a day, **which can be turned off** in Settings. Nothing about the user or the PC is sent;
- RetroAchievements, **only if the user turns trophies on**, handled by RetroArch.

The full list is on the wiki page [Privacy & legal](https://github.com/VjAlbert/Mr.Emulator/wiki/Privacy-and-Legal).
