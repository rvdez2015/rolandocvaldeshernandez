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
    return String(value ?? "").replace(/[&<>"']/g, function(char) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;" }[char];
    });
  },

  async getImportData() {
    const base = `${this.basePath}/data`;
    const [units, lessons, delivery, assessments, summary, log] = await Promise.all([
      this.fetchJson(`${base}/curriculum/units.json`, { units: [], metadata: {} }),
      this.fetchJson(`${base}/curriculum/lessons.json`, { lessons: [], metadata: {} }),
      this.fetchJson(`${base}/delivery/2025-2026.json`, { delivery: [], metadata: {} }),
      this.fetchJson(`${base}/assessment/2025-2026.json`, { assessments: [], metadata: {} }),
      this.fetchJson(`${base}/import-centre/lesson-tracker-import-summary.json`, { sheetSummaries: [], validation: [], metadata: {} }),
      this.fetchJson(`${base}/import-centre/import-log.json`, { imports: [] })
    ]);

    return {
      units: units.units || [],
      lessons: lessons.lessons || [],
      delivery: delivery.delivery || [],
      assessments: assessments.assessments || [],
      summary,
      log,
      metadata: units.metadata || summary.metadata || {}
    };
  },

  table(headers, rows) {
    return `
      <div style="overflow:auto;margin-top:16px;">
        <table style="width:100%;border-collapse:collapse;font-size:.92rem;">
          <thead>
            <tr>${headers.map(h => `<th style="text-align:left;padding:10px;background:var(--px-blue-soft);border-bottom:1px solid var(--px-border);">${this.escape(h)}</th>`).join("")}</tr>
          </thead>
          <tbody>
            ${rows.length ? rows.join("") : `<tr><td colspan="${headers.length}" style="padding:10px;">No records found.</td></tr>`}
          </tbody>
        </table>
      </div>
    `;
  },

  getLocalAcademicYears() {
    try { return JSON.parse(localStorage.getItem("projectx-academic-years") || "[]"); }
    catch { return []; }
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
  }
};

window.ProjectXViews.import_centre_dashboard = function() {
  setTimeout(async () => {
    const data = await ProjectXImportCentre.getImportData();
    const counts = data.metadata.counts || {
      units: data.units.length,
      lessons: data.lessons.length,
      deliveryRecords: data.delivery.length,
      assessmentRecords: data.assessments.length,
      resources: 0
    };
    const targets = {
      importUnits: counts.units,
      importLessons: counts.lessons,
      importDelivery: counts.deliveryRecords,
      importAssessment: counts.assessmentRecords,
      importResources: counts.resources || 0,
      importWorkbook: data.metadata.sourceWorkbook || "Lesson Tracker",
      importGenerated: data.metadata.generated || "—"
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
      <span class="projectx-status">Sprint 08</span>
      <h3>Real Import Engine</h3>
      <p>
        Project X has now converted the uploaded Lesson Tracker workbook into reusable curriculum data, yearly delivery data and public-safe assessment aggregates.
      </p>
      <div class="projectx-grid" style="margin-top:16px;">
        <div><strong>Source workbook</strong><br><span id="importWorkbook">—</span></div>
        <div><strong>Generated</strong><br><span id="importGenerated">—</span></div>
        <div><strong>Resources</strong><br><span id="importResources">—</span></div>
      </div>
    </div>
    <div class="projectx-card" style="margin-top:20px;border-left:5px solid var(--px-blue);">
      <h3>Privacy Notice</h3>
      <p>
        Student names and individual marks are intentionally not included in this public GitHub Pages data release. Assessment data is exported only as aggregate statistics.
      </p>
    </div>
  `;
};

window.ProjectXViews.import_centre_lesson_tracker = function() {
  setTimeout(async () => {
    const data = await ProjectXImportCentre.getImportData();
    const summaryBody = document.getElementById("sheetSummaryBody");
    const logBody = document.getElementById("importLogBody");
    const validationBody = document.getElementById("validationMessages");

    if (summaryBody) {
      summaryBody.innerHTML = (data.summary.sheetSummaries || []).map(item => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid var(--px-border);">${ProjectXImportCentre.escape(item.sheet)}</td>
          <td style="padding:10px;border-bottom:1px solid var(--px-border);">${ProjectXImportCentre.escape(item.units)}</td>
          <td style="padding:10px;border-bottom:1px solid var(--px-border);">${ProjectXImportCentre.escape(item.lessons)}</td>
          <td style="padding:10px;border-bottom:1px solid var(--px-border);">${ProjectXImportCentre.escape(item.assessmentRecords)}</td>
          <td style="padding:10px;border-bottom:1px solid var(--px-border);">${ProjectXImportCentre.escape(item.scoreCellsAggregated)}</td>
        </tr>
      `).join("");
    }

    if (logBody) {
      logBody.innerHTML = (data.log.imports || []).map(item => `
        <tr>
          <td style="padding:10px;border-bottom:1px solid var(--px-border);">${ProjectXImportCentre.escape(item.source)}</td>
          <td style="padding:10px;border-bottom:1px solid var(--px-border);">${ProjectXImportCentre.escape(item.academicYear)}</td>
          <td style="padding:10px;border-bottom:1px solid var(--px-border);">${ProjectXImportCentre.escape(item.status)}</td>
          <td style="padding:10px;border-bottom:1px solid var(--px-border);">${ProjectXImportCentre.escape(item.date)}</td>
        </tr>
      `).join("");
    }

    if (validationBody) {
      validationBody.innerHTML = (data.summary.validation || []).map(item => `
        <li><strong>${ProjectXImportCentre.escape(item.level)}:</strong> ${ProjectXImportCentre.escape(item.message)}</li>
      `).join("");
    }
  }, 50);

  return `
    <div class="projectx-card">
      <span class="projectx-status">Workbook Source</span>
      <h3>Lesson Tracker Import</h3>
      <p>
        This view shows what Project X detected in the uploaded Lesson Tracker workbook and how it separated reusable curriculum content from 2025–2026 delivery records.
      </p>
      <h3 style="margin-top:22px;">Import Log</h3>
      <div style="overflow:auto;margin-top:12px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Source</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Academic Year</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Status</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Date</th></tr></thead>
          <tbody id="importLogBody"><tr><td colspan="4" style="padding:10px;">Loading import log...</td></tr></tbody>
        </table>
      </div>
      <h3 style="margin-top:22px;">Detected Sheets</h3>
      <div style="overflow:auto;margin-top:12px;">
        <table style="width:100%;border-collapse:collapse;">
          <thead><tr><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Sheet</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Units</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Lessons</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Assessment Records</th><th style="text-align:left;padding:10px;background:var(--px-blue-soft);">Score Cells Aggregated</th></tr></thead>
          <tbody id="sheetSummaryBody"><tr><td colspan="5" style="padding:10px;">Loading workbook summary...</td></tr></tbody>
        </table>
      </div>
      <h3 style="margin-top:22px;">Validation</h3>
      <ul id="validationMessages"><li>Loading validation messages...</li></ul>
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
      years.push({ id: target, label: target, status: "Draft", source: "Copied from reusable Project X curriculum", note: "Created locally in browser storage. A future sprint will export this as a full Project X academic-year package." });
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
        <label><strong>Source Curriculum</strong><input value="Reusable Curriculum Library" disabled style="width:100%;padding:12px;border:1px solid var(--px-border);border-radius:12px;margin-top:6px;"></label>
        <label><strong>New Academic Year</strong><input id="targetAcademicYear" placeholder="e.g. 2026-2027" style="width:100%;padding:12px;border:1px solid var(--px-border);border-radius:12px;margin-top:6px;"></label>
        <button class="projectx-button" type="submit">Create Draft Academic Year</button>
      </form>
    </div>
    <div class="projectx-card" style="margin-top:20px;"><h3>Local Academic Years</h3><div id="academicYearList"></div></div>
  `;
};

window.ProjectXViews.import_centre_data_model = function() {
  return `
    <div class="projectx-grid">
      <div class="projectx-card"><span class="projectx-status">Reusable</span><h3>Curriculum Library</h3><p>Units, lessons and resources that can be reused every academic year.</p></div>
      <div class="projectx-card"><span class="projectx-status">Annual</span><h3>Delivery Layer</h3><p>Dates taught, classes, completion state and delivery progress for 2025–2026.</p></div>
      <div class="projectx-card"><span class="projectx-status">Public-safe</span><h3>Assessment Layer</h3><p>Assessment aggregates without student names or individual marks.</p></div>
    </div>
    <div class="projectx-card" style="margin-top:20px;">
      <h3>Generated Files</h3>
      <ul>
        <li><code>projectx/data/curriculum/units.json</code></li>
        <li><code>projectx/data/curriculum/lessons.json</code></li>
        <li><code>projectx/data/curriculum/resources.json</code></li>
        <li><code>projectx/data/delivery/2025-2026.json</code></li>
        <li><code>projectx/data/assessment/2025-2026.json</code></li>
      </ul>
    </div>
  `;
};

window.ProjectXViews.import_centre_backups = function() {
  setTimeout(() => {
    document.getElementById("exportAcademicYears")?.addEventListener("click", () => {
      ProjectXImportCentre.downloadJson("projectx-academic-years-export.json", {
        exportedAt: new Date().toISOString(),
        academicYears: ProjectXImportCentre.getLocalAcademicYears()
      });
    });
  }, 50);
  return `
    <div class="projectx-card"><span class="projectx-status">Backup</span><h3>Export Local Academic Years</h3><p>Download locally created academic-year drafts as JSON.</p><button id="exportAcademicYears" class="projectx-button">Download Local Export</button></div>
  `;
};

window.ProjectXViews.import_centre_settings = function() {
  return `<div class="projectx-card"><span class="projectx-status">Settings</span><h3>Import Centre Settings</h3><p>Future settings will control duplicate handling, import validation, source mapping and update detection.</p></div>`;
};
