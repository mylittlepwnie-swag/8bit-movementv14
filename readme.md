# 8bit Movement v14

`8bit-movement` lets a token swap between directional images so movement feels closer to old-school 8-bit RPGs. You can configure four-direction movement or enable diagonals for eight-direction sprites.

This fork is focused on Foundry Virtual Tabletop v13 and v14 compatibility. It has been locally tested on Foundry VTT v13.351 and targets compatibility through v14.360.

## Features

- Activates automatically on newly placed tokens (can be turned off)
- Configure directional token images from the Token Config appearance tab
- Auto-detect direction suffixes in filenames during setup
- Optional diagonal support using `UL`, `UR`, `DL`, and `DR`
- Save directional settings back to the actor's prototype token
- Optional warning controls
- Optional rotation animation override when `libWrapper` is active

## Expected image naming

If your token images share a naming pattern, the setup action can fill the flags automatically.

Examples:

- `hero_UP.webp`
- `hero_DOWN.webp`
- `hero_LEFT.webp`
- `hero_RIGHT.webp`
- `hero_UL.webp`
- `hero_UR.webp`
- `hero_DL.webp`
- `hero_DR.webp`

Lowercase suffixes also work.

## Installation

Install from Foundry's **Install Module** dialog using this manifest URL:

```
https://github.com/mylittlepwnie-swag/8bit-movementv14/releases/latest/download/module.json
```

This points at the latest GitHub release, which contains a `module.zip` built with `module.json` at the archive root (the layout Foundry expects). Installing straight from a branch zip does not work because GitHub wraps branch archives in an extra folder.

## Setup

Enable the module in a world, then configure the module settings from Foundry's Configure Settings dialog.

- **Auto-activate on token placement** activates the 8bit walk style on newly placed tokens automatically (on by default).
- **Token Settings mode** adds the movement image controls to the Token Config appearance tab.
- **Diagonal mode** enables four extra diagonal image slots.
- **Only allow GM changes** restricts setup controls to GMs.
- **Disable Rotation Animation** registers a `libWrapper` wrapper that suppresses Foundry's rotation animation during combined texture/rotation updates.

Newly placed tokens are initialized automatically. Tokens placed while auto-activation is off can still be initialized manually with the activate button in the Token Config appearance tab. If the current texture filename contains a direction suffix, the module infers sibling image paths. Otherwise, every direction starts with the current token texture and can be changed manually.

## Current status

- Targeted at Foundry VTT `13` through `14.360`
- Updated from earlier v10-v13 forks
- Locally tested on Foundry VTT `13.351`
- Still needs more real-world testing on Foundry v14 before calling it fully stable

## Development notes

This module does not currently have an automated test suite. Useful checks before committing:

- `node --check src/scripts/main.js`
- `node --check src/scripts/functions.js`
- `node --check src/scripts/ui.js`
- `node -e "JSON.parse(require('fs').readFileSync('src/lang/en.json','utf8'))"`

Runtime behavior still needs to be checked in Foundry itself, especially auto-activation on token placement, Token Config rendering, movement texture swaps, diagonal movement, and the optional `libWrapper` rotation wrapper.

## Release process

1. Bump `version` in `src/module.json` (and `package.json`) on `main`.
2. Create and push a matching tag, e.g. `git tag v1.4.2 && git push origin v1.4.2`.
3. Publish a GitHub release for that tag. The `Release` workflow (`.github/workflows/release.yml`) then:
   - stamps the tag version and the version-specific download URL into `module.json`,
   - zips the contents of `src/` into `module.zip` with `module.json` at the zip root,
   - attaches `module.zip` and `module.json` to the release.
4. Optionally publish to the Foundry package listing with the helper below.

## Release helper

This repo includes a small helper for Foundry's Package Release API.

1. Copy `.env.example` to `.env.local` or set `FOUNDRY_RELEASE_TOKEN` in your shell.
2. Get the token from the package edit page on foundryvtt.com.
3. Keep `.env` and `.env.local` private; they are ignored by git.
4. Confirm the generated API payload:

   ```bash
   npm run release:payload
   ```

5. Validate the release with Foundry without saving it:

   ```bash
   npm run release:dry-run
   ```

6. Publish the release:

   ```bash
   npm run release:publish
   ```

Before publishing, make sure the version in `src/module.json` has a matching pushed git tag such as `v1.4.0`. The API payload uses that tag for the version-specific manifest URL.

## Credits

This module exists because of work across several forks and maintenance passes.

- Original module by `Freeze` / `Freeze020`
  Original repo: https://gitlab.com/Freeze020/8bit-movement
- Later maintenance by `muhahahahe`
- v13 fork and maintenance by `darth-beedz`
- Current v14 fork and maintenance: `FrankHZ`
  Some local git history may appear under `FFang`, which is the same maintainer identity

If you are one of the previous maintainers and want the wording adjusted, I’m happy to refine the credit section.

## Notes

- `libWrapper` is optional and only used for the rotation animation override setting
- Settings that need reloads use Foundry's `requiresReload` setting option
- See `CHANGELOG` for earlier historical changes through the prior forks
