'use strict';
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const status = document.getElementById('copy-status');
    try {
      await navigator.clipboard.writeText(button.dataset.copy);
      button.querySelector('.copy-label').textContent = 'Copied';
      status.textContent = 'Copied ' + button.querySelector('span').textContent + '.';
      setTimeout(() => { button.querySelector('.copy-label').textContent = 'Copy'; }, 2500);
    } catch (_) {
      status.textContent = 'Please select and copy the number shown above.';
    }
  });
}
