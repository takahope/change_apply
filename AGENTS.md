# Repository Guidelines

## Project Structure & Module Organization
This is a Google Apps Script web app. Backend logic lives in `code.js`, with helper utilities in `Manual.js`. The UI is split into HTML templates (`index.html`, `form.html`, `myapply.html`, `review.html`, `unauthorized.html`) and shared partials (`stylesheet.html`, `loader.html`) included via `include()`. Runtime settings are defined in `appsscript.json`. There is no dedicated test directory; validation is performed manually against the Apps Script deployment and Sheets data.

## Build, Test, and Development Commands
- `clasp pull`: sync the latest remote script to local files.
- `clasp push`: push local changes to Apps Script.
- `clasp open`: open the Apps Script editor for this project.
- `clasp deploy --description "..."`: create a new deployment version.
These commands require `@google/clasp` and a logged-in Google account.

## Coding Style & Naming Conventions
Use 2-space indentation for JavaScript and HTML. Favor `const` for shared constants (sheet names, column indexes, IDs) and lowerCamelCase for functions (`getAssetData`, `submitApplication`). Keep JSDoc blocks for public functions and use short, targeted comments only where logic is non-obvious. Preserve existing file names and routing conventions (`?page=form`, `?page=review`).

## Testing Guidelines
There are no automated tests. Manually verify critical flows after changes:
- form submission writes to Sheets and sets status fields
- approver-only access to the review page
- approval generates record numbers and documents
- notification emails are sent
Use a dev deployment URL to avoid impacting production data.

## Commit & Pull Request Guidelines
Commit messages in history are short and imperative (e.g., "Add reject functionality"), with optional scopes like `docs:` for documentation-only changes. Use the same style. For pull requests, include a concise description of behavior changes, how you tested (commands or manual steps), and screenshots for UI updates. Link related issues when available.

## Configuration & Security Notes
Deployment settings live in `appsscript.json`. External IDs (template and folder IDs) are defined as constants in `code.js`; update them per environment and avoid exposing sensitive values in PRs. Keep web app access set to the intended domain or audience.

## Agent-Specific Instructions
Automation helpers should read `CLAUDE.md` and `GEMINI.md` for repo-specific workflow notes.
