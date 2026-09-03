/* Joshua & Lucia — save-the-date edition
   nav, scroll reveals, scrollspy, countdown, live status,
   message wall (guestbook), reminders signup, gifts card link */

(function () {
  "use strict";

  var $ = function (id) { return document.getElementById(id); };

  // ---------- nav: transparent over the cover, solid once scrolled past it ----------
  var navEl = $("nav");
  var cover = $("home");
  if (cover && "IntersectionObserver" in window) {
    var navIO = new IntersectionObserver(function (entries) {
      navEl.classList.toggle("scrolled", !entries[0].isIntersecting);
    }, { rootMargin: "-66px 0px 0px 0px", threshold: 0 });
    navIO.observe(cover);
  } else {
    navEl.classList.add("scrolled");
  }

  // ---------- scroll reveals (text + background silhouettes) ----------
  // Reveal a section's silhouettes by watching the SECTION — a clip-path "draw"
  // collapses the silhouette's box, which fools per-element observers.
  var io = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      var t = en.target;
      if (t.classList.contains("has-sil")) {
        t.querySelectorAll(".sil, .sil-svg").forEach(function (s) { s.classList.add("in"); });
      } else {
        t.classList.add("in");
      }
      io.unobserve(t);
    });
  }, { threshold: 0.08, rootMargin: "0px 0px -40px 0px" });
  document.querySelectorAll(".fade-up").forEach(function (el) { io.observe(el); });
  document.querySelectorAll(".has-sil").forEach(function (el) { io.observe(el); });

  // ---------- tap-to-copy (fund numbers) ----------
  document.querySelectorAll(".copy").forEach(function (btn) {
    btn.addEventListener("click", function () {
      var val = btn.getAttribute("data-copy");
      var done = function () {
        var em = btn.querySelector("em"); var old = em ? em.textContent : "";
        btn.classList.add("copied"); if (em) em.textContent = "copied!";
        setTimeout(function () { btn.classList.remove("copied"); if (em) em.textContent = old; }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(val).then(done, done);
      } else {
        var t = document.createElement("textarea"); t.value = val; document.body.appendChild(t);
        t.select(); try { document.execCommand("copy"); } catch (e) {} document.body.removeChild(t); done();
      }
    });
  });

  // ---------- scrollspy ----------
  var navLinks = document.querySelectorAll("#navLinks a");
  var sections = [];
  navLinks.forEach(function (a) {
    var sec = document.querySelector(a.getAttribute("href"));
    if (sec) sections.push({ a: a, sec: sec });
  });
  var spy = new IntersectionObserver(function (entries) {
    entries.forEach(function (en) {
      if (!en.isIntersecting) return;
      sections.forEach(function (s) {
        var active = s.sec === en.target;
        s.a.classList.toggle("active", active);
        if (active) s.a.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
      });
    });
  }, { rootMargin: "-30% 0px -60% 0px" });
  sections.forEach(function (s) { spy.observe(s.sec); });

  // ---------- mobile hamburger menu ----------
  var burger = $("navBurger");
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

  // ---------- countdown ----------
  var target = new Date(WEDDING_ISO).getTime();
  function tick() {
    var diff = Math.max(0, target - Date.now());
    var d = Math.floor(diff / 86400000);
    var h = Math.floor(diff / 3600000) % 24;
    var m = Math.floor(diff / 60000) % 60;
    var s = Math.floor(diff / 1000) % 60;
    $("cdDays").textContent = d;
    $("cdHours").textContent = String(h).padStart(2, "0");
    $("cdMins").textContent = String(m).padStart(2, "0");
    $("cdSecs").textContent = String(s).padStart(2, "0");
  }
  tick();
  setInterval(tick, 1000);

  // ---------- live status (from backend) ----------
  function checkLive() {
    if (!APPS_SCRIPT_URL) return;
    fetch(APPS_SCRIPT_URL + "?action=config")
      .then(function (r) { return r.json(); })
      .then(function (cfg) {
        if (cfg.isLive && cfg.livestreamUrl) {
          $("liveWaiting").hidden = true;
          $("liveNow").hidden = false;
          $("liveLink").href = cfg.livestreamUrl;
          var banner = $("liveBanner");
          banner.href = cfg.livestreamUrl;
          banner.hidden = false;
        }
      })
      .catch(function () { /* backend unreachable — page still works */ });
  }
  checkLive();
  setInterval(checkLive, 90000);

  // ---------- shared: post a form to the backend (no-op without one) ----------
  var SAVE_ERR = "We couldn’t save this yet — the guest list isn’t connected. Please write to joshuagbafa108@gmail.com, or try again in a little while.";

  function postToBackend(fields) {
    if (!APPS_SCRIPT_URL) return Promise.reject(new Error("unconfigured"));
    var data = new URLSearchParams(fields);
    return fetch(APPS_SCRIPT_URL, { method: "POST", body: data })
      .then(function (r) { return r.json(); });
  }

  function showThanksModal(kind) {
    var title = $("thanksModalTitle");
    var body = $("thanksModalBody");
    if (title) title.textContent = "Thank you";
    var k = String(kind || "").toLowerCase();
    var text = "We have received this. You will get a message from Joshua and Lucia soon.";
    if (k === "phone" || k === "sms" || k === "whatsapp" || k === "both" || k === "text") {
      text = "We have received this. You will get a text from Joshua and Lucia soon.";
    } else if (k === "email") {
      text = "We have received this. You will get an email from Joshua and Lucia soon.";
    }
    if (body) body.textContent = text;
    var m = $("thanksModal");
    if (m) m.hidden = false;
  }
  var thanksOk = $("thanksModalOk");
  if (thanksOk) {
    thanksOk.addEventListener("click", function () { $("thanksModal").hidden = true; });
  }

  // ================= message wall (guestbook) =================
  var WALL_MSGS = [
    { t: "May God bless your marriage and make your home a place of overflowing joy.", n: "Sister Abigail" },
    { t: "It's about time you're getting married lol. Congratulations!!", n: "Kwesi A." },
    { t: "Two of the kindest people we know. We can't wait for November!", n: "The Mensah Family" },
    { t: "Whoso findeth a wife findeth a good thing — and you found a great one!", n: "Pastor Daniel" },
    { t: "Sending so much love from Las Vegas. Save us a dance!", n: "Tina & Marcus" },
    { t: "Lucia, you deserve every bit of this happiness. Love you always!", n: "Efua" },
    { t: "To God be the glory — what a beautiful thing He has done.", n: "Auntie Comfort" },
    { t: "Joshua finally remembered a name — and now he gets to keep it forever. 😂", n: "Nana Yaw" },
    { t: "May your love grow sweeter with every passing year.", n: "Mr. & Mrs. Adusei" },
    { t: "Praying God's richest blessings over your new home.", n: "The Ansah Family" }
  ];

  var wall = $("wall");
  if (wall) {
    var cards = wall.querySelectorAll(".wall-card");
    var next = 0;
    var HOLD = 6000, SWAP = 900, STAGGER = 2100;

    function fill(card) {
      var msg = WALL_MSGS[next % WALL_MSGS.length];
      next++;
      card.querySelector(".wall-text").textContent = msg.t;
      card.querySelector(".wall-name").textContent = "— " + msg.n;
    }
    function cycle(card) {
      card.classList.remove("show");
      setTimeout(function () {
        fill(card);
        card.classList.add("show");
        setTimeout(function () { cycle(card); }, HOLD);
      }, SWAP);
    }
    // start rotating only once the wall scrolls into view
    var wallStarted = false;
    var wallIO = new IntersectionObserver(function (entries) {
      if (wallStarted || !entries[0].isIntersecting) return;
      wallStarted = true;
      wallIO.disconnect();
      cards.forEach(function (card, i) {
        setTimeout(function () {
          fill(card);
          card.classList.add("show");
          setTimeout(function () { cycle(card); }, HOLD + i * 600);
        }, 300 + i * STAGGER);
      });
    }, { threshold: 0.2 });
    wallIO.observe(wall);
  }

  // ---------- message form ----------
  var msgForm = $("msgForm");
  if (msgForm) {
    msgForm.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!msgForm.reportValidity()) return;
      var name = $("msgName").value.trim();
      var text = $("msgText").value.trim();
      if (!name || !text) return;

      var btn = $("msgSubmit"), statusEl = $("msgStatus");
      btn.disabled = true; btn.textContent = "Sending…";
      statusEl.className = "form-status"; statusEl.textContent = "";

      postToBackend({ formType: "message", name: name, message: text })
        .then(function (res) {
          if (!res || !res.ok) {
            statusEl.className = "form-status err";
            statusEl.textContent = (res && res.error) || SAVE_ERR;
            return;
          }
          WALL_MSGS.unshift({ t: text, n: name });
          statusEl.className = "form-status ok";
          statusEl.textContent = "";
          msgForm.reset();
          showThanksModal();
        })
        .catch(function () {
          statusEl.className = "form-status err";
          statusEl.textContent = SAVE_ERR;
        })
        .finally(function () { btn.disabled = false; btn.textContent = "Send your message"; });
    });
  }

  // ================= reminders signup =================
  var remForm = $("remForm");
  if (remForm) {
    var remFields = $("remFields"), remNone = $("remNone"), remStatus = $("remStatus");

    remForm.querySelectorAll('input[name="wantReminders"]').forEach(function (r) {
      r.addEventListener("change", function () {
        var yes = this.value === "Yes";
        remFields.hidden = !yes;
        remNone.hidden = yes;
        remStatus.textContent = "";
        remStatus.className = "form-status";
      });
    });

    function method() {
      var m = remForm.querySelector('input[name="contactMethod"]:checked');
      return m ? m.value : "Email";
    }
    function syncContactFields() {
      var m = method();
      $("remEmailField").hidden = m === "Phone";
      $("remPhoneField").hidden = m === "Email";
    }
    remForm.querySelectorAll('input[name="contactMethod"]').forEach(function (r) {
      r.addEventListener("change", syncContactFields);
    });

    remForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var m = method();
      var name = $("remName").value.trim();
      var email = $("remEmail").value.trim();
      var phone = $("remPhone").value.trim();

      function fail(msg) { remStatus.className = "form-status err"; remStatus.textContent = msg; }
      if (!name) { fail("Please tell us your name."); $("remName").focus(); return; }
      if (m !== "Phone" && (!email || email.indexOf("@") < 1)) { fail("Please enter a valid email address."); $("remEmail").focus(); return; }
      if (m !== "Email" && !phone) { fail("Please enter your phone number."); $("remPhone").focus(); return; }

      var smsOk = $("remSmsConsent") && $("remSmsConsent").checked;
      var btn = $("remSubmit");
      btn.disabled = true; btn.textContent = "Signing you up…";
      remStatus.className = "form-status"; remStatus.textContent = "";

      postToBackend({
        formType: "reminder",
        name: name,
        contactMethod: m,
        email: m === "Phone" ? "" : email,
        phone: m === "Email" ? "" : phone,
        smsConsent: smsOk ? "Yes" : "No"
      })
        .then(function (res) {
          if (!res || !res.ok) {
            fail((res && res.error) || SAVE_ERR);
            return;
          }
          remStatus.className = "form-status ok";
          remStatus.textContent = "";
          remFields.hidden = true;
          var thanksKind = smsOk && (m === "Phone" || m === "Both" || m === "SMS")
            ? m
            : (m === "Phone" ? "" : "email");
          showThanksModal(thanksKind);
        })
        .catch(function () { fail(SAVE_ERR); })
        .finally(function () { btn.disabled = false; btn.textContent = "Sign me up"; });
    });
  }

})();
