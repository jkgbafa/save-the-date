(function () {
  'use strict';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var sections = document.querySelectorAll('.cover, .footer, .rsvp-foot');
  var observer = 'IntersectionObserver' in window ? new IntersectionObserver(function (entries) {
    entries.forEach(function (entry) {
      entry.target.classList.toggle('garden-visible', entry.isIntersecting);
      if (entry.isIntersecting) entry.target.classList.remove('garden-wait');
    });
  }, { threshold: 0, rootMargin: '0px 0px -30px 0px' }) : null;
  sections.forEach(function (section, index) {
    section.classList.add('garden-section');
    if (observer && !reduced) section.classList.add('garden-wait');
    (section.classList.contains('cover') ? ['top', 'bottom'] : ['bottom']).forEach(function (side) {
      var flower = document.createElement('img');
      flower.className = 'garden-art garden-' + side;
      flower.src = 'assets/invitation-flowers.png';
      flower.alt = ''; flower.setAttribute('aria-hidden', 'true');
      flower.width = 1024; flower.height = 1024;
      flower.loading = index === 0 ? 'eager' : 'lazy';
      flower.decoding = 'async';
      section.prepend(flower);
    });
    if (section.classList.contains('cover') && !reduced) {
      ['first', 'second'].forEach(function (position) {
        var butterfly = document.createElement('span');
        butterfly.className = 'garden-butterfly butterfly-' + position;
        butterfly.setAttribute('aria-hidden', 'true');
        butterfly.innerHTML = '<svg viewBox="0 0 32 26" fill="currentColor"><g class="wing"><path d="M16 14C2-8-6 8 13 18C0 16 7 30 16 18Z" opacity=".8"/><path d="M16 14C30-8 38 8 19 18C32 16 25 30 16 18Z" opacity=".65"/></g><path d="M16 9v12" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>';
        section.appendChild(butterfly);
      });
    }
    if (observer) observer.observe(section);
    else section.classList.add('garden-visible');
  });
})();
