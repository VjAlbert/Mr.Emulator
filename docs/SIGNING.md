# Code signing — setup guide (maintainer)

This is what has to be done **by the maintainer** to turn on installer signing. The repository side is already prepared: the release workflow has an optional *sign* step that stays **off** until `SIGNING_ENABLED` is set.

> Requirements and procedures of SignPath change over time: check <https://signpath.org/foundation> and <https://about.signpath.io/documentation/> before applying.

## 1. Apply to SignPath Foundation (free for open source)

1. Go to <https://signpath.org/foundation> (the *Apply* link) and sign up.
2. Provide: repository URL (`https://github.com/VjAlbert/Mr.Emulator`), licence (MIT), a short description, and the link to the **code signing policy**: <https://github.com/VjAlbert/Mr.Emulator/blob/main/docs/CODE_SIGNING_POLICY.md>.
3. Be ready to confirm that the project is open source, maintained, free of malware, and built on a GitHub-hosted runner (it is: `release.yml`).
4. Wait for the approval. This can take days to weeks.

Things reviewers commonly look at (check the current rules): a public history of releases, a README that states the signing policy, a privacy statement, and that the program does not send data without the user's request. The new-version check is **on by default** and contacts GitHub; it is disclosed in the policy and can be turned off. If SignPath objects, make it opt-in (setting `checkUpdates` default to `false`).

## 2. After approval: configure SignPath

In the SignPath web interface create (names are suggestions):

- a **project** (slug e.g. `mr-emulator`);
- an **artifact configuration** for the GitHub artifact. The workflow uploads the installer as a ZIP artifact named `Mr-Emulator-Setup`, so the configuration is a zip containing one PE file, for example:

  ```xml
  <artifact-configuration xmlns="http://signpath.io/artifact-configuration/v1">
    <zip-file>
      <pe-file path="Mr-Emulator-Setup-*.exe">
        <authenticode-sign/>
      </pe-file>
    </zip-file>
  </artifact-configuration>
  ```
- a **signing policy** (slug e.g. `release-signing`) that requires manual approval and allows the GitHub trusted build system;
- link the project to this GitHub repository (*Trusted build systems → GitHub*), and create a **CI user** with an **API token**.

## 3. Add the secrets and variables in GitHub

Repository → *Settings → Secrets and variables → Actions*:

| Kind | Name | Value |
|---|---|---|
| Secret | `SIGNPATH_API_TOKEN` | the CI user's API token |
| Variable | `SIGNPATH_ORGANIZATION_ID` | your SignPath organisation id |
| Variable | `SIGNPATH_PROJECT_SLUG` | e.g. `mr-emulator` |
| Variable | `SIGNPATH_SIGNING_POLICY_SLUG` | e.g. `release-signing` |
| Variable | `SIGNING_ENABLED` | `true` (turns the sign step on) |

## 4. First signed release

1. Bump the version, push, and run the workflow with *Publish a GitHub Release* (or push a `v*` tag).
2. In SignPath, **approve** the signing request.
3. The workflow downloads the signed installer and attaches it to the release. Check: *Properties → Digital Signatures* on the file, or `Get-AuthenticodeSignature .\Mr-Emulator-Setup-<version>.exe` in PowerShell.
4. Update the README ("Windows may warn…" text) and the wiki, and add the SignPath statement to the README (see the code signing policy page).

If signing fails, the workflow does **not** publish an unsigned installer by mistake: the *publish* job runs only when signing succeeded or was switched off.

## Notes

- Only the installer is signed. The program files inside it are not, which is usually fine for SmartScreen; if it ever matters, signing the inner executables would need the signing call inside the build.
- A new certificate does not remove SmartScreen warnings at once: reputation builds up with downloads.
- Turn signing off at any time by setting `SIGNING_ENABLED` to anything but `true`.
