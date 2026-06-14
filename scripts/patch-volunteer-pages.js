const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "volunteer");
const pages = {
  "log-hours.html": "log-hours",
  "opportunities.html": "opportunities",
  "badges.html": "badges",
  "leaderboard.html": "leaderboard",
  "install.html": "install"
};

const bottomNavRe = /\s*<nav class="bottom-nav">[\s\S]*?<\/nav>\s*/;
const topNavRe = /\s*<nav class="top-nav">[\s\S]*?<\/nav>\s*/;
const chromeRoot = "\n\n  <div id=\"vol-chrome-root\"></div>\n\n";

for (const [file, page] of Object.entries(pages)) {
  const fp = path.join(dir, file);
  let html = fs.readFileSync(fp, "utf8");

  if (html.includes("vol-chrome-root")) {
    console.log("Skip (already patched):", file);
    continue;
  }

  html = html.replace(topNavRe, chromeRoot);
  html = html.replace(bottomNavRe, "\n");
  html = html.replace(/class="page-with-nav"/g, 'class="page-with-sidebar"');
  html = html.replace(
    /document\.getElementById\("nav-avatar"\)\.textContent = ini\([^)]+\);/g,
    'if (window.HH && HH.NavMenu) HH.NavMenu.setInitials(ini(s.val() || "HH"));'
  );
  html = html.replace(/bottom: var\(--bottom-nav-height\);/g, "bottom: 0;");
  html = html.replace(
    /margin-bottom: var\(--bottom-nav-height\);/g,
    "margin-bottom: 0;"
  );

  if (!html.includes("../js/theme.js")) {
    html = html.replace("</head>", '  <script src="../js/theme.js"></script>\n</head>');
  }

  const chromeScripts =
    '\n  <script src="../js/nav-menu.js"></script>\n' +
    '  <script src="../js/mobile-nav.js"></script>\n' +
    '  <script src="../js/volunteer-chrome.js"></script>\n' +
    "  <script>\n" +
    '    HH.VolunteerChrome.mount("' + page + '");\n' +
    "  </script>\n</body>\n</html>";

  html = html.replace(/<\/body>\s*<\/html>\s*$/, chromeScripts);
  fs.writeFileSync(fp, html);
  console.log("Updated:", file);
}
