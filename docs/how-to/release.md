# Make a release

There is no tagged public release yet. Do not imply that a version badge, app archive or configured domain is a release.

1. Confirm the intended scope in SPEC.md and run the checks in CONTRIBUTING.md.
2. Validate the design skill, documentation links and all changed behavior. Test web UI on a real phone; compile/sign/device-test iPhone changes in Xcode.
3. Update applicable docs, legal information and third-party notices. Resolve public-launch conditions before changing the audience.
4. Rebuild source and native archives with `python3 scripts/package-release.py` and compute checksums.
5. Commit and push to the actual repository, review the changes and create a version/tag only when a release is requested.
6. Publish release assets and notes with explicit limitations. Do not describe a development Xcode project as an App Store build.

The manual Pages and daily catalog workflows are separate from versioned release management. Apple signing files and tokens must never enter the repository.
