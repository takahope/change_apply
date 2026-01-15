# Repository Guidelines

## Project Structure & Module Organization
This is a Google Apps Script web app. Backend logic lives in `code.js`, with `Manual.js` adding the Google Sheets custom menu and manual document generation helpers. The UI is split into HTML templates (`index.html`, `form.html`, `myapply.html`, `review.html`, `unauthorized.html`) and shared partials (`stylesheet.html`, `loader.html`) included via `include()` in `code.js`. Runtime settings are defined in `appsscript.json`. Repo docs live in `README.md`, `CLAUDE.md`, and `GEMINI.md`. Local config files include `.clasp.json` (scriptId/root), `.env`, and `.gemini` (treat as sensitive; avoid editing unless requested).

## Data & Sheet Conventions
The app expects Google Sheets tabs named `申請紀錄`, `權限`, `下拉選單`, and `資訊資產`. Status values include `申請中`, `已核准`, and `已拒絕`, with optional `拒絕原因` in the records sheet.

## Build, Test, and Development Commands
- `clasp pull`: sync the latest remote script to local files.
- `clasp push`: push local changes to Apps Script.
- `clasp open`: open the Apps Script editor for this project.
- `clasp deploy --description "..."`: create a new deployment version.
These commands require `@google/clasp` and a logged-in Google account.

## Coding Style & Naming Conventions
Use the existing file indentation: `code.js` uses 2 spaces, while HTML files and `Manual.js` commonly use 4 spaces. Favor `const` for shared constants (sheet names, column indexes, IDs) and lowerCamelCase for functions (`getAssetData`, `submitApplication`). Keep JSDoc blocks for public functions and use short, targeted comments only where logic is non-obvious. UI copy is Traditional Chinese; keep wording consistent. Preserve existing file names and routing conventions (`?page=index`, `?page=form`, `?page=myapply`, `?page=review`).

## Testing Guidelines
There are no automated tests. Manually verify critical flows after changes:
- form submission writes to Sheets and sets status fields
- approver-only access to the review page
- approval generates record numbers (based on approval time), documents, and document links
- rejection updates status to `已拒絕`, writes `拒絕原因`, and sends rejection emails
- notification emails are sent for both approval and rejection
Use a dev deployment URL to avoid impacting production data.

## Commit & Pull Request Guidelines
Commit messages in history are short and imperative (e.g., "Add reject functionality"), with optional scopes like `docs:` for documentation-only changes. Use the same style. For pull requests, include a concise description of behavior changes, how you tested (commands or manual steps), and screenshots for UI updates. Link related issues when available.

## Configuration & Security Notes
Deployment settings live in `appsscript.json` (`access: DOMAIN`, `executeAs: USER_DEPLOYING`). External IDs (`TEMPLATE_ID`, `DESTINATION_FOLDER_ID`) and `RECORD_NUMBER_PREFIX` are defined as constants in `code.js`; update them per environment and avoid exposing sensitive values in PRs. Server-side access control relies on `Session.getActiveUser().getEmail()` and `isCurrentUserApprover()` (permissions cached for 300s); keep checks in place when adding new endpoints.

## Agent-Specific Instructions
Automation helpers should read `CLAUDE.md` and `GEMINI.md` for repo-specific workflow notes.
