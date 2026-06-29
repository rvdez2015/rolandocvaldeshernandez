const ProjectXConfig = {
  basePath: "/rolandocvaldeshernandez/projectx"
};

async function loadComponent(targetId, componentPath) {
  const target = document.getElementById(targetId);

  if (!target) {
    console.warn(`Project X Loader: Missing target #${targetId}`);
    return;
  }

  try {
    const response = await fetch(componentPath, { cache: "no-store" });

    if (!response.ok) {
      throw new Error(`Failed to load component: ${componentPath}`);
    }

    target.innerHTML = await response.text();
  } catch (error) {
    console.error("Project X component loading error:", error);
  }
}

async function initialiseProjectX() {
  await loadComponent(
    "projectxSidebar",
    `${ProjectXConfig.basePath}/components/sidebar/sidebar.html`
  );

  await loadComponent(
    "projectxHeader",
    `${ProjectXConfig.basePath}/components/header/header.html`
  );

  if (typeof initialiseNavigation === "function") {
    initialiseNavigation();
  }

  if (typeof initialiseTheme === "function") {
    initialiseTheme();
  }
}