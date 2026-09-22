/* Joshua & Lucia — RSVP page (save-the-date edition)
   in person / online / not attending, optional live heads-up, thank-you */

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

  var stepForm = $("stepForm"), stepThanks = $("stepThanks");
  var form = $("rsvpForm");

  function esc(s) { return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) { return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]; }); }

  // ---- guest count + livestream hint ----
  function attendingValue() {
    var r = form.querySelector('input[name="attending"]:checked');
    return r ? r.value : "";
  }

  function syncAttendingUi() {
    var attending = attendingValue();
    $("guestsField").hidden = attending !== "In person";
    if (attending === "Online") {
      $("notifyField").classList.add("notify-nudge");
      $("notifyHint").textContent = "You’re joining online — the livestream will be on our site. Optionally tick this if you’d like us to try email or WhatsApp when we go live. We do not send automated SMS.";
    } else if (attending === "Not attending") {
      $("notifyField").classList.remove("notify-nudge");
      $("notifyHint").textContent = "If you might still watch, choose Online above instead. This box is only an optional note — no automated texts.";
    } else {
      $("notifyField").classList.remove("notify-nudge");
      $("notifyHint").textContent = "The live link will be on our site on the day. Tick this only if you’d like us to try email or WhatsApp as well — we do not send automated SMS blasts.";
    }
  }
  document.querySelectorAll('input[name="attending"]').forEach(function (r) {
    r.addEventListener("change", syncAttendingUi);
  });

  // ---- submit (nudge Online when they can't be in Ghana) ----
  var pendingSubmit = false;
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    if (!validate()) return;

    var attending = attendingValue();

    if (!pendingSubmit && attending === "Not attending") {
      $("confirmTitle").textContent = "Join us online instead?";
      $("confirmBody").textContent = "You’ve said you won’t be there in person. The livestream will be on our site on the wedding day — RSVP as Online so we know you’ll still be with us.";
      $("modalNotify").textContent = "Yes, I’ll join online";
      $("confirmModal").hidden = false;
      return;
    }
    pendingSubmit = false;
    doSubmit();
  });

  $("modalNotify").addEventListener("click", function () {
    var online = form.querySelector('input[name="attending"][value="Online"]');
    if (online) online.checked = true;
    syncAttendingUi();
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
    if (preferred === "WhatsApp" && !phone) {
      return err("Please add a phone number for WhatsApp, or pick Email.", $("fPhone"));
    }
    return true;
  }

  function doSubmit() {
    if (!validate()) return;
    var btn = $("submitBtn"), statusEl = $("formStatus");
    statusEl.className = "form-status"; statusEl.textContent = "";

    var data = new URLSearchParams(new FormData(form));
    data.set("notifyLive", $("fNotify").checked ? "Yes" : "No");
    data.set("formType", "rsvp");
    var name = $("fName").value.trim();
    var contact = (form.querySelector('input[name="preferredContact"]:checked') || {}).value || "Email";
    if (contact === "SMS") {
      contact = "WhatsApp";
      data.set("preferredContact", "WhatsApp");
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
    var how = contact === "WhatsApp" ? "WhatsApp" : "email";
    $("thanksTitle").textContent = "Thank you, " + (name || "friend") + "!";
    if (attending === "Not attending") {
      $("thanksBody").innerHTML = "We’ve received your RSVP — thank you for letting us know. We’ll miss you, and we’re grateful for your love.";
    } else if (attending === "Online") {
      $("thanksBody").innerHTML = "You’re down to join us online. The livestream link will appear on our site on the wedding day." +
        ($("fNotify").checked ? " We’ve noted that you’d like a heads-up by <b>" + esc(how) + "</b> if we can — no automated SMS." : "");
    } else {
      $("thanksBody").innerHTML = "Your RSVP is in — Joshua &amp; Lucia can’t wait to see you. If we need to share anything, we’ll be in touch by <b>" + esc(how) + "</b>.";
    }
    stepForm.hidden = true;
    stepThanks.hidden = false;
    var popup = $("thanksModal");
    if (popup) {
      var title = $("thanksModalTitle");
      var body = $("thanksModalBody");
      if (title) title.textContent = "Thank you";
      var text = "We’ve received your RSVP. Thank you.";
      if ($("fEmail") && $("fEmail").value.trim()) {
        text = "We’ve received your RSVP. If we need to reach you, it will be by email.";
      } else if (String(contact || "").toLowerCase() === "whatsapp") {
        text = "We’ve received your RSVP. If we need to reach you, it will be by WhatsApp — not automated SMS.";
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
