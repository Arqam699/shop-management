# Google Drive automatic download links

The `/downloads` page reads release metadata for the two configured Google Drive files. The supplied PC and APK file IDs are already in `drive-release-service.gs`.

## One-time setup

1. Confirm both Drive files are shared as **Anyone with the link — Viewer**.
2. Open [script.google.com](https://script.google.com), create a project, and paste `drive-release-service.gs` into `Code.gs`.
3. Choose **Deploy → New deployment → Web app**. Set **Execute as: Me** and **Who has access: Anyone**, deploy, and authorize Drive access.
4. Copy the web app URL ending in `/exec`.
5. Add `VITE_APP_UPDATES_URL=<that /exec URL>` to the frontend hosting provider's environment variables, then rebuild/redeploy the website once.

The configured IDs are the APK `1w3USS58_tGgY1w7U1DYFHVGRfBSwIFPe` and Windows installer `1M4fxC1yUDqdY03-uq9jIGRmtkyWE_dLk`.

## Publishing later updates

This setup follows those exact Drive file IDs. To keep the IDs, open the existing file in Drive, use **Manage versions → Upload new version**, and upload the replacement APK/EXE. The download URL then serves the new file contents automatically. Keep a version such as `1.0.3` in the filename if you want that number displayed on the download page.

If instead you upload a new separate Drive file, it gets a different ID; update the relevant ID in `drive-release-service.gs` and redeploy the Apps Script web app.

This updates website download links and version labels. It does not install updates into apps already installed on devices. This repository has no Windows app source or updater/build configuration for background PC updates.
