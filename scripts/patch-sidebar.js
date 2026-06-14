const fs = require("fs");
const path = require("path");

const orgDir = path.join(__dirname, "..", "org");
const volDir = path.join(__dirname, "..", "volunteer");

const orgFiles = fs.readdirSync(orgDir).filter(function (f) {
  return f.endsWith(".html");
});

const sidebarScripts =
  '\n  <script src="../js/sidebar.js"></script>\n' +
  '  <script>HH.Sidebar.init("org");</script>\n';

const orgMainBlockRe =
  /\s*\/\* ---- Org page wrapper clears the sidebar ---- \*\/\s*\.org-main\s*\{[^}]+\}\s*@media\s*\(max-width:\s*640px\)\s*\{\s*\.org-main\s*\{[^}]+\}\s*\}/g;

const orgMainSimpleRe =
  /\.org-main\s*\{\s*margin-left:\s*220px;[^}]+\}\s*@media\s*\(max-width:\s*640px\)\s*\{\s*\.org-main\s*\{[^}]+\}\s*\}/g;

orgFiles.forEach(function (file) {
  var fp = path.join(orgDir, file);
  var html = fs.readFileSync(fp, "utf8");
  var changed = false;

  if (orgMainBlockRe.test(html)) {
    html = html.replace(orgMainBlockRe, "");
    changed = true;
  } else if (orgMainSimpleRe.test(html)) {
    html = html.replace(orgMainSimpleRe, "");
    changed = true;
  }

  if (!html.includes("../js/sidebar.js")) {
    html = html.replace(/<\/body>\s*<\/html>\s*$/, sidebarScripts + "</body>\n</html>");
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(fp, html);
    console.log("Updated org:", file);
  }
});

const volFiles = fs.readdirSync(volDir).filter(function (f) {
  return f.endsWith(".html");
});

volFiles.forEach(function (file) {
  var fp = path.join(volDir, file);
  var html = fs.readFileSync(fp, "utf8");

  if (!html.includes("vol-chrome-root") && !html.includes("volunteer-chrome.js")) {
    return;
  }

  if (html.includes("../js/sidebar.js")) {
    return;
  }

  html = html.replace(
    '<script src="../js/volunteer-chrome.js"></script>',
    '<script src="../js/sidebar.js"></script>\n  <script src="../js/volunteer-chrome.js"></script>'
  );

  fs.writeFileSync(fp, html);
  console.log("Updated volunteer:", file);
});
