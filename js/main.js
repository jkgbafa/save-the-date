/* Joshua & Lucia — save-the-date edition
   nav, scroll reveals, scrollspy, countdown, live status,
   message wall (guestbook), gifts card link */

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

  function showThanksModal() {
    var title = $("thanksModalTitle");
    var body = $("thanksModalBody");
    if (title) title.textContent = "Thank you";
    if (body) body.textContent = "We have received this. You will get a message from Joshua and Lucia soon.";
    var m = $("thanksModal");
    if (m) m.hidden = false;
  }
  var thanksOk = $("thanksModalOk");
  if (thanksOk) {
    thanksOk.addEventListener("click", function () { $("thanksModal").hidden = true; });
  }

  // ================= message wall (guestbook) =================
  var WALL_MSGS = [
    { t: "I’m so happy for you both! God is gracious! May your love last in Jesus name. Congratulations friends! ❤️", n: "Jennifer" },
    { t: "May your love last forever.", n: "Albert Mensah" },
    { t: "You two are so sweet, you already look like siblings — a match made in Heaven. Counting down with y’all!", n: "Natalie Welds" },
    { t: "GOOD MAN!", n: "Stuart" },
    { t: "Wishing you a lifetime of happiness and the sweetest of memories. PJ POWERRSSSSSS 😂", n: "Thando" },
    { t: "Eh PJ, I don't know who's more excited for your wedding, me or you? 😂 What a blessing! 🔥🥳", n: "Anderson Chateka" },
    { t: "May your love last forever. I can’t wait to be in Ghana to celebrate your beautiful wedding with you!", n: "Itieoboro" },
    { t: "You found your Chick-fil-A! Beautiful! God bless you both with a beautiful marriage.", n: "Closed on Sunday" },
    { t: "I'm so happy for you guys. I pray for a beautiful house full of love. You deserve the best. Much love.", n: "Andres" },
    { t: "Great grace!! And more blessings after 🥳🥳", n: "Lincoln" }
  ];

  var wall = $("wall");
  if (wall) {
    var cards = wall.querySelectorAll(".wall-card");
    var next = 0;
    var HOLD = 7000, SWAP = 900, STAGGER = 160;

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

})();
