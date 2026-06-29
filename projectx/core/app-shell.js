class ProjectXApp {
  constructor(options = {}) {
    this.moduleKey = options.moduleKey || "dashboard";
    this.moduleTitle = options.moduleTitle || "Project X Module";
    this.moduleSubtitle = options.moduleSubtitle || "Teaching Intelligence Platform";
    this.defaultView = options.defaultView || "dashboard";

    this.navigationUrl =
      "/rolandocvaldeshernandez/projectx/config/module-navigation.json";

    this.navTarget = null;
    this.workspaceTarget = null;
    this.moduleTitleTarget = null;

    this.currentView = this.defaultView;
    this.navigationItems = [];
  }

  async initialise() {
    this.cacheElements();
    this.setHeader();
    await this.loadModuleNavigation();
    this.renderNavigation();
    this.renderView(this.currentView);
    this.registerEvents();
  }

  cacheElements() {
    this.navTarget = document.getElementById("moduleNavigation");
    this.workspaceTarget = document.getElementById("moduleWorkspace");
    this.moduleTitleTarget = document.getElementById("moduleTitle");
  }

  setHeader() {
    setTimeout(() => {
      const pageTitle = document.getElementById("projectxPageTitle");
      const pageSubtitle = document.getElementById("projectxPageSubtitle");

      if (pageTitle) pageTitle.textContent = this.moduleTitle;
      if (pageSubtitle) pageSubtitle.textContent = this.moduleSubtitle;
    }, 200);
  }

  async loadModuleNavigation() {
    try {
      const response = await fetch(this.navigationUrl, { cache: "no-store" });

      if (!response.ok) {
        throw new Error(`Navigation request failed: ${response.status}`);
      }

      const data = await response.json();
      this.navigationItems = data[this.moduleKey] || [];
    } catch (error) {
      console.error("Project X App Shell Navigation Error:", error);
      this.navigationItems = [];
    }
  }

  renderNavigation() {
    if (!this.navTarget) return;

    if (!this.navigationItems.length) {
      this.navTarget.innerHTML = `
        <div class="module-error">
          No navigation configured for this module.
        </div>
      `;
      return;
    }

    this.navTarget.innerHTML = this.navigationItems
      .map((item) => {
        const isActive = item.view === this.currentView ? "active" : "";

        return `
          <button 
            class="module-nav-item ${isActive}" 
            data-view="${this.escape(item.view)}">
            ${this.escape(item.label || item.title || item.view)}
          </button>
        `;
      })
      .join("");
  }

  registerEvents() {
    if (!this.navTarget) return;

    this.navTarget.addEventListener("click", (event) => {
      const button = event.target.closest(".module-nav-item");
      if (!button) return;

      const view = button.dataset.view;
      this.currentView = view;

      this.navTarget.querySelectorAll(".module-nav-item").forEach((item) => {
        item.classList.remove("active");
      });

      button.classList.add("active");
      this.renderView(view);
    });
  }

  renderView(view) {
    if (!this.workspaceTarget) return;

    const item = this.navigationItems.find((entry) => entry.view === view);
    const title = item?.label || item?.title || this.toTitle(view);

    if (this.moduleTitleTarget) {
      this.moduleTitleTarget.textContent = title;
    }

    const customRendererName = `${this.moduleKey}_${view}`.replace(/-/g, "_");

    if (
      window.ProjectXViews &&
      typeof window.ProjectXViews[customRendererName] === "function"
    ) {
      this.workspaceTarget.innerHTML =
        window.ProjectXViews[customRendererName](this);
      return;
    }

    this.workspaceTarget.innerHTML = this.defaultViewTemplate(title, view);
  }

  defaultViewTemplate(title, view) {
    return `
      <div class="projectx-card">
        <span class="projectx-status">${this.escape(this.moduleTitle)}</span>
        <h2>${this.escape(title)}</h2>
        <p>
          This workspace view is ready for development inside Project X.
        </p>

        <div class="projectx-grid" style="margin-top: 20px;">
          <div class="projectx-card">
            <h3>Workspace</h3>
            <p>Design the main tools and content for the ${this.escape(title)} view.</p>
          </div>

          <div class="projectx-card">
            <h3>Data</h3>
            <p>Connect this view to future JSON, forms, tables, dashboards or AI tools.</p>
          </div>

          <div class="projectx-card">
            <h3>Status</h3>
            <p>
              Module key: <strong>${this.escape(this.moduleKey)}</strong><br>
              View key: <strong>${this.escape(view)}</strong>
            </p>
          </div>
        </div>
      </div>
    `;
  }

  toTitle(value) {
    return String(value || "")
      .replace(/-/g, " ")
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  escape(value) {
    return String(value || "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }
}

window.ProjectXApp = ProjectXApp;