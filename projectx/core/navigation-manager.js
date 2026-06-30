function getCurrentAppKey() {
  const path = window.location.pathname;

  if (path.includes("/apps/curriculum/")) return "curriculum";
  if (path.includes("/apps/assessment/")) return "assessment";
  if (path.includes("/apps/revision/")) return "revision";
  if (path.includes("/apps/question-banks/")) return "question-banks";
  if (path.includes("/apps/tools/")) return "tools";
  if (path.includes("/apps/evidence/")) return "evidence";
  if (path.includes("/apps/import-centre/")) return "import-centre";
  if (path.includes("/apps/documentation/")) return "documentation";
  if (path.includes("/apps/prospect-centre/")) return "prospect-centre";
  if (path.includes("/apps/ai-lab/")) return "ai-lab";
  if (path.includes("/apps/analytics/")) return "analytics";
  if (path.includes("/apps/admin/")) return "admin";

  return "dashboard";
}

function initialiseNavigation() {
  const currentApp = getCurrentAppKey();
  const links = document.querySelectorAll("#projectxNav a");

  links.forEach(link => {
    link.classList.toggle("active", link.dataset.app === currentApp);
  });
}
