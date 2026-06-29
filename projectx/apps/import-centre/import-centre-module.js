window.ProjectXViews = window.ProjectXViews || {};

const ProjectXImportCentre = {
  basePath: "/rolandocvaldeshernandez/projectx",

  async fetchJson(path, fallback) {
    try {
      const response = await fetch(path, { cache: "no-store" });
      if (!response.ok) return fallback;
      return await response.json();
    } catch (error) {
      console.warn("Import Centre data unavailable:", path, error);
      return fallback;
    }
  },

  escape(value) {
    return String(value || "").replace(/[&<>"']/g, function(char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  },

  getLocalAcademicYears() {
    try {
      return JSON.parse(localStorage.getItem("projectx-academic-years") || "[]");
    } catch {
      return [];
    }
  },

  saveLocalAcademicYears(years) {
    localStorage.setItem("projectx-academic-years", JSON.stringify(years));
  },

  downloadJson(filename, payload) {
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  },

  async getCounts() {
    const units = await this.fetchJson(`${this.basePath}/data/curriculum/units.json`, []);
    const lessons = await this.fetchJson(`${this.basePath}/data/curriculum/lessons.json`, []);
    const delivery = await this.fetchJson(`${this.basePath}/data/delivery/2025-2026.json`, []);
    const assessment = await this.fetchJson(`${this.basePath}/data/assessment/2025-2026.json`, []);

    return {
      units: Array.isArray(units) ? units.length : (units.units || []).length,
      lessons: Array.isArray(lessons) ? lessons.length : (lessons.lessons || []).length,
      delivery: Array.isArray(delivery) ? delivery.length : (delivery.records || delivery.delivery || []).length,
      assessment: Array.isArray(assessment) ? assessment.length : (assessment.records || assessment.assessments || []).length
    };
  }
};

window.ProjectXViews.import_centre_dashboard = function() {
  setTimeout(async () => {
    const counts = await ProjectXImportCentre.getCounts();
    const targets = {
      importUnits: counts.units,
      importLessons: counts.lessons,
      importDelivery: counts.delivery,
      importAssessment: counts.assessment
    };
    Object.entries(targets).forEach(([id, value]) => {
      const element = document.getElementById(id);
      if (element) element.textContent = value;
    });
  }, 50);

  return `
    <div class="projectx-grid">
      <div class="projectx-card"><span class="projectx-status">Reusable</span><h3>Units</h3><p id="importUnits" style="font-size:2rem;font-weight:900;color:var(--px-blue);">—</p></div>
      <div class="projectx-card"><span class="projectx-status">Reusable</span><h3>Lessons</h3><p id="importLessons" style="font-size:2rem;font-weight:900;color:var(--px-blue);">—</p></div>
      <div class="projectx-card"><span class="projectx-status">Annual</span><h3>Delivery Records</h3><p id="importDelivery" style="font-size:2rem;font-weight:900;color:var(--px-blue);">—</p></div>
      <div class="projectx-card"><span class="projectx-status">Annual</span><h3>Assessment Records</h3><p id="importAssessment" style="font-size:2rem;font-weight:900;color:var(--px-blue);">—</p></div>
    </div>
    <div class="projectx-card" style="margin-top:20px;">
      <span class="projectx-status">Sprint 07</span>
      <h3>Import Centre Foundation</h3>
      <p>
        Project X now has a dedicated place for workbook imports, academic-year creation and future data migration workflows.
        Static GitHub Pages cannot permanently write server files, so this sprint establishes the import workflow, local persistence and data architecture first.
      </p>
    </div>
  `;
};

window.ProjectXViews.import_centre_lesson_tracker = function() {
  setTimeout(async () => {
    const log = await ProjectXImportCentre.fetchJson(`${ProjectXImportCentre.basePath}/data/import-centre/import-log.json`, { imports: [] });
    const body = document.getElementById("importLogBody");
    if (!body) return;
    body.innerHTML = (log.imports || []).map(item => `
      <tr>
        <td>${ProjectXImportCentre.escape(item.source)}</td>
        <td>${ProjectXImportCentre.escape(item.academicYear)}</td>
        <td>${ProjectXImportCentre.escape(item.status)}</td>
        <td>${ProjectXImportCentre.escape(item.date)}</td>
      </tr>
    `).join("") || `<tr><td colspan="4">No imports logged yet.</td></tr>`;
  }, 50);

  return `
    <div class="projectx-card">
      <span class="projectx-status">Workbook Source</span>
      <h3>Lesson Tracker Import</h3>
      <p>
        The Lesson Tracker workbook is treated as a source system. Its curriculum content becomes reusable units and lessons,
        while delivery, assessment and scores belong to a specific academic year.
      </p>
      <div style="overflow:auto;margin-top:18px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Source</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Academic Year</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Status</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Date</th></tr></thead>
          <tbody id="importLogBody"><tr><td colspan="4" style="padding:10px;">Loading import log...</td></tr></tbody>
        </table>
      </div>
    </div>
  `;
};

window.ProjectXViews.import_centre_academic_years = function() {
  setTimeout(() => {
    const form = document.getElementById("academicYearForm");
    const list = document.getElementById("academicYearList");

    function renderYears() {
      const years = ProjectXImportCentre.getLocalAcademicYears();
      list.innerHTML = years.length ? years.map(year => `
        <div class="projectx-card" style="margin-bottom:12px;box-shadow:none;">
          <strong>${ProjectXImportCentre.escape(year.label)}</strong><br>
          <span class="projectx-status">${ProjectXImportCentre.escape(year.status)}</span>
          <p>${ProjectXImportCentre.escape(year.note)}</p>
        </div>
      `).join("") : `<p>No locally created academic years yet.</p>`;
    }

    renderYears();

    form?.addEventListener("submit", event => {
      event.preventDefault();
      const target = document.getElementById("targetAcademicYear").value.trim();
      if (!target) return;
      const years = ProjectXImportCentre.getLocalAcademicYears();
      years.push({ id: target, label: target, status: "Draft", source: "Copied from 2025-2026 curriculum structure", note: "Created locally in browser storage. Future sprint will export this as a Project X data package." });
      ProjectXImportCentre.saveLocalAcademicYears(years);
      form.reset();
      renderYears();
    });
  }, 50);

  return `
    <div class="projectx-card">
      <span class="projectx-status">Academic Year Engine</span>
      <h3>Create New Academic Year</h3>
      <p>Create a local draft academic year based on the reusable Project X curriculum model.</p>
      <form id="academicYearForm" style="display:grid;gap:12px;margin-top:16px;">
        <label><strong>Source Year</strong><input value="2025-2026" disabled style="width:100%;padding:12px;border:1px solid var(--px-border);border-radius:12px;margin-top:6px;"></label>
        <label><strong>New Academic Year</strong><input id="targetAcademicYear" placeholder="e.g. 2026-2027" style="width:100%;padding:12px;border:1px solid var(--px-border);border-radius:12px;margin-top:6px;"></label>
        <button class="projectx-button" type="submit">Create Draft Academic Year</button>
      </form>
    </div>
    <div class="projectx-card" style="margin-top:20px;">
      <h3>Local Academic Years</h3>
      <div id="academicYearList"></div>
    </div>
  `;
};

window.ProjectXViews.import_centre_data_model = function() {
  return `
    <div class="projectx-grid">
      <div class="projectx-card"><span class="projectx-status">Reusable</span><h3>Curriculum Library</h3><p>Units, lessons, objectives, resources and vocabulary that can be reused every academic year.</p></div>
      <div class="projectx-card"><span class="projectx-status">Annual</span><h3>Delivery Layer</h3><p>Dates taught, classes, completion notes and planning adjustments for a specific academic year.</p></div>
      <div class="projectx-card"><span class="projectx-status">Annual</span><h3>Assessment Layer</h3><p>Assessments, marks, feedback, targets and evidence tied to a specific cohort and year.</p></div>
    </div>
    <div class="projectx-card" style="margin-top:20px;"><h3>Why this matters</h3><p>Project X can reuse the curriculum next year without copying old delivery dates, old marks or old cohort-specific notes.</p></div>
  `;
};

window.ProjectXViews.import_centre_backups = function() {
  setTimeout(() => {
    const button = document.getElementById("exportAcademicYears");
    button?.addEventListener("click", () => {
      ProjectXImportCentre.downloadJson("projectx-academic-years-export.json", {
        exportedAt: new Date().toISOString(),
        academicYears: ProjectXImportCentre.getLocalAcademicYears()
      });
    });
  }, 50);

  return `
    <div class="projectx-card">
      <span class="projectx-status">Backup</span>
      <h3>Export Local Academic Years</h3>
      <p>Download locally created academic-year drafts as JSON. This is the first step toward Project X backup packages.</p>
      <button id="exportAcademicYears" class="projectx-button">Download Local Export</button>
    </div>
  `;
};

window.ProjectXViews.import_centre_settings = function() {
  return `
    <div class="projectx-card">
      <span class="projectx-status">Settings</span>
      <h3>Import Centre Settings</h3>
      <p>Future settings will control duplicate handling, import validation, source mapping and update detection.</p>
    </div>
  `;
};
