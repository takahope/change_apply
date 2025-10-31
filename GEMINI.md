# Gemini Project Context: 系統變更申請 (System Change Request) Web App

## Project Overview

This is a web application built with Google Apps Script designed to manage system change requests. It provides a user-friendly interface for employees to submit requests, track their status, and for managers to review and approve them. The entire application is integrated with Google Workspace services, primarily Google Sheets and Google Docs.

### Key Technologies

*   **Backend:** Google Apps Script (`code.js`)
*   **Frontend:** HTML, CSS, and JavaScript served via Google Apps Script's `HtmlService`.
*   **Database:** Google Sheets is used as the database to store:
    *   Application records (`申請紀錄`)
    *   User permissions and approver roles (`權限`)
    *   Dynamic dropdown menu options (`下拉選單`)
    *   A list of IT assets (`資訊資產`)
*   **Document Generation:** Google Docs is used to automatically generate a formal request document from a template upon approval.
*   **Notifications:** Gmail is used to send email notifications to approvers for new requests and to applicants upon approval.

### Architecture

The application follows a simple client-server model:

1.  **Client (Frontend):** Composed of several HTML files (`index.html`, `form.html`, `myapply.html`, `review.html`) that define the user interface for different roles and actions. Client-side JavaScript within these files communicates with the backend.
2.  **Server (Backend):** The `code.js` file contains all the server-side logic. It handles HTTP GET requests (`doGet`), exposes functions to the frontend via `google.script.run`, interacts with the Google Sheet database, generates documents, and sends emails.

## Building and Running

This is a Google Apps Script project. It is not built or run using typical command-line tools.

### Deployment

1.  **Open the Project:** Open the associated Google Sheet and navigate to `Extensions > Apps Script` to open the script editor.
2.  **Deploy:** In the Apps Script editor, click on `Deploy > New deployment`.
3.  **Configure:**
    *   Select `Web app` as the deployment type.
    *   Configure the access level (e.g., "Anyone within [Your Domain]").
4.  **Get URL:** After deploying, you will get a web app URL. This URL is the entry point to the application.

### Local Development (using `clasp`)

The presence of a `.clasp.json` file suggests that `clasp`, the command-line interface for Google Apps Script, can be used for local development. This allows developers to edit the code in their preferred local editor and push changes to the Apps Script project.

*   **Clone:** `clasp clone <scriptId>`
*   **Push:** `clasp push`
*   **Pull:** `clasp pull`

## Development Conventions

*   **File Structure:**
    *   `code.js`: Contains all backend logic.
    *   `*.html`: Each HTML file represents a different page or a shared component (like `stylesheet.html`).
    *   `appsscript.json`: The manifest file for the Apps Script project.
*   **Backend Communication:** The frontend communicates with the backend asynchronously using `google.script.run`. This is used to submit forms, fetch data for tables and dropdowns, and trigger approval processes.
*   **Configuration:** Global constants for sheet names, column indices, and template IDs are defined at the top of `code.js` for easy configuration.
*   **Permissions:** User roles (applicant vs. approver) are managed in the '權限' sheet and checked on the server-side to control access to pages like the review dashboard.
*   **Code Style:** The code is well-commented in Traditional Chinese, explaining the purpose of functions and key logic.
