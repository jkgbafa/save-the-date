(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sections = document.querySelectorAll('.cover, .section, .footer, .rsvp-main, .rsvp-foot, .legal-main');
  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('garden-visible', entry.isIntersecting);
      if (entry.isIntersecting) entry.target.classList.remove('garden-wait');
    });
  }, { threshold: 0, rootMargin: '0px 0px -30px 0px' }) : null;
  sections.forEach(function (section, index) {
    section.classList.add('garden-section');
    if (observer && !reduced) section.classList.add('garden-wait');
    ['top', 'bottom'].forEach(function (side) {
      var flower = document.createElement('img');
      flower.className = 'garden-art garden-' + side;
      flower.src = 'assets/invitation-flowers.png';
      flower.alt = ''; flower.setAttribute('aria-hidden', 'true');
      flower.width = 1024; flower.height = 1024;
      flower.loading = index === 0 ? 'eager' : 'lazy';
      flower.decoding = 'async';
      section.prepend(flower);
    });
    if (observer) observer.observe(section);
    else section.classList.add('garden-visible');
  });
})();
