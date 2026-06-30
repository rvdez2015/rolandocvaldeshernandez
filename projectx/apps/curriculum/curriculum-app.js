(function () {
  const STORAGE_KEY = "projectx.curriculum.database.v10alpha1.navigation";
  const DATA_URL = "/rolandocvaldeshernandez/projectx/data/curriculum/database-curriculum.json";
  const FALLBACK_URL = "../../data/curriculum/database-curriculum.json";

  const state = {
    data: null,
    activeView: "dashboard",
    selectedUnitId: null,
    selectedLessonId: null,
    search: "",
    filters: {
      yearGroup: localStorage.getItem("projectx.curriculum.filter.yearGroup") || "all",
      schemeId: localStorage.getItem("projectx.curriculum.filter.schemeId") || "all",
      unitId: localStorage.getItem("projectx.curriculum.filter.unitId") || "all",
      status: localStorage.getItem("projectx.curriculum.filter.status") || "all"
    },
    modalMode: null,
    editingId: null
  };

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, char => ({
      "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
    }[char]));
  }

  function isBlankYear(value) {
    return !value || ["unspecified", "unassigned", "", "null"].includes(String(value).trim().toLowerCase());
  }

  function hasCurriculumContent(scheme) {
    return Number(scheme.unitCount || 0) > 0 || Number(scheme.lessonCount || 0) > 0 || state?.data?.units?.some(unit => unit.schemeId === scheme.id);
  }

  function normaliseScheme(scheme) {
    const item = { ...scheme };
    const title = String(item.title || "");
    const board = String(item.examBoard || "");

    if (title === "Scheme of work" && board.includes("H446")) {
      item.title = "OCR H446 A Level Scheme of Work";
      item.yearGroup = "Year 13";
      item.keyStage = "KS5";
      item.academicYear = item.academicYear || "2025-2026";
      item.notes = item.notes || "Imported OCR H446 scheme. Year group inferred for 2025-2026 delivery.";
    }

    if (title === "Scheme of work (1)" && board.includes("J277")) {
      item.title = "OCR J277 GCSE Scheme of Work";
      item.yearGroup = "Year 11";
      item.keyStage = "KS4";
      item.academicYear = item.academicYear || "2025-2026";
      item.notes = item.notes || "Imported OCR J277 scheme. Year group inferred for 2025-2026 delivery.";
    }

    if (Number(item.unitCount || 0) === 0 && Number(item.lessonCount || 0) === 0) {
      item.placeholder = true;
      item.status = "Placeholder";
    }
    return item;
  }

  function normaliseData(data) {
    const model = {
      meta: data.meta || {},
      schemes: (data.schemes || []).map(normaliseScheme),
      units: data.units || [],
      lessons: data.lessons || [],
      resources: data.resources || []
    };

    const schemeById = Object.fromEntries(model.schemes.map(scheme => [scheme.id, scheme]));
    const unitById = Object.fromEntries(model.units.map(unit => [unit.id, unit]));

    model.units = model.units.map(unit => {
      const scheme = schemeById[unit.schemeId] || {};
      const enriched = { ...unit };
      enriched.schemeTitle = scheme.title || enriched.schemeTitle || "Unlinked Scheme";
      enriched.yearGroup = isBlankYear(enriched.yearGroup) ? (scheme.yearGroup || "Unspecified") : enriched.yearGroup;
      enriched.keyStage = isBlankYear(enriched.keyStage) ? (scheme.keyStage || "Unspecified") : enriched.keyStage;
      enriched.examBoard = enriched.examBoard || scheme.examBoard || "";
      enriched.academicYear = enriched.academicYear || scheme.academicYear || "2025-2026";
      if (enriched.academicYear === "2025-2026") enriched.status = "Completed";
      return enriched;
    });

    const refreshedUnitById = Object.fromEntries(model.units.map(unit => [unit.id, unit]));
    model.lessons = model.lessons.map(lesson => {
      const unit = refreshedUnitById[lesson.unitId] || {};
      const scheme = schemeById[lesson.schemeId || unit.schemeId] || {};
      const enriched = { ...lesson };
      enriched.schemeId = enriched.schemeId || unit.schemeId || "";
      enriched.schemeTitle = scheme.title || unit.schemeTitle || enriched.schemeTitle || "Unlinked Scheme";
      enriched.yearGroup = isBlankYear(enriched.yearGroup) ? (unit.yearGroup || scheme.yearGroup || "Unspecified") : enriched.yearGroup;
      enriched.keyStage = isBlankYear(enriched.keyStage) ? (unit.keyStage || scheme.keyStage || "Unspecified") : enriched.keyStage;
      enriched.examBoard = enriched.examBoard || unit.examBoard || scheme.examBoard || "";
      enriched.academicYear = enriched.academicYear || unit.academicYear || scheme.academicYear || "2025-2026";
      if (enriched.academicYear === "2025-2026") {
        enriched.status = "Completed";
        enriched.digitalLessonTwin = {
          ...(enriched.digitalLessonTwin || {}),
          deliveryStatus: "Completed",
          academicYearStatus: "2025-2026 lessons marked complete; year group inherited from parent Scheme of Work where needed."
        };
      }
      return enriched;
    });

    return model;
  }

  function uid(prefix, collection) {
    const next = collection.length + 1;
    return `${prefix}-${String(next).padStart(4, "0")}`;
  }

  function notice(message) {
    const box = document.getElementById("curriculumNotice");
    if (!box) return;
    box.textContent = message;
    box.classList.add("active");
    setTimeout(() => box.classList.remove("active"), 2600);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }

  function saveFilters() {
    Object.entries(state.filters).forEach(([key, value]) => {
      localStorage.setItem(`projectx.curriculum.filter.${key}`, value);
    });
  }

  async function fetchJson(url) {
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Could not load ${url}`);
    return response.json();
  }

  async function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      state.data = normaliseData(JSON.parse(stored));
      return;
    }

    try {
      state.data = normaliseData(await fetchJson(DATA_URL));
    } catch (error) {
      state.data = normaliseData(await fetchJson(FALLBACK_URL));
    }
    save();
  }

  function resetData() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "projectx-database-curriculum-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = normaliseData(JSON.parse(reader.result));
        if (!parsed.schemes || !parsed.units || !parsed.lessons) {
          throw new Error("Invalid Project X database curriculum export.");
        }
        state.data = parsed;
        save();
        render();
        notice("Database curriculum data imported successfully.");
      } catch (error) {
        alert("Import failed: " + error.message);
      }
    };
    reader.readAsText(file);
  }

  function uniqueValues(items, field) {
    return [...new Set(items.map(item => item[field]).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));
  }

  function getScheme(id) { return state.data.schemes.find(item => item.id === id); }
  function getUnit(id) { return state.data.units.find(item => item.id === id); }
  function getLesson(id) { return state.data.lessons.find(item => item.id === id); }
  function lessonsForUnit(unitId) {
    return state.data.lessons
      .filter(lesson => lesson.unitId === unitId)
      .sort((a, b) => Number(a.sequenceIndex || a.lessonNumber || 0) - Number(b.sequenceIndex || b.lessonNumber || 0));
  }
  function unitsForScheme(schemeId) {
    return state.data.units
      .filter(unit => unit.schemeId === schemeId)
      .sort((a, b) => Number(a.sortOrder || a.unitNumber || 0) - Number(b.sortOrder || b.unitNumber || 0));
  }
  function resourcesForLesson(lessonId) { return state.data.resources.filter(resource => resource.lessonId === lessonId); }

  function matchesText(text) {
    const q = state.search.trim().toLowerCase();
    return !q || String(text).toLowerCase().includes(q);
  }

  function applyRecordFilters(record) {
    if (state.filters.yearGroup !== "all" && record.yearGroup !== state.filters.yearGroup) return false;
    if (state.filters.schemeId !== "all" && record.schemeId !== state.filters.schemeId && record.id !== state.filters.schemeId) return false;
    if (state.filters.unitId !== "all" && record.unitId !== state.filters.unitId && record.id !== state.filters.unitId) return false;
    if (state.filters.status !== "all" && String(record.status || "").toLowerCase() !== state.filters.status.toLowerCase()) return false;
    return true;
  }

  function visibleSchemes() {
    return state.data.schemes.filter(scheme => !scheme.placeholder && hasCurriculumContent(scheme));
  }

  function filteredSchemes() {
    return visibleSchemes().filter(scheme => {
      const text = [scheme.title, scheme.yearGroup, scheme.keyStage, scheme.examBoard, scheme.routeType, scheme.status, scheme.notes].join(" ");
      return applyRecordFilters(scheme) && matchesText(text);
    });
  }

  function filteredUnits() {
    return state.data.units.filter(unit => {
      const text = [unit.title, unit.yearGroup, unit.keyStage, unit.examBoard, unit.status, unit.schemeTitle, unit.description, unit.intent, unit.notes].join(" ");
      return applyRecordFilters(unit) && matchesText(text);
    });
  }

  function filteredLessons() {
    return state.data.lessons.filter(lesson => {
      const unit = getUnit(lesson.unitId);
      const scheme = getScheme(lesson.schemeId);
      const text = [lesson.title, lesson.status, lesson.lessonType, lesson.notes, lesson.yearGroup, unit?.title, scheme?.title, lesson.examBoard].join(" ");
      return applyRecordFilters(lesson) && matchesText(text);
    }).sort((a, b) => {
      return String(a.yearGroup).localeCompare(String(b.yearGroup), undefined, { numeric: true }) ||
             String(a.schemeTitle).localeCompare(String(b.schemeTitle)) ||
             Number(getUnit(a.unitId)?.sortOrder || 0) - Number(getUnit(b.unitId)?.sortOrder || 0) ||
             Number(a.sequenceIndex || a.lessonNumber || 0) - Number(b.sequenceIndex || b.lessonNumber || 0);
    });
  }

  function statusPill(status) {
    const lower = String(status || "").toLowerCase();
    const cls = lower.includes("complete") ? "complete" : lower.includes("plan") ? "planned" : "";
    return `<span class="curriculum-pill ${cls}">${escape(status || "Draft")}</span>`;
  }

  function renderOptions(values, selected, allLabel) {
    return `<option value="all">${escape(allLabel)}</option>` + values.map(value => `<option value="${escape(value)}" ${selected === value ? "selected" : ""}>${escape(value)}</option>`).join("");
  }

  function availableUnitsForFilter() {
    return state.data.units.filter(unit => {
      if (state.filters.yearGroup !== "all" && unit.yearGroup !== state.filters.yearGroup) return false;
      if (state.filters.schemeId !== "all" && unit.schemeId !== state.filters.schemeId) return false;
      return true;
    });
  }

  function renderToolbar() {
    const years = uniqueValues([...visibleSchemes(), ...state.data.units, ...state.data.lessons], "yearGroup");
    const schemes = visibleSchemes().filter(s => state.filters.yearGroup === "all" || s.yearGroup === state.filters.yearGroup);
    const units = availableUnitsForFilter();
    const statuses = uniqueValues([...state.data.schemes, ...state.data.units, ...state.data.lessons], "status");

    return `
      <div class="curriculum-toolbar">
        <div class="curriculum-toolbar-left">
          <input id="curriculumSearch" class="curriculum-input" placeholder="Search database curriculum..." value="${escape(state.search)}">
          <select id="yearGroupFilter" class="curriculum-select">${renderOptions(years, state.filters.yearGroup, "All Year Groups")}</select>
          <select id="schemeFilter" class="curriculum-select">
            <option value="all">All Schemes of Work</option>
            ${schemes.map(scheme => `<option value="${escape(scheme.id)}" ${state.filters.schemeId === scheme.id ? "selected" : ""}>${escape(scheme.title)}</option>`).join("")}
          </select>
          <select id="unitFilter" class="curriculum-select">
            <option value="all">All Units</option>
            ${units.map(unit => `<option value="${escape(unit.id)}" ${state.filters.unitId === unit.id ? "selected" : ""}>${escape(unit.title)}</option>`).join("")}
          </select>
          <select id="statusFilter" class="curriculum-select">${renderOptions(statuses, state.filters.status, "All Statuses")}</select>
          <button class="curriculum-button secondary" id="clearFiltersBtn">Clear Filters</button>
        </div>
        <div class="curriculum-toolbar-right">
          <button class="curriculum-button" id="newUnitBtn">New Unit</button>
          <button class="curriculum-button" id="newLessonBtn">New Lesson</button>
          <button class="curriculum-button secondary" id="newResourceBtn">New Asset</button>
        </div>
      </div>
    `;
  }


  function getFilteredContextLabel() {
    const parts = [];
    if (state.filters.yearGroup !== "all") parts.push(state.filters.yearGroup);
    if (state.filters.schemeId !== "all") parts.push(getScheme(state.filters.schemeId)?.title || "Selected Scheme");
    if (state.filters.unitId !== "all") parts.push(getUnit(state.filters.unitId)?.title || "Selected Unit");
    if (state.filters.status !== "all") parts.push(state.filters.status);
    if (state.search.trim()) parts.push(`Search: ${state.search.trim()}`);
    return parts.length ? parts.join(" → ") : "All curriculum records";
  }

  function renderNavigationChips() {
    return `
      <div class="curriculum-nav-summary">
        <div>
          <span class="projectx-status">Navigation Context</span>
          <strong>${escape(getFilteredContextLabel())}</strong>
        </div>
        <div class="curriculum-quick-tabs">
          <button class="curriculum-tab ${state.activeView === "dashboard" ? "active" : ""}" data-view="dashboard">Overview</button>
          <button class="curriculum-tab ${state.activeView === "schemes" ? "active" : ""}" data-view="schemes">Schemes</button>
          <button class="curriculum-tab ${state.activeView === "units" ? "active" : ""}" data-view="units">Units</button>
          <button class="curriculum-tab ${state.activeView === "lessons" ? "active" : ""}" data-view="lessons">Lessons</button>
        </div>
      </div>
    `;
  }

  function renderCurriculumTree() {
    const years = uniqueValues([...visibleSchemes(), ...state.data.units, ...state.data.lessons], "yearGroup");
    if (!years.length) return `<div class="curriculum-empty">No year groups available.</div>`;

    return `
      <div class="curriculum-tree-card">
        <div class="curriculum-tree-header">
          <span class="projectx-status">Three-click navigator</span>
          <h3>Curriculum Tree</h3>
          <p>Year Group → Scheme → Unit → Lesson</p>
        </div>
        <div class="curriculum-tree">
          ${years.map(year => {
            const schemes = visibleSchemes().filter(scheme => scheme.yearGroup === year);
            const yearActive = state.filters.yearGroup === year;
            return `
              <details class="tree-node" ${yearActive || state.filters.yearGroup === "all" ? "open" : ""}>
                <summary><button type="button" class="tree-button year ${yearActive ? "active" : ""}" data-tree-year="${escape(year)}">${escape(year)}</button></summary>
                <div class="tree-children">
                  ${schemes.map(scheme => {
                    const schemeActive = state.filters.schemeId === scheme.id;
                    const units = unitsForScheme(scheme.id);
                    return `
                      <details class="tree-node" ${schemeActive || yearActive ? "open" : ""}>
                        <summary><button type="button" class="tree-button scheme ${schemeActive ? "active" : ""}" data-tree-scheme="${escape(scheme.id)}">${escape(scheme.title)}</button></summary>
                        <div class="tree-children">
                          ${units.map(unit => {
                            const unitActive = state.filters.unitId === unit.id || state.selectedUnitId === unit.id;
                            const lessons = lessonsForUnit(unit.id);
                            return `
                              <details class="tree-node" ${unitActive ? "open" : ""}>
                                <summary><button type="button" class="tree-button unit ${unitActive ? "active" : ""}" data-tree-unit="${escape(unit.id)}">${escape(unit.title)}</button></summary>
                                <div class="tree-children lesson-branch">
                                  ${lessons.map(lesson => `<button type="button" class="tree-button lesson ${state.selectedLessonId === lesson.id ? "active" : ""}" data-tree-lesson="${escape(lesson.id)}">${escape(lesson.lessonNumber || lesson.sequenceIndex || "")}. ${escape(lesson.title)}</button>`).join("")}
                                </div>
                              </details>
                            `;
                          }).join("")}
                        </div>
                      </details>
                    `;
                  }).join("")}
                </div>
              </details>
            `;
          }).join("")}
        </div>
      </div>
    `;
  }

  function renderCurriculumHealth() {
    const lessons = filteredLessons();
    const total = lessons.length || 1;
    const completed = lessons.filter(lesson => String(lesson.status || "").toLowerCase().includes("complete")).length;
    const twins = lessons.filter(lesson => lesson.digitalLessonTwin).length;
    const resources = state.data.resources.filter(resource => lessons.some(lesson => lesson.id === resource.lessonId)).length;
    const completedPct = Math.round((completed / total) * 100);
    const twinPct = Math.round((twins / total) * 100);
    return `
      <div class="projectx-card curriculum-health-card">
        <h3>Curriculum Health</h3>
        <div class="curriculum-progress-row"><span>Completion</span><strong>${completedPct}%</strong><div class="curriculum-progress"><i style="width:${completedPct}%"></i></div></div>
        <div class="curriculum-progress-row"><span>Digital Lesson Twins</span><strong>${twinPct}%</strong><div class="curriculum-progress"><i style="width:${twinPct}%"></i></div></div>
        <div class="curriculum-progress-row"><span>Linked Assets</span><strong>${resources}</strong><div class="curriculum-progress"><i style="width:${Math.min(100, resources)}%"></i></div></div>
      </div>
    `;
  }

  function renderTeachingTimeline() {
    const units = filteredUnits().slice(0, 12);
    if (!units.length) return `<div class="curriculum-empty">No units available for the current navigation context.</div>`;
    return `
      <div class="projectx-card curriculum-timeline-card">
        <h3>Teaching Sequence</h3>
        <div class="curriculum-timeline">
          ${units.map(unit => `<button class="timeline-item" data-tree-unit="${escape(unit.id)}"><span>${escape(unit.yearGroup)}</span><strong>${escape(unit.title)}</strong><em>${lessonsForUnit(unit.id).length} lessons</em></button>`).join("")}
        </div>
      </div>
    `;
  }

  function renderKPIs() {
    const schemes = filteredSchemes().length;
    const units = filteredUnits().length;
    const lessons = filteredLessons().length;
    const minutes = filteredLessons().reduce((sum, lesson) => sum + Number(lesson.plannedMinutes || 0), 0);
    return `
      <div class="curriculum-kpi-grid">
        <div class="curriculum-kpi"><span>Schemes</span><strong>${schemes}</strong></div>
        <div class="curriculum-kpi"><span>Units</span><strong>${units}</strong></div>
        <div class="curriculum-kpi"><span>Lessons</span><strong>${lessons}</strong></div>
        <div class="curriculum-kpi"><span>Planned Hours</span><strong>${Math.round(minutes / 60)}</strong></div>
      </div>
    `;
  }

  function renderDashboard() {
    const recent = filteredLessons().slice(0, 8);
    return `
      ${renderKPIs()}
      <div class="projectx-grid">
        <div class="projectx-card">
          <span class="projectx-status">Release 1.0 Alpha.1</span>
          <h3>Curriculum Intelligence Centre</h3>
          <p>Phase 1 introduces tree navigation, persistent filters, curriculum health and faster three-click access to schemes, units and lessons.</p>
        </div>
        <div class="projectx-card">
          <span class="projectx-status">Three Click Rule</span>
          <h3>Year → Unit → Lesson</h3>
          <p>The curriculum tree keeps every lesson reachable through a consistent hierarchy rather than long tables or disconnected filters.</p>
        </div>
        <div class="projectx-card">
          <span class="projectx-status">Single Source</span>
          <h3>Database Curriculum</h3>
          <p>Schemes, units and lessons still inherit their context from the database-derived Scheme → Unit → Lesson model.</p>
        </div>
      </div>
      <div class="curriculum-dashboard-grid">
        ${renderCurriculumHealth()}
        ${renderTeachingTimeline()}
      </div>
      <div class="projectx-card" style="margin-top:20px;">
        <h3>Filtered Lesson Timeline</h3>
        ${renderLessonsTable(recent)}
      </div>
    `;
  }

  function renderSchemes() {
    const schemes = filteredSchemes();
    if (!schemes.length) return `<div class="curriculum-empty">No schemes found.</div>`;
    return `
      <div class="projectx-card">
        <h3>Schemes of Work</h3>
        <table class="curriculum-table">
          <thead><tr><th>Scheme</th><th>Year</th><th>Board</th><th>Units</th><th>Lessons</th><th>Actions</th></tr></thead>
          <tbody>
            ${schemes.map(scheme => `
              <tr>
                <td><strong>${escape(scheme.title)}</strong><br><span>${escape(scheme.notes || "")}</span></td>
                <td>${escape(scheme.yearGroup)}<br><span>${escape(scheme.keyStage)}</span></td>
                <td>${escape(scheme.examBoard)}<br><span>${escape(scheme.routeType || "")}</span></td>
                <td>${unitsForScheme(scheme.id).length}</td>
                <td>${state.data.lessons.filter(l => l.schemeId === scheme.id).length}</td>
                <td><button class="curriculum-button secondary" data-filter-scheme="${escape(scheme.id)}">Open Scheme</button></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  }

  function renderUnits() {
    const units = filteredUnits().sort((a, b) => String(a.yearGroup).localeCompare(String(b.yearGroup), undefined, { numeric: true }) || Number(a.sortOrder || 0) - Number(b.sortOrder || 0));
    if (!units.length) return `<div class="curriculum-empty">No units found.</div>`;
    return `
      <div class="curriculum-layout">
        <aside class="projectx-card">
          <h3>Units</h3>
          <div class="curriculum-list">
            ${units.map(unit => `
              <div class="curriculum-list-item ${state.selectedUnitId === unit.id ? "active" : ""}" data-select-unit="${escape(unit.id)}">
                <strong>${escape(unit.title)}</strong>
                <span>${escape(unit.yearGroup)} • ${escape(unit.schemeTitle)} • ${escape(unit.status)}</span>
              </div>
            `).join("")}
          </div>
        </aside>
        <section>${renderSelectedUnit(units)}</section>
      </div>
    `;
  }

  function renderSelectedUnit(units = filteredUnits()) {
    const unit = getUnit(state.selectedUnitId) || units[0];
    if (!unit) return `<div class="curriculum-empty">Select or create a unit.</div>`;
    state.selectedUnitId = unit.id;
    const scheme = getScheme(unit.schemeId);
    const lessons = lessonsForUnit(unit.id);
    return `
      <div class="projectx-card">
        <span class="projectx-status">${escape(unit.yearGroup)} • ${escape(unit.keyStage)} • ${escape(scheme?.title || "No Scheme")}</span>
        <h2>${escape(unit.title)}</h2>
        <p>${escape(unit.intent || unit.description || "No unit description recorded yet.")}</p>
        <div class="curriculum-actions" style="margin-bottom:16px;">
          <button class="curriculum-button secondary" data-edit-unit="${escape(unit.id)}">Edit Unit</button>
          <button class="curriculum-button danger" data-delete-unit="${escape(unit.id)}">Delete Unit</button>
        </div>
        <table class="curriculum-table">
          <tbody>
            <tr><th>Scheme of Work</th><td>${escape(scheme?.title || "Unlinked")}</td></tr>
            <tr><th>Exam Board</th><td>${escape(unit.examBoard)}</td></tr>
            <tr><th>Planned Lessons</th><td>${lessons.length}</td></tr>
            <tr><th>Planned Time</th><td>${escape(unit.plannedMinutes || 0)} minutes</td></tr>
            <tr><th>Status</th><td>${statusPill(unit.status)}</td></tr>
          </tbody>
        </table>
      </div>
      <div class="projectx-card" style="margin-top:20px;">
        <h3>Database Lesson Sequence</h3>
        ${renderLessonsTable(lessons)}
      </div>
    `;
  }

  function renderLessons() {
    return `<div class="projectx-card"><h3>Lessons Library</h3>${renderLessonsTable(filteredLessons())}</div>`;
  }

  function renderLessonsTable(lessons) {
    if (!lessons.length) return `<div class="curriculum-empty">No lessons found.</div>`;
    return `
      <table class="curriculum-table">
        <thead>
          <tr><th>#</th><th>Lesson</th><th>Year</th><th>Scheme / Unit</th><th>Status</th><th>Duration</th><th>Actions</th></tr>
        </thead>
        <tbody>
          ${lessons.map(lesson => {
            const unit = getUnit(lesson.unitId);
            const scheme = getScheme(lesson.schemeId);
            return `
              <tr>
                <td>${escape(lesson.lessonNumber || lesson.sequenceIndex || "")}</td>
                <td><strong>${escape(lesson.title)}</strong><br><span>${escape(lesson.lessonType || "teach")}</span></td>
                <td>${escape(lesson.yearGroup)}</td>
                <td>${escape(scheme?.title || "Unlinked")}<br><span>${escape(unit?.title || "Unlinked")}</span></td>
                <td>${statusPill(lesson.status)}</td>
                <td>${escape(lesson.duration || "")}</td>
                <td><div class="curriculum-actions"><button class="curriculum-button secondary" data-view-lesson="${escape(lesson.id)}">Open</button><button class="curriculum-button secondary" data-edit-lesson="${escape(lesson.id)}">Edit</button></div></td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function renderLessonTwin(lessonId) {
    const lesson = getLesson(lessonId);
    if (!lesson) return `<div class="curriculum-empty">Lesson not found.</div>`;
    const unit = getUnit(lesson.unitId);
    const scheme = getScheme(lesson.schemeId);
    const resources = resourcesForLesson(lesson.id);
    return `
      <div class="projectx-card">
        <span class="projectx-status">Digital Lesson Twin • Database ID ${escape(lesson.databaseId || "new")}</span>
        <h2>${escape(lesson.title)}</h2>
        <p><strong>Scheme:</strong> ${escape(scheme?.title || "Unlinked")} • <strong>Unit:</strong> ${escape(unit?.title || "Unlinked")} • <strong>Status:</strong> ${escape(lesson.status)}</p>
        <div class="projectx-grid" style="margin-top:20px;">
          <div class="projectx-card"><h3>Teaching Notes / Specification Detail</h3><p>${escape(lesson.notes || "No database notes recorded.")}</p></div>
          <div class="projectx-card"><h3>Learning Objectives</h3><ul>${(lesson.objectives || []).map(item => `<li>${escape(item)}</li>`).join("") || "<li>No objectives recorded.</li>"}</ul></div>
          <div class="projectx-card"><h3>Database Context</h3><p>${escape(lesson.examBoard)} • ${escape(lesson.yearGroup)} • ${escape(lesson.plannedMinutes || 0)} minutes</p></div>
        </div>
      </div>
      <div class="projectx-card" style="margin-top:20px;"><h3>Linked Teaching Assets</h3>${renderResourcesTable(resources)}</div>
    `;
  }

  function renderResources() {
    return `<div class="projectx-card"><h3>Teaching Asset Library</h3>${renderResourcesTable(state.data.resources)}</div>`;
  }

  function renderResourcesTable(resources) {
    if (!resources.length) return `<div class="curriculum-empty">No teaching assets found.</div>`;
    return `
      <table class="curriculum-table">
        <thead><tr><th>Asset</th><th>Type</th><th>Lesson</th><th>Link</th><th>Actions</th></tr></thead>
        <tbody>${resources.map(resource => { const lesson = getLesson(resource.lessonId); return `<tr><td><strong>${escape(resource.title)}</strong><br><span>${escape(resource.notes || "")}</span></td><td>${escape(resource.type || "Resource")}</td><td>${escape(lesson?.title || "Unlinked")}</td><td>${resource.url && resource.url !== "#" ? `<a href="${escape(resource.url)}" target="_blank">Open</a>` : "No link"}</td><td><button class="curriculum-button secondary" data-edit-resource="${escape(resource.id)}">Edit</button></td></tr>`; }).join("")}</tbody>
      </table>
    `;
  }

  function renderPlanner() {
    const planned = filteredLessons().filter(l => String(l.status).toLowerCase() !== "completed");
    return `<div class="projectx-card"><h3>Database Teaching Planner</h3><p>This view shows planned lessons from the database-derived curriculum sequence.</p>${renderLessonsTable(planned)}</div>`;
  }

  function renderSettings() {
    return `
      <div class="projectx-card">
        <h3>Curriculum Data Settings</h3>
        <p><strong>Source:</strong> ${escape(state.data.meta?.source || "database export")}<br><strong>Release:</strong> ${escape(state.data.meta?.release || "Release 0.6.2")}</p>
        <div class="curriculum-actions">
          <button class="curriculum-button" id="exportCurriculumBtn">Export JSON</button>
          <label class="curriculum-button secondary" for="importCurriculumFile">Import JSON</label>
          <input id="importCurriculumFile" type="file" accept="application/json" hidden>
          <button class="curriculum-button danger" id="resetCurriculumBtn">Reset to Database Seed</button>
        </div>
      </div>
    `;
  }

  function renderModal() {
    return `<div id="curriculumModalBackdrop" class="curriculum-modal-backdrop ${state.modalMode ? "active" : ""}"><div class="curriculum-modal">${modalContent()}</div></div>`;
  }

  function modalContent() {
    if (!state.modalMode) return "";
    if (state.modalMode === "unit") {
      const unit = state.editingId ? getUnit(state.editingId) : {};
      return `
        <h2>${state.editingId ? "Edit Unit" : "New Unit"}</h2>
        <form id="unitForm" class="curriculum-form-grid">
          <input name="title" class="curriculum-input" placeholder="Unit title" value="${escape(unit.title)}" required>
          <select name="schemeId" class="curriculum-select" required>${state.data.schemes.map(s => `<option value="${escape(s.id)}" ${unit.schemeId === s.id ? "selected" : ""}>${escape(s.title)}</option>`).join("")}</select>
          <input name="yearGroup" class="curriculum-input" placeholder="Year group" value="${escape(unit.yearGroup)}" required>
          <input name="keyStage" class="curriculum-input" placeholder="Key Stage" value="${escape(unit.keyStage)}">
          <input name="examBoard" class="curriculum-input" placeholder="Exam board" value="${escape(unit.examBoard)}">
          <select name="status" class="curriculum-select">${["Draft","Active","Completed","Archived"].map(s => `<option ${unit.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
          <div style="grid-column:1/-1;"><textarea name="intent" class="curriculum-textarea" placeholder="Curriculum intent">${escape(unit.intent)}</textarea></div>
          <div class="curriculum-actions" style="grid-column:1/-1;"><button class="curriculum-button" type="submit">Save Unit</button><button class="curriculum-button secondary" type="button" data-close-modal>Cancel</button></div>
        </form>`;
    }
    if (state.modalMode === "lesson") {
      const lesson = state.editingId ? getLesson(state.editingId) : {};
      return `
        <h2>${state.editingId ? "Edit Lesson" : "New Lesson"}</h2>
        <form id="lessonForm" class="curriculum-form-grid">
          <input name="title" class="curriculum-input" placeholder="Lesson title" value="${escape(lesson.title)}" required>
          <select name="unitId" class="curriculum-select" required>${state.data.units.map(unit => `<option value="${escape(unit.id)}" ${lesson.unitId === unit.id ? "selected" : ""}>${escape(unit.yearGroup)} • ${escape(unit.title)}</option>`).join("")}</select>
          <input name="lessonNumber" class="curriculum-input" placeholder="Lesson number" type="number" value="${escape(lesson.lessonNumber)}">
          <input name="duration" class="curriculum-input" placeholder="Duration" value="${escape(lesson.duration)}">
          <select name="status" class="curriculum-select">${["Draft","Planned","Completed","Archived"].map(s => `<option ${lesson.status === s ? "selected" : ""}>${s}</option>`).join("")}</select>
          <input name="vocabulary" class="curriculum-input" placeholder="Vocabulary, comma separated" value="${escape((lesson.vocabulary || []).join(", "))}">
          <div style="grid-column:1/-1;"><textarea name="objectives" class="curriculum-textarea" placeholder="Learning objectives, one per line">${escape((lesson.objectives || []).join("\n"))}</textarea></div>
          <div style="grid-column:1/-1;"><textarea name="notes" class="curriculum-textarea" placeholder="Teaching notes / specification detail">${escape(lesson.notes || "")}</textarea></div>
          <div class="curriculum-actions" style="grid-column:1/-1;"><button class="curriculum-button" type="submit">Save Lesson</button><button class="curriculum-button secondary" type="button" data-close-modal>Cancel</button></div>
        </form>`;
    }
    if (state.modalMode === "resource") {
      const resource = state.editingId ? state.data.resources.find(r => r.id === state.editingId) : {};
      return `
        <h2>${state.editingId ? "Edit Teaching Asset" : "New Teaching Asset"}</h2>
        <form id="resourceForm" class="curriculum-form-grid">
          <input name="title" class="curriculum-input" placeholder="Asset title" value="${escape(resource.title)}" required>
          <select name="lessonId" class="curriculum-select">${state.data.lessons.map(lesson => `<option value="${escape(lesson.id)}" ${resource.lessonId === lesson.id ? "selected" : ""}>${escape(lesson.title)}</option>`).join("")}</select>
          <input name="type" class="curriculum-input" placeholder="Type e.g. PDF, Canva, Code" value="${escape(resource.type)}">
          <input name="url" class="curriculum-input" placeholder="URL or file path" value="${escape(resource.url)}">
          <div style="grid-column:1/-1;"><textarea name="notes" class="curriculum-textarea" placeholder="Notes">${escape(resource.notes)}</textarea></div>
          <div class="curriculum-actions" style="grid-column:1/-1;"><button class="curriculum-button" type="submit">Save Asset</button><button class="curriculum-button secondary" type="button" data-close-modal>Cancel</button></div>
        </form>`;
    }
    return "";
  }

  function render() {
    const workspace = document.getElementById("moduleWorkspace");
    const title = document.getElementById("moduleTitle");
    if (!workspace) return;
    const titles = { dashboard: "Curriculum Intelligence Dashboard", units: "Unit Workspace", lessons: "Lesson Library", schemes: "Schemes of Work", resources: "Teaching Assets", planner: "Planner", settings: "Settings" };
    if (title) title.textContent = titles[state.activeView] || "Curriculum Centre";
    let body = "";
    if (state.activeView === "dashboard") body = renderDashboard();
    if (state.activeView === "schemes") body = renderSchemes();
    if (state.activeView === "units") body = renderUnits();
    if (state.activeView === "lessons") body = renderLessons();
    if (state.activeView === "resources") body = renderResources();
    if (state.activeView === "planner") body = renderPlanner();
    if (state.activeView === "settings") body = renderSettings();
    workspace.innerHTML = `<div id="curriculumNotice" class="curriculum-notice"></div>${renderToolbar()}${renderNavigationChips()}<div class="curriculum-intelligence-layout"><aside class="curriculum-tree-sidebar">${renderCurriculumTree()}</aside><section class="curriculum-intelligence-main">${body}</section></div>${renderModal()}`;
    bindEvents();
  }

  function bindEvents() {
    document.getElementById("curriculumSearch")?.addEventListener("input", e => { state.search = e.target.value; render(); });
    document.getElementById("yearGroupFilter")?.addEventListener("change", e => { state.filters.yearGroup = e.target.value; state.filters.schemeId = "all"; state.filters.unitId = "all"; saveFilters(); render(); });
    document.getElementById("schemeFilter")?.addEventListener("change", e => { state.filters.schemeId = e.target.value; state.filters.unitId = "all"; saveFilters(); render(); });
    document.getElementById("unitFilter")?.addEventListener("change", e => { state.filters.unitId = e.target.value; saveFilters(); render(); });
    document.getElementById("statusFilter")?.addEventListener("change", e => { state.filters.status = e.target.value; saveFilters(); render(); });
    document.getElementById("clearFiltersBtn")?.addEventListener("click", () => { state.search = ""; state.filters = { yearGroup: "all", schemeId: "all", unitId: "all", status: "all" }; saveFilters(); render(); });
    document.querySelectorAll("[data-filter-scheme]").forEach(btn => btn.addEventListener("click", () => { state.filters.schemeId = btn.dataset.filterScheme; state.activeView = "units"; saveFilters(); render(); }));
    document.querySelectorAll("[data-tree-year]").forEach(btn => btn.addEventListener("click", event => { event.preventDefault(); state.filters.yearGroup = btn.dataset.treeYear; state.filters.schemeId = "all"; state.filters.unitId = "all"; state.selectedUnitId = null; state.activeView = "dashboard"; saveFilters(); render(); }));
    document.querySelectorAll("[data-tree-scheme]").forEach(btn => btn.addEventListener("click", event => { event.preventDefault(); state.filters.schemeId = btn.dataset.treeScheme; state.filters.unitId = "all"; state.selectedUnitId = null; state.activeView = "units"; saveFilters(); render(); }));
    document.querySelectorAll("[data-tree-unit]").forEach(btn => btn.addEventListener("click", event => { event.preventDefault(); const unit = getUnit(btn.dataset.treeUnit); if (!unit) return; state.selectedUnitId = unit.id; state.filters.yearGroup = unit.yearGroup || state.filters.yearGroup; state.filters.schemeId = unit.schemeId || "all"; state.filters.unitId = unit.id; state.activeView = "units"; saveFilters(); render(); }));
    document.querySelectorAll("[data-tree-lesson]").forEach(btn => btn.addEventListener("click", event => { event.preventDefault(); openLessonTwin(btn.dataset.treeLesson); }));

    document.getElementById("newUnitBtn")?.addEventListener("click", () => openModal("unit"));
    document.getElementById("newLessonBtn")?.addEventListener("click", () => openModal("lesson"));
    document.getElementById("newResourceBtn")?.addEventListener("click", () => openModal("resource"));
    document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeModal));
    document.querySelectorAll("[data-select-unit]").forEach(item => item.addEventListener("click", () => { state.selectedUnitId = item.dataset.selectUnit; render(); }));
    document.querySelectorAll("[data-edit-unit]").forEach(btn => btn.addEventListener("click", () => openModal("unit", btn.dataset.editUnit)));
    document.querySelectorAll("[data-edit-lesson]").forEach(btn => btn.addEventListener("click", () => openModal("lesson", btn.dataset.editLesson)));
    document.querySelectorAll("[data-edit-resource]").forEach(btn => btn.addEventListener("click", () => openModal("resource", btn.dataset.editResource)));
    document.querySelectorAll("[data-view-lesson]").forEach(btn => btn.addEventListener("click", () => openLessonTwin(btn.dataset.viewLesson)));
    document.querySelectorAll("[data-delete-unit]").forEach(btn => btn.addEventListener("click", () => deleteUnit(btn.dataset.deleteUnit)));
    document.getElementById("unitForm")?.addEventListener("submit", saveUnitForm);
    document.getElementById("lessonForm")?.addEventListener("submit", saveLessonForm);
    document.getElementById("resourceForm")?.addEventListener("submit", saveResourceForm);
    document.getElementById("exportCurriculumBtn")?.addEventListener("click", exportData);
    document.getElementById("resetCurriculumBtn")?.addEventListener("click", () => { if (confirm("Reset local curriculum data to the database seed?")) resetData(); });
    document.getElementById("importCurriculumFile")?.addEventListener("change", event => { const file = event.target.files[0]; if (file) importData(file); });
  }

  function openLessonTwin(lessonId) {
    const lesson = getLesson(lessonId);
    if (!lesson) return;
    state.selectedLessonId = lesson.id;
    state.selectedUnitId = lesson.unitId;
    state.filters.yearGroup = lesson.yearGroup || state.filters.yearGroup;
    state.filters.schemeId = lesson.schemeId || state.filters.schemeId;
    state.filters.unitId = lesson.unitId || state.filters.unitId;
    saveFilters();
    const title = document.getElementById("moduleTitle");
    if (title) title.textContent = "Digital Lesson Twin";
    const ws = document.getElementById("moduleWorkspace");
    if (ws) ws.innerHTML = `<div id="curriculumNotice" class="curriculum-notice"></div>${renderToolbar()}${renderNavigationChips()}<div class="curriculum-intelligence-layout"><aside class="curriculum-tree-sidebar">${renderCurriculumTree()}</aside><section class="curriculum-intelligence-main">${renderLessonTwin(lesson.id)}</section></div>${renderModal()}`;
    bindEvents();
  }

  function openModal(mode, id = null) { state.modalMode = mode; state.editingId = id; render(); }
  function closeModal() { state.modalMode = null; state.editingId = null; render(); }
  function formData(form) { return Object.fromEntries(new FormData(form).entries()); }

  function saveUnitForm(event) {
    event.preventDefault();
    const data = formData(event.target);
    const scheme = getScheme(data.schemeId);
    const payload = { ...data, schemeTitle: scheme?.title || "", examBoard: data.examBoard || scheme?.examBoard || "", academicYear: scheme?.academicYear || "2025-2026", status: data.status || "Active" };
    if (state.editingId) Object.assign(getUnit(state.editingId), payload);
    else state.data.units.push({ id: uid("PX-UNIT", state.data.units), ...payload });
    save(); closeModal(); notice("Unit saved.");
  }

  function saveLessonForm(event) {
    event.preventDefault();
    const data = formData(event.target);
    const unit = getUnit(data.unitId);
    const payload = { ...data, lessonNumber: Number(data.lessonNumber || 0), plannedMinutes: parseInt(String(data.duration || "60"), 10) || 60, unitId: data.unitId, schemeId: unit?.schemeId || "", schemeTitle: unit?.schemeTitle || "", yearGroup: unit?.yearGroup || "", keyStage: unit?.keyStage || "", examBoard: unit?.examBoard || "", objectives: String(data.objectives || "").split("\n").map(x => x.trim()).filter(Boolean), vocabulary: String(data.vocabulary || "").split(",").map(x => x.trim()).filter(Boolean), notes: data.notes || "" };
    if (state.editingId) Object.assign(getLesson(state.editingId), payload);
    else state.data.lessons.push({ id: uid("PX-LESSON", state.data.lessons), status: "Planned", ...payload });
    save(); closeModal(); notice("Lesson saved.");
  }

  function saveResourceForm(event) {
    event.preventDefault();
    const data = formData(event.target);
    if (state.editingId) Object.assign(state.data.resources.find(r => r.id === state.editingId), data);
    else state.data.resources.push({ id: uid("PX-AST", state.data.resources), ...data });
    save(); closeModal(); notice("Teaching asset saved.");
  }

  function deleteUnit(id) {
    const lessonCount = state.data.lessons.filter(l => l.unitId === id).length;
    if (!confirm(`Delete this unit and ${lessonCount} linked lessons?`)) return;
    const lessonIds = state.data.lessons.filter(l => l.unitId === id).map(l => l.id);
    state.data.units = state.data.units.filter(u => u.id !== id);
    state.data.lessons = state.data.lessons.filter(l => l.unitId !== id);
    state.data.resources = state.data.resources.filter(r => !lessonIds.includes(r.lessonId));
    state.selectedUnitId = null;
    save(); render();
  }

  function connectModuleNavigation() {
    document.querySelectorAll("#moduleNavigation .module-nav-item").forEach(button => {
      button.addEventListener("click", () => {
        state.activeView = button.dataset.view || "dashboard";
        document.querySelectorAll("#moduleNavigation .module-nav-item").forEach(item => item.classList.remove("active"));
        button.classList.add("active");
        render();
      });
    });
  }

  window.ProjectXCurriculum = {
    async initialise() {
      await loadData();
      state.activeView = "dashboard";
      render();
      setTimeout(connectModuleNavigation, 300);
    }
  };
})();
