// Shared navigation for Project X. Does not alter module data or routing.
function getCurrentAppKey() {
  const path = window.location.pathname;
  const match = path.match(/\/projectx\/apps\/([^/]+)\//);
  return match ? match[1] : 'dashboard';
}
function initialiseNavigation() {
  const currentApp = getCurrentAppKey();
  document.querySelectorAll('#projectxNav a[data-app]').forEach(link => {
    const active = link.dataset.app === currentApp;
    link.classList.toggle('active', active);
    if (active) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });
}
