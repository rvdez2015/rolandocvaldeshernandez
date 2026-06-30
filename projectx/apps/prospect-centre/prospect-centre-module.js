window.ProjectXViews = window.ProjectXViews || {};

const ProspectCentre = {
  dataUrl: "/rolandocvaldeshernandez/projectx/data/prospect-centre/prospect-links.json",
  baseUrl: "https://rvdez2015.github.io/rolandocvaldeshernandez",
  data: null,

  async loadData() {
    if (this.data) return this.data;

    const response = await fetch(this.dataUrl, { cache: "no-store" });
    if (!response.ok) throw new Error("Prospect data could not be loaded.");
    this.data = await response.json();
    return this.data;
  },

  absoluteUrl(path) {
    if (!path) return "#";
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    return `${this.baseUrl}${path}`;
  },

  escape(value) {
    return String(value || "").replace(/[&<>"']/g, char => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#039;"
    }[char]));
  },

  card(title, value, description) {
    return `
      <div class="projectx-card">
        <span class="projectx-status">${this.escape(title)}</span>
        <h3 style="font-size: 2rem; margin: 10px 0;">${this.escape(value)}</h3>
        <p>${this.escape(description)}</p>
      </div>
    `;
  },

  copyScript() {
    return `
      <script>
        function copyProspectLink(value) {
          navigator.clipboard.writeText(value).then(() => {
            const toast = document.getElementById("prospectToast");
            if (toast) {
              toast.textContent = "Copied to clipboard";
              toast.style.opacity = "1";
              setTimeout(() => toast.style.opacity = "0", 1600);
            }
          });
        }
      <\/script>
    `;
  },

  styles() {
    return `
      <style>
        .prospect-hero {
          background: linear-gradient(135deg, #0b5cad 0%, #1e5eff 58%, #8cbf2f 100%);
          color: white;
          border-radius: 22px;
          padding: 28px;
          margin-bottom: 22px;
          box-shadow: var(--px-shadow);
        }
        .prospect-hero h2 { margin: 8px 0 10px; font-size: clamp(2rem,4vw,3.6rem); letter-spacing: -.05em; }
        .prospect-hero p { max-width: 850px; color: rgba(255,255,255,.92); line-height: 1.65; }
        .prospect-actions { display:flex; flex-wrap:wrap; gap:12px; margin-top:20px; }
        .prospect-actions a, .prospect-actions button, .prospect-button {
          display:inline-flex; align-items:center; justify-content:center; min-height:42px; padding:0 16px;
          border-radius:999px; border:1px solid rgba(255,255,255,.4); font-weight:800; cursor:pointer; text-decoration:none;
        }
        .prospect-primary { background:#fff; color:#0b5cad; }
        .prospect-secondary { background:rgba(255,255,255,.14); color:#fff; }
        .prospect-link-grid { display:grid; grid-template-columns:repeat(auto-fit,minmax(260px,1fr)); gap:16px; }
        .prospect-link-card { background:#fff; border:1px solid var(--px-border); border-radius:18px; padding:20px; box-shadow:var(--px-shadow); }
        .prospect-link-card h3 { margin:8px 0 10px; color:var(--px-blue); }
        .prospect-link-card p { color:var(--px-muted); line-height:1.55; }
        .prospect-url { font-size:.78rem; color:var(--px-muted); word-break:break-all; background:#f6f8fc; border:1px solid var(--px-border); padding:10px; border-radius:12px; margin:12px 0; }
        .prospect-card-actions { display:flex; flex-wrap:wrap; gap:10px; margin-top:14px; }
        .prospect-card-actions a, .prospect-card-actions button { border:0; border-radius:999px; padding:10px 14px; font-weight:800; cursor:pointer; text-decoration:none; }
        .prospect-card-actions a { background:var(--px-blue); color:#fff; }
        .prospect-card-actions button { background:var(--px-blue-soft); color:var(--px-blue); }
        #prospectToast { position:fixed; right:24px; bottom:24px; background:#172033; color:#fff; padding:12px 16px; border-radius:12px; opacity:0; transition:.2s; z-index:50; }
        .template-box { background:#fbfdff; border:1px solid var(--px-border); border-radius:16px; padding:16px; color:var(--px-text); line-height:1.6; }
      </style>
    `;
  },

  async dashboard() {
    const data = await this.loadData();
    const pack = data.packs[0];
    const packUrl = this.absoluteUrl(pack.url);
    return `
      ${this.styles()}
      <div id="prospectToast"></div>
      <section class="prospect-hero">
        <span class="projectx-status" style="background:rgba(255,255,255,.2); color:#fff;">Ready to Share</span>
        <h2>Prospect Pack</h2>
        <p>
          A single professional link for recruiters, schools and senior leaders. It brings together
          the portfolio, QTS recommendation status, Project X platform, curriculum evidence,
          recommendations and architecture documentation.
        </p>
        <div class="prospect-actions">
          <a class="prospect-primary" href="${this.escape(packUrl)}" target="_blank">Open Prospect Pack</a>
          <button class="prospect-secondary" onclick="copyProspectLink('${this.escape(packUrl)}')">Copy Share Link</button>
        </div>
      </section>
      <div class="projectx-grid" style="margin-bottom:22px;">
        ${this.card("Share Packs", data.packs.length, "Curated public-facing pages.")}
        ${this.card("Prospect Links", data.links.length, "Important professional links tracked in one place.")}
        ${this.card("Status", "Live", "Ready to send to prospects from GitHub Pages.")}
      </div>
      <div class="projectx-card">
        <h3>Primary link to send</h3>
        <div class="prospect-url">${this.escape(packUrl)}</div>
        <div class="prospect-card-actions">
          <a href="${this.escape(packUrl)}" target="_blank">Open</a>
          <button onclick="copyProspectLink('${this.escape(packUrl)}')">Copy Link</button>
        </div>
      </div>
      ${this.copyScript()}
    `;
  },

  async links(categoryFilter = null) {
    const data = await this.loadData();
    const links = categoryFilter ? data.links.filter(link => link.category === categoryFilter) : data.links;
    return `
      ${this.styles()}
      <div id="prospectToast"></div>
      <div class="prospect-link-grid">
        ${links.map(link => {
          const url = this.absoluteUrl(link.url);
          return `
            <article class="prospect-link-card">
              <span class="projectx-status">${this.escape(link.category)}</span>
              <h3>${this.escape(link.title)}</h3>
              <p>${this.escape(link.description)}</p>
              <div class="prospect-url">${this.escape(url)}</div>
              <div class="prospect-card-actions">
                <a href="${this.escape(url)}" target="_blank">Open</a>
                <button onclick="copyProspectLink('${this.escape(url)}')">Copy</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
      ${this.copyScript()}
    `;
  },

  async packs() {
    const data = await this.loadData();
    return `
      ${this.styles()}
      <div id="prospectToast"></div>
      <div class="prospect-link-grid">
        ${data.packs.map(pack => {
          const url = this.absoluteUrl(pack.url);
          return `
            <article class="prospect-link-card">
              <span class="projectx-status">${this.escape(pack.status)}</span>
              <h3>${this.escape(pack.title)}</h3>
              <p><strong>Audience:</strong> ${this.escape(pack.audience)}</p>
              <p>${this.escape(pack.description)}</p>
              <div class="prospect-url">${this.escape(url)}</div>
              <div class="prospect-card-actions">
                <a href="${this.escape(url)}" target="_blank">Open Pack</a>
                <button onclick="copyProspectLink('${this.escape(url)}')">Copy Link</button>
              </div>
            </article>
          `;
        }).join("")}
      </div>
      ${this.copyScript()}
    `;
  },

  async templates() {
    const data = await this.loadData();
    return `
      ${this.styles()}
      <div id="prospectToast"></div>
      <div class="projectx-grid">
        ${data.messageTemplates.map(template => `
          <div class="projectx-card">
            <span class="projectx-status">Message Template</span>
            <h3>${this.escape(template.title)}</h3>
            <div class="template-box">${this.escape(template.body)}</div>
            <div class="prospect-card-actions">
              <button onclick="copyProspectLink('${this.escape(template.body)}')">Copy Message</button>
            </div>
          </div>
        `).join("")}
      </div>
      ${this.copyScript()}
    `;
  }
};

window.ProjectXViews.prospect_centre_dashboard = () => {
  ProspectCentre.dashboard().then(html => document.getElementById("moduleWorkspace").innerHTML = html);
  return `<div class="projectx-card"><p>Loading Prospect Centre...</p></div>`;
};

window.ProjectXViews.prospect_centre_share_packs = () => {
  ProspectCentre.packs().then(html => document.getElementById("moduleWorkspace").innerHTML = html);
  return `<div class="projectx-card"><p>Loading share packs...</p></div>`;
};

window.ProjectXViews.prospect_centre_links = () => {
  ProspectCentre.links().then(html => document.getElementById("moduleWorkspace").innerHTML = html);
  return `<div class="projectx-card"><p>Loading prospect links...</p></div>`;
};

window.ProjectXViews.prospect_centre_evidence = () => {
  ProspectCentre.links("Evidence").then(html => document.getElementById("moduleWorkspace").innerHTML = html);
  return `<div class="projectx-card"><p>Loading evidence links...</p></div>`;
};

window.ProjectXViews.prospect_centre_templates = () => {
  ProspectCentre.templates().then(html => document.getElementById("moduleWorkspace").innerHTML = html);
  return `<div class="projectx-card"><p>Loading templates...</p></div>`;
};

window.ProjectXViews.prospect_centre_settings = () => `
  <div class="projectx-card">
    <span class="projectx-status">Settings</span>
    <h2>Prospect Centre Settings</h2>
    <p>
      Public prospect links are configured in
      <code>projectx/data/prospect-centre/prospect-links.json</code>.
    </p>
    <p>
      Update that JSON file when new documents, packs or public evidence links are added.
    </p>
  </div>
`;
