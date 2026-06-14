/**
 * HourHero local dev server
 * - Serves static files on port 3000
 * - Proxies /api/chat to Google Gemini (free API key)
 */
var fs     = require("fs");
var path   = require("path");
var dotenv = require("dotenv");

var ROOT = __dirname;

function loadEnv() {
  var envPath     = path.join(ROOT, ".env");
  var examplePath = path.join(ROOT, ".env.example");

  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath });
    return ".env";
  }

  if (fs.existsSync(examplePath)) {
    dotenv.config({ path: examplePath });
    console.log(
      "Note: No .env file found — loaded settings from .env.example.\n" +
      "       Create a .env file (copy .env.example) so your API key is not committed to git."
    );
    return ".env.example";
  }

  return null;
}

var loadedFrom = loadEnv();

// Strip accidental quotes / spaces from the key
if (process.env.GEMINI_API_KEY) {
  process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY.trim().replace(/^["']|["']$/g, "");
}

var express = require("express");

var app  = express();
var PORT = process.env.PORT || 3000;
var GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-2.5-flash";

var mailTransport = null;

function getMailTransport() {
  if (mailTransport) return mailTransport;

  var host = process.env.SMTP_HOST;
  var user = process.env.SMTP_USER;
  var pass = process.env.SMTP_PASS;

  if (!host || !user || !pass) return null;

  var nodemailer = require("nodemailer");
  mailTransport = nodemailer.createTransport({
    host:   host,
    port:   parseInt(process.env.SMTP_PORT || "587", 10),
    secure: process.env.SMTP_PORT === "465",
    auth:   { user: user, pass: pass }
  });

  return mailTransport;
}

function buildOpportunityDeletedEmail(name, opportunityTitle, orgName) {
  var safeName = name || "Volunteer";
  var safeOpp  = opportunityTitle || "an opportunity";
  var safeOrg  = orgName || "the organization";

  var text =
    "Hi " + safeName + ",\n\n" +
    "We're sorry to let you know that \"" + safeOpp + "\" posted by " + safeOrg +
    " has been removed from HourHero.\n\n" +
    "You have been unenrolled from this opportunity. If you already logged hours, " +
    "your existing submissions are unchanged.\n\n" +
    "Browse other opportunities in HourHero anytime.\n\n" +
    "— HourHero";

  var html =
    "<div style=\"font-family:system-ui,sans-serif;max-width:520px;color:#111;\">" +
      "<p>Hi " + escapeHtml(safeName) + ",</p>" +
      "<p>We're sorry to let you know that <strong>" + escapeHtml(safeOpp) +
      "</strong> posted by <strong>" + escapeHtml(safeOrg) +
      "</strong> has been removed from HourHero.</p>" +
      "<p>You have been unenrolled from this opportunity. If you already logged hours, " +
      "your existing submissions are unchanged.</p>" +
      "<p>Browse other opportunities in HourHero anytime.</p>" +
      "<p style=\"color:#6B7280;font-size:0.9rem;\">— HourHero</p>" +
    "</div>";

  return {
    subject: "Update: \"" + safeOpp + "\" has been removed",
    text:    text,
    html:    html
  };
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

app.use(express.json({ limit: "1mb" }));

app.post("/api/notify-opportunity-deleted", function (req, res) {
  var transport = getMailTransport();
  var volunteers        = req.body.volunteers || [];
  var opportunityTitle  = req.body.opportunityTitle || "an opportunity";
  var orgName           = req.body.orgName || "the organization";

  if (!volunteers.length) {
    return res.json({ ok: true, sent: 0, skipped: false });
  }

  if (!transport) {
    return res.json({
      ok:      true,
      sent:    0,
      skipped: true,
      reason:  "SMTP not configured"
    });
  }

  var from = process.env.SMTP_FROM || process.env.SMTP_USER;
  var jobs = volunteers.map(function (v) {
    if (!v.email) return Promise.resolve(null);
    var content = buildOpportunityDeletedEmail(v.name, opportunityTitle, orgName);
    return transport.sendMail({
      from:    from,
      to:      v.email,
      subject: content.subject,
      text:    content.text,
      html:    content.html
    });
  });

  Promise.all(jobs)
    .then(function (results) {
      var sent = results.filter(Boolean).length;
      res.json({ ok: true, sent: sent, skipped: false });
    })
    .catch(function (err) {
      res.status(500).json({ error: err.message || "Failed to send email" });
    });
});

app.post("/api/chat", function (req, res) {
  var apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey || apiKey === "your-gemini-api-key-here") {
    return res.status(503).json({
      error:
        "GEMINI_API_KEY is missing. Get a free key at https://aistudio.google.com/apikey " +
        "then put it in a file named .env (not only .env.example): GEMINI_API_KEY=your-key"
    });
  }

  var system   = req.body.system   || "";
  var messages = req.body.messages || [];
  if (!messages.length) {
    return res.status(400).json({ error: "messages array is required" });
  }

  var contents = messages.map(function (m) {
    return {
      role:  m.role === "assistant" ? "model" : "user",
      parts: [{ text: String(m.content || "") }]
    };
  });

  // Gemini requires alternating user/model turns
  contents = mergeConsecutiveRoles(contents);

  var body = {
    contents: contents,
    generationConfig: { maxOutputTokens: 1024 }
  };

  if (system) {
    body.systemInstruction = { parts: [{ text: system }] };
  }

  function callModel(model) {
    var url =
      "https://generativelanguage.googleapis.com/v1beta/models/" +
      encodeURIComponent(model) +
      ":generateContent?key=" +
      encodeURIComponent(apiKey);

    return fetch(url, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(body)
    }).then(function (r) {
      return r.json().then(function (data) {
        return { ok: r.ok, status: r.status, data: data, model: model };
      });
    });
  }

  var fallbacks = [GEMINI_MODEL, "gemini-2.5-flash", "gemini-2.0-flash-lite"];
  fallbacks = fallbacks.filter(function (m, i, a) { return a.indexOf(m) === i; });

  function tryNext(i) {
    if (i >= fallbacks.length) {
      return res.status(502).json({
        error: "All Gemini models failed. Check your API key and quota at https://aistudio.google.com/apikey"
      });
    }

    return callModel(fallbacks[i]).then(function (result) {
      var data = result.data;

      if (!result.ok) {
        var msg =
          (data.error && data.error.message) ||
          ("Gemini API error " + result.status);

        // Quota or model not found — try next model
        if (result.status === 429 || result.status === 404) {
          console.warn("Gemini model " + fallbacks[i] + " failed: " + msg);
          return tryNext(i + 1);
        }
        return res.status(result.status).json({ error: msg });
      }

      var parts =
        data.candidates &&
        data.candidates[0] &&
        data.candidates[0].content &&
        data.candidates[0].content.parts;

      var text = (parts || [])
        .map(function (p) { return p.text || ""; })
        .join("")
        .trim();

      if (!text) {
        return res.status(502).json({ error: "Empty response from Gemini" });
      }

      res.json({ content: [{ type: "text", text: text }] });
    });
  }

  tryNext(0).catch(function (err) {
    res.status(500).json({ error: err.message || "Proxy request failed" });
  });
});

function mergeConsecutiveRoles(contents) {
  var out = [];
  contents.forEach(function (c) {
    if (out.length && out[out.length - 1].role === c.role) {
      out[out.length - 1].parts[0].text += "\n\n" + c.parts[0].text;
    } else {
      out.push({
        role:  c.role,
        parts: [{ text: c.parts[0].text }]
      });
    }
  });
  if (out.length && out[0].role === "model") {
    out.unshift({ role: "user", parts: [{ text: "(conversation start)" }] });
  }
  return out;
}

app.use(express.static(ROOT));

app.listen(PORT, function () {
  console.log("HourHero running at http://localhost:" + PORT);
  if (loadedFrom) {
    console.log("Env loaded from: " + loadedFrom);
  }
  if (!process.env.GEMINI_API_KEY || process.env.GEMINI_API_KEY === "your-gemini-api-key-here") {
    console.log("Warning: GEMINI_API_KEY not set — AI chat will not work.");
    console.log("Free key: https://aistudio.google.com/apikey → save in .env");
  } else {
    console.log("AI chat: Google Gemini (default model: " + GEMINI_MODEL + ")");
  }
  if (!getMailTransport()) {
    console.log("Warning: SMTP not configured — opportunity deletion emails will not send.");
    console.log("Add SMTP_HOST, SMTP_USER, SMTP_PASS (and optional SMTP_FROM) to .env");
  } else {
    console.log("Email: SMTP configured for volunteer notifications");
  }
});
