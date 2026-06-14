const fs = require("fs");
const path = require("path");

const dir = path.join(__dirname, "..", "org");
const files = fs.readdirSync(dir).filter(function (f) {
  return f.endsWith(".html");
});

const profileCorner =
  '\n  <div class="app-profile-corner">\n' +
  '    <div class="profile-menu-mount"></div>\n' +
  "  </div>\n";

const navScripts =
  '\n  <script src="../js/nav-menu.js"></script>\n' +
  "  <script>\n" +
  "    HH.NavMenu.init({ role: \"org\", settingsPath: \"settings.html\",\n" +
  '                      mountSelector: ".profile-menu-mount" });\n' +
  "  </script>\n";

for (const file of files) {
  const fp = path.join(dir, file);
  let html = fs.readFileSync(fp, "utf8");

  if (!html.includes("app-profile-corner")) {
    html = html.replace(/<body>\s*\n/, "<body>\n" + profileCorner);
  }

  if (!html.includes("../js/nav-menu.js")) {
    html = html.replace(/<\/body>\s*<\/html>\s*$/, navScripts + "</body>\n</html>");
  }

  if (file === "dashboard.html" && !html.includes("app-mobile-nav-right")) {
    html = html.replace(
      '<button class="org-mobile-menu-btn" onclick="toggleMobileMenu()" title="Menu">',
      '<div class="app-mobile-nav-right">' +
        '<button class="org-mobile-menu-btn app-mobile-menu-btn" onclick="toggleMobileMenu()" title="Menu">'
    );
    html = html.replace(
      "</svg>\n    </button>\n  </nav>",
      "</svg>\n    </button>\n      <div class=\"profile-menu-mount\"></div>\n    </div>\n  </nav>"
    );
  }

  fs.writeFileSync(fp, html);
  console.log("Patched:", file);
}
