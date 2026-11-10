// Publishes metadata for the two Google Drive files supplied for ArZaib POS.
// To publish an update while keeping this setup, upload a new version of the
// existing Drive file (Manage versions), so its file ID remains unchanged.
const RELEASE_FILES = {
  android: '1w3USS58_tGgY1w7U1DYFHVGRfBSwIFPe',
  windows: '1M4fxC1yUDqdY03-uq9jIGRmtkyWE_dLk',
};

function doGet(e) {
  const callback = String((e && e.parameter && e.parameter.callback) || '');
  if (!/^[A-Za-z_$][\w$]*$/.test(callback)) {
    return ContentService.createTextOutput('Invalid callback').setMimeType(ContentService.MimeType.TEXT);
  }

  const result = {
    android: releaseForFile_(RELEASE_FILES.android),
    windows: releaseForFile_(RELEASE_FILES.windows),
  };
  return ContentService.createTextOutput(`${callback}(${JSON.stringify(result)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

function releaseForFile_(fileId) {
  const file = DriveApp.getFileById(fileId);
  const fileName = file.getName();
  const versionMatch = fileName.match(/(?:^|[^\d])(\d+\.\d+\.\d+)(?=[^\d]|$)/);
  return {
    version: versionMatch ? versionMatch[1] : 'Latest',
    fileName,
    url: `https://drive.google.com/uc?export=download&id=${fileId}`,
  };
}
