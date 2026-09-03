/* Joshua & Lucia — RSVP page (save-the-date edition)
   optional invitation code, live-opt-in, confirm prompt, thank-you */

(function () {
  "use strict";
  var $ = function (id) { return document.getElementById(id); };

  // ---------- mobile hamburger (same pattern as the main site) ----------
  var navEl = $("nav");
  var burger = $("navBurger");
  if (burger && navEl) {
    burger.addEventListener("click", function () {
      var open = navEl.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
      burger.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    });
    document.querySelectorAll("#navLinks a").forEach(function (a) {
      a.addEventListener("click", function () {
        navEl.classList.remove("open");
        burger.setAttribute("aria-expanded", "false");
      });
    });
  }

  // ---- dummy code → name (replace/extend on the backend later) ----
  var CODES = {
    "1234": "Uncle Kwame",
    "ABC": "Auntie Joyce"
  };

  var stepCode = $("stepCode"), stepForm = $("stepForm"), stepThanks = $("stepThanks");
  var form = $("rsvpForm");

  function showForm(name) {
    if (name) {
      $("greeting").innerHTML = "Hi <b>" + esc(name) + "</b> — Joshua &amp; Lucia are so glad you’re here. " +
        "Please fill in the details below. If you won’t be with us in person, you can still sign up to be reminded when we go live.";
      $("fName").value = name;
    } else {
      $("greeting").innerHTML = "We’re so glad you’re here. Please fill in the details below — and if you won’t be with us in person, you can still be reminded when we go live.";
    }
    stepCode.hidden = true;
    stepForm.hidden = false;
    stepForm.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---- step 1: code is optional ----
  $("codeBtn").addEventListener("click", function () {
    var raw = $("codeInput").value.trim();
    if (!raw) { fail("Please type your code, or tap “I don’t have a code” below."); return; }
    var name = CODES[raw] || CODES[raw.toUpperCase()];
    $("fCode").value = raw;
    if (!name) {
      $("codeErr").className = "form-status";
      $("codeErr").textContent = "";
      showForm("");
      return;
    }
    showForm(name);
  });
  $("codeInput").addEventListener("keydown", function (e) { if (e.key === "Enter") $("codeBtn").click(); });
  $("noCodeBtn").addEventListener("click", function () { $("fCode").value = ""; showForm(""); });

  function fail(msg) {
    var el = $("codeErr"); el.className = "form-status err"; el.textContent = msg;
  }

  // ---- guest count + live-notify nudge ----
  function attendingValue() {
    var r = form.querySelector('input[name="attending"]:checked');
    return r ? r.value : "";
  }

  function syncAttendingUi() {
    var attending = attendingValue();
    $("guestsField").hidden = attending !== "In person";
    var remote = attending === "Online" || attending === "Not attending";
    if (remote) {
      $("fNotify").checked = true;
      $("notifyField").classList.add("notify-nudge");
      $("notifyHint").textContent = attending === "Online"
        ? "We’ll send the livestream link the moment we go live — leave this ticked so you don’t miss it."
        : "You can still watch from wherever you are. Leave this ticked and we’ll ping you when we go live.";
    } else {
      $("notifyField").classList.remove("notify-nudge");
      $("notifyHint").textContent = "Especially if you’re watching online: we’ll send the livestream link the moment we start.";
    }
  }
  document.querySelectorAll('input[name="attending"]').forEach(function (r) {
    r.addEventListener("change", syncAttendingUi);
  });

  // ---- submit (with the "would you like to be reminded" confirm) ----
  var pendingSubmit = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;

    var attending = attendingValue();
    var notify = $("fNotify").checked;

    if (!pendingSubmit && attending !== "In person" && !notify) {
      $("confirmModal").hidden = false;
      return;
    }
    pendingSubmit = false;
    doSubmit();
  });

  $("modalNotify").addEventListener("click", function () {
    $("fNotify").checked = true;
    $("confirmModal").hidden = true;
    pendingSubmit = true;
    if (form.requestSubmit) form.requestSubmit();
    else doSubmit();
  });
  $("modalProceed").addEventListener("click", function () {
    $("confirmModal").hidden = true;
    pendingSubmit = true;
    if (form.requestSubmit) form.requestSubmit();
    else doSubmit();
  });

  function validate() {
    var statusEl = $("formStatus");
    function err(msg, el) {
      statusEl.className = "form-status err";
      statusEl.textContent = msg;
      if (el) el.focus();
      return false;
    }
    statusEl.className = "form-status";
    statusEl.textContent = "";

    var name = $("fName").value.trim();
    var email = $("fEmail").value.trim();
    var phone = $("fPhone").value.trim();
    var attending = attendingValue();
    var preferred = (form.querySelector('input[name="preferredContact"]:checked') || {}).value || "Email";

    if (!name) return err("Please tell us your name.", $("fName"));
    if (!email && !phone) return err("Please leave an email or a phone number so we can reach you.", $("fEmail"));
    if (email && email.indexOf("@") < 1) return err("That email address doesn’t look right.", $("fEmail"));
    if (!attending) return err("Please tell us whether you’ll attend in person, online, or not at all.");
    if (preferred === "Email" && !email && phone) {
      // they only gave a phone — that's fine; we'll send updates there
    } else if ((preferred === "SMS" || preferred === "WhatsApp") && !phone) {
      return err("Please add a phone number for " + (preferred === "WhatsApp" ? "WhatsApp" : "text") + " updates, or pick Email.", $("fPhone"));
    }
    return true;
  }

  function doSubmit() {
    if (!validate()) return;
    var btn = $("submitBtn"), statusEl = $("formStatus");
    statusEl.className = "form-status"; statusEl.textContent = "";

    var data = new URLSearchParams(new FormData(form));
    var smsOk = $("fSmsConsent") && $("fSmsConsent").checked;
    data.set("notifyLive", $("fNotify").checked ? "Yes" : "No");
    data.set("smsConsent", smsOk ? "Yes" : "No");
    data.set("formType", "rsvp");
    var name = $("fName").value.trim();
    var email = $("fEmail").value.trim();
    var phone = $("fPhone").value.trim();
    if (smsOk && !email && phone) {
      var prefEl = form.querySelector('input[name="preferredContact"]:checked');
      if (prefEl && prefEl.value === "Email") {
        var smsEl = form.querySelector('input[name="preferredContact"][value="SMS"]');
        if (smsEl) smsEl.checked = true;
        data.set("preferredContact", "SMS");
      }
    }
    var contact = (form.querySelector('input[name="preferredContact"]:checked') || {}).value || "Email";
    if (!smsOk && (contact === "SMS" || contact === "WhatsApp")) {
      contact = "Email";
      data.set("preferredContact", "Email");
    }
    var attending = attendingValue();
    var SAVE_ERR = "We couldn’t save this yet — the guest list isn’t connected. Please write to joshuagbafa108@gmail.com, or try again in a little while.";

    if (!APPS_SCRIPT_URL) {
      statusEl.className = "form-status err";
      statusEl.textContent = SAVE_ERR;
      return;
    }

    btn.disabled = true; btn.textContent = "Sending…";
    fetch(APPS_SCRIPT_URL, { method: "POST", body: data })
      .then(function (r) { return r.json(); })
      .then(function (res) {
        if (res && res.ok) { thankYou(name, contact, attending); }
        else { statusEl.className = "form-status err"; statusEl.textContent = (res && res.error) || "Something went wrong — please try again."; }
      })
      .catch(function () {
        statusEl.className = "form-status err";
        statusEl.textContent = SAVE_ERR;
      })
      .finally(function () { btn.disabled = false; btn.textContent = "Send my RSVP"; });
  }

  function thankYou(name, contact, attending) {
    var smsOk = $("fSmsConsent") && $("fSmsConsent").checked;
    var how = (smsOk && contact === "SMS") ? "text message" : (smsOk && contact === "WhatsApp") ? "WhatsApp" : "email";
    var extra = $("fNotify").checked
      ? " We’ll also ping you the moment the wedding goes live."
      : "";
    $("thanksTitle").textContent = "Thank you, " + (name || "friend") + "!";
    if (attending === "Not attending") {
      $("thanksBody").innerHTML = "We’ve received your RSVP — thank you for letting us know. We’ll miss you, and we’re grateful for your love." + extra;
    } else if (attending === "Online") {
      $("thanksBody").innerHTML = "You’re down to join us online. We’ll be in touch by <b>" + esc(how) + "</b> with the livestream link when the day comes." + extra;
    } else {
      $("thanksBody").innerHTML = "Your RSVP is in — Joshua &amp; Lucia can’t wait to see you. We’ll be in touch by <b>" + esc(how) + "</b> with reminders." + extra;
    }
    stepForm.hidden = true; stepCode.hidden = true;
    stepThanks.hidden = false;
    var popup = $("thanksModal");
    if (popup) {
      var title = $("thanksModalTitle");
      var body = $("thanksModalBody");
      if (title) title.textContent = "Thank you";
      var k = String(contact || "").toLowerCase();
      var text = "We have received this. You will get a message from Joshua and Lucia soon.";
      if (smsOk && (k === "sms" || k === "whatsapp")) {
        text = "We have received this. You will get a text from Joshua and Lucia soon.";
      } else if (k === "email" || ($("fEmail") && $("fEmail").value.trim())) {
        text = "We have received this. You will get an email from Joshua and Lucia soon.";
      }
      if (body) body.textContent = text;
      popup.hidden = false;
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  var thanksOk = $("thanksModalOk");
  if (thanksOk) {
    thanksOk.addEventListener("click", function () { $("thanksModal").hidden = true; });
  }
})();
