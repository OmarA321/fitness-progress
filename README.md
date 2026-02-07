# Fit Crew Tracker

Static GitHub Pages site + Google Sheets backend.

## 1) Create the Google Sheet
1. Create a new Google Sheet (this will be your shared "Excel" database).
2. Create two sheets named exactly:
   - `People`
   - `Daily`
3. Add headers:
   - `People` columns: `Name`, `StartWeight`, `CurrentWeight`, `GoalWeight`
   - `Daily` columns: `Date`, `Name`, `Gym`, `Sleep`, `Water`, `Notes`
4. (Optional) Paste initial data from your Excel file into `People`.

## 2) Add Apps Script Web App
1. In your Google Sheet: Extensions → Apps Script.
2. Replace the default script with the contents of `apps-script/Code.gs`.
3. Deploy → New deployment → Type: Web app.
4. Execute as: Me. Who has access: Anyone.
5. Copy the web app URL.

## 3) Connect the Site
1. Open `app.js` and paste the web app URL into `WEB_APP_URL`.

## 4) Publish to GitHub Pages
1. Create a GitHub repo and push this folder.
2. In GitHub: Settings → Pages → Deploy from branch.
3. Select `main` and `/root` (or `/docs` if you move files).

## Data rules
- Daily points = Gym (1) + Sleep (1). Water is on hold.
- Weekly leaderboard uses the last 7 days (rolling).
- Goal leaderboard ranks by smallest distance to goal.

## Updating people
Use the "Manage People" form on the site to add/edit/delete people. This updates the `People` sheet.
