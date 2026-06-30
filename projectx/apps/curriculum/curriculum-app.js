(function () {
  const STORAGE_KEY = "projectx.curriculum.operational.v1";
  const SEED_URL = "/rolandocvaldeshernandez/projectx/data/curriculum/curriculum-seed.json";

  const state = {
    data: null,
    activeView: "dashboard",
    selectedUnitId: null,
    search: "",
    modalMode: null,
    editingId: null
  };

  function escape(value) {
    return String(value ?? "").replace(/[&<>"']/g, function (char) {
      return {
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
      }[char];
    });
  }

  function uid(prefix, collection) {
    const numbers = collection
      .map(item => Number(String(item.id || "").split("-").pop()))
      .filter(num => !Number.isNaN(num));
    const next = (numbers.length ? Math.max(...numbers) : 0) + 1;
    return `${prefix}-${String(next).padStart(4, "0")}`;
  }

  function notice(message) {
    const box = document.getElementById("curriculumNotice");
    if (!box) return;
    box.textContent = message;
    box.classList.add("active");
    setTimeout(() => box.classList.remove("active"), 2500);
  }

  function save() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state.data));
  }

  async function loadData() {
    const stored = localStorage.getItem(STORAGE_KEY);

    if (stored) {
      state.data = JSON.parse(stored);
      return;
    }

    const response = await fetch(SEED_URL, { cache: "no-store" });
    state.data = await response.json();
    save();
  }

  function resetData() {
    localStorage.removeItem(STORAGE_KEY);
    location.reload();
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state.data, null, 2)], {
      type: "application/json"
    });

    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "projectx-curriculum-export.json";
    link.click();
    URL.revokeObjectURL(url);
  }

  function importData(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(reader.result);
        if (!parsed.units || !parsed.lessons || !parsed.resources) {
          throw new Error("Invalid Project X curriculum export.");
        }
        state.data = parsed;
        save();
        render();
        notice("Curriculum data imported successfully.");
      } catch (error) {
        alert("Import failed: " + error.message);
      }
    };
    reader.readAsText(file);
  }

  function filteredUnits() {
    const q = state.search.toLowerCase();
    return state.data.units.filter(unit =>
      [unit.title, unit.yearGroup, unit.keyStage, unit.examBoard, unit.status]
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }

  function lessonsForUnit(unitId) {
    return state.data.lessons
      .filter(lesson => lesson.unitId === unitId)
      .sort((a, b) => Number(a.lessonNumber || 0) - Number(b.lessonNumber || 0));
  }

  function resourcesForLesson(lessonId) {
    return state.data.resources.filter(resource => resource.lessonId === lessonId);
  }

  function getUnit(unitId) {
    return state.data.units.find(unit => unit.id === unitId);
  }

  function getLesson(lessonId) {
    return state.data.lessons.find(lesson => lesson.id === lessonId);
  }

  function statusPill(status) {
    const lower = String(status || "").toLowerCase();
    const cls = lower.includes("complete") ? "complete" : lower.includes("planned") ? "planned" : "";
    return `<span class="curriculum-pill ${cls}">${escape(status || "Draft")}</span>`;
  }

  function renderKPIs() {
    const units = state.data.units.length;
    const lessons = state.data.lessons.length;
    const complete = state.data.lessons.filter(l => String(l.status).toLowerCase() === "completed").length;
    const resources = state.data.resources.length;

    return `
      <div class="curriculum-kpi-grid">
        <div class="curriculum-kpi"><span>Units</span><strong>${units}</strong></div>
        <div class="curriculum-kpi"><span>Lessons</span><strong>${lessons}</strong></div>
        <div class="curriculum-kpi"><span>Completed</span><strong>${complete}</strong></div>
        <div class="curriculum-kpi"><span>Assets</span><strong>${resources}</strong></div>
      </div>
    `;
  }

  function renderDashboard() {
    const recent = [...state.data.lessons].slice(-6).reverse();

    return `
      ${renderKPIs()}

      <div class="projectx-grid">
        <div class="projectx-card">
          <span class="projectx-status">Operational</span>
          <h3>Curriculum Centre</h3>
          <p>
            This centre now manages reusable units, lessons and teaching assets.
            Changes are saved locally in your browser and can be exported as JSON.
          </p>
        </div>

        <div class="projectx-card">
          <span class="projectx-status">Reuse</span>
          <h3>Next Academic Year</h3>
          <p>
            Units and lessons are reusable. Delivery dates and student data should remain
            separate so the curriculum can be copied into future years.
          </p>
        </div>

        <div class="projectx-card">
          <span class="projectx-status">Data</span>
          <h3>Local Persistence</h3>
          <p>
            Add, edit, delete, import and export curriculum data without needing a backend.
          </p>
        </div>
      </div>

      <div class="projectx-card" style="margin-top:20px;">
        <h3>Recent Lessons</h3>
        ${renderLessonsTable(recent)}
      </div>
    `;
  }

  function renderUnits() {
    const units = filteredUnits();

    if (!units.length) {
      return `<div class="curriculum-empty">No units found.</div>`;
    }

    return `
      <div class="curriculum-layout">
        <aside class="projectx-card">
          <h3>Units</h3>
          <div class="curriculum-list">
            ${units.map(unit => `
              <div class="curriculum-list-item ${state.selectedUnitId === unit.id ? "active" : ""}" data-select-unit="${escape(unit.id)}">
                <strong>${escape(unit.title)}</strong>
                <span>${escape(unit.yearGroup)} • ${escape(unit.examBoard)} • ${escape(unit.status)}</span>
              </div>
            `).join("")}
          </div>
        </aside>

        <section>
          ${renderSelectedUnit()}
        </section>
      </div>
    `;
  }

  function renderSelectedUnit() {
    const unit = getUnit(state.selectedUnitId) || filteredUnits()[0];

    if (!unit) return `<div class="curriculum-empty">Select or create a unit.</div>`;

    state.selectedUnitId = unit.id;
    const lessons = lessonsForUnit(unit.id);

    return `
      <div class="projectx-card">
        <span class="projectx-status">${escape(unit.yearGroup)} • ${escape(unit.keyStage)}</span>
        <h2>${escape(unit.title)}</h2>
        <p>${escape(unit.intent || "No curriculum intent recorded yet.")}</p>

        <div class="curriculum-actions" style="margin-bottom:16px;">
          <button class="curriculum-button secondary" data-edit-unit="${escape(unit.id)}">Edit Unit</button>
          <button class="curriculum-button danger" data-delete-unit="${escape(unit.id)}">Delete Unit</button>
        </div>

        <table class="curriculum-table">
          <tbody>
            <tr><th>Exam Board</th><td>${escape(unit.examBoard)}</td></tr>
            <tr><th>Status</th><td>${statusPill(unit.status)}</td></tr>
            <tr><th>Notes</th><td>${escape(unit.notes || "")}</td></tr>
            <tr><th>Lessons</th><td>${lessons.length}</td></tr>
          </tbody>
        </table>
      </div>

      <div class="projectx-card" style="margin-top:20px;">
        <h3>Lesson Sequence</h3>
        ${renderLessonsTable(lessons)}
      </div>
    `;
  }

  function renderLessons() {
    const lessons = state.data.lessons.filter(lesson => {
      const unit = getUnit(lesson.unitId);
      const q = state.search.toLowerCase();
      return [lesson.title, lesson.status, unit?.title, unit?.yearGroup, unit?.examBoard]
        .join(" ")
        .toLowerCase()
        .includes(q);
    });

    return `
      <div class="projectx-card">
        <h3>Lessons Library</h3>
        ${renderLessonsTable(lessons)}
      </div>
    `;
  }

  function renderLessonsTable(lessons) {
    if (!lessons.length) {
      return `<div class="curriculum-empty">No lessons found.</div>`;
    }

    return `
      <table class="curriculum-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Lesson</th>
            <th>Unit</th>
            <th>Status</th>
            <th>Duration</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${lessons.map(lesson => {
            const unit = getUnit(lesson.unitId);
            return `
              <tr>
                <td>${escape(lesson.lessonNumber || "")}</td>
                <td><strong>${escape(lesson.title)}</strong></td>
                <td>${escape(unit?.title || "Unlinked")}</td>
                <td>${statusPill(lesson.status)}</td>
                <td>${escape(lesson.duration || "")}</td>
                <td>
                  <div class="curriculum-actions">
                    <button class="curriculum-button secondary" data-view-lesson="${escape(lesson.id)}">Open</button>
                    <button class="curriculum-button secondary" data-edit-lesson="${escape(lesson.id)}">Edit</button>
                    <button class="curriculum-button danger" data-delete-lesson="${escape(lesson.id)}">Delete</button>
                  </div>
                </td>
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
    const resources = resourcesForLesson(lesson.id);

    return `
      <div class="projectx-card">
        <span class="projectx-status">Digital Lesson Twin</span>
        <h2>${escape(lesson.title)}</h2>
        <p><strong>Unit:</strong> ${escape(unit?.title || "Unlinked")} • <strong>Status:</strong> ${escape(lesson.status)}</p>

        <div class="projectx-grid" style="margin-top:20px;">
          <div class="projectx-card">
            <h3>Learning Objectives</h3>
            <ul>${(lesson.objectives || []).map(item => `<li>${escape(item)}</li>`).join("") || "<li>No objectives recorded.</li>"}</ul>
          </div>

          <div class="projectx-card">
            <h3>Vocabulary</h3>
            <p>${(lesson.vocabulary || []).map(item => `<span class="curriculum-pill">${escape(item)}</span>`).join(" ") || "No vocabulary recorded."}</p>
          </div>

          <div class="projectx-card">
            <h3>Misconceptions</h3>
            <ul>${(lesson.misconceptions || []).map(item => `<li>${escape(item)}</li>`).join("") || "<li>No misconceptions recorded.</li>"}</ul>
          </div>
        </div>
      </div>

      <div class="projectx-card" style="margin-top:20px;">
        <h3>Linked Teaching Assets</h3>
        ${renderResourcesTable(resources)}
      </div>
    `;
  }

  function renderResources() {
    return `
      <div class="projectx-card">
        <h3>Teaching Asset Library</h3>
        ${renderResourcesTable(state.data.resources)}
      </div>
    `;
  }

  function renderResourcesTable(resources) {
    if (!resources.length) return `<div class="curriculum-empty">No teaching assets found.</div>`;

    return `
      <table class="curriculum-table">
        <thead>
          <tr>
            <th>Asset</th>
            <th>Type</th>
            <th>Lesson</th>
            <th>Link</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${resources.map(resource => {
            const lesson = getLesson(resource.lessonId);
            return `
              <tr>
                <td><strong>${escape(resource.title)}</strong><br><span>${escape(resource.notes || "")}</span></td>
                <td>${escape(resource.type || "Resource")}</td>
                <td>${escape(lesson?.title || "Unlinked")}</td>
                <td>${resource.url && resource.url !== "#" ? `<a href="${escape(resource.url)}" target="_blank">Open</a>` : "No link"}</td>
                <td>
                  <div class="curriculum-actions">
                    <button class="curriculum-button secondary" data-edit-resource="${escape(resource.id)}">Edit</button>
                    <button class="curriculum-button danger" data-delete-resource="${escape(resource.id)}">Delete</button>
                  </div>
                </td>
              </tr>
            `;
          }).join("")}
        </tbody>
      </table>
    `;
  }

  function renderPlanner() {
    const planned = state.data.lessons.filter(l => String(l.status).toLowerCase() !== "completed");
    return `
      <div class="projectx-card">
        <h3>Upcoming / Planned Lessons</h3>
        <p>This planning view shows lessons not yet marked as completed.</p>
        ${renderLessonsTable(planned)}
      </div>
    `;
  }

  function renderSettings() {
    return `
      <div class="projectx-card">
        <h3>Curriculum Data Settings</h3>
        <p>Export regularly to back up your curriculum data. This release stores operational changes in browser storage.</p>
        <div class="curriculum-actions">
          <button class="curriculum-button" id="exportCurriculumBtn">Export JSON</button>
          <label class="curriculum-button secondary" for="importCurriculumFile">Import JSON</label>
          <input id="importCurriculumFile" type="file" accept="application/json" hidden>
          <button class="curriculum-button danger" id="resetCurriculumBtn">Reset to Seed Data</button>
        </div>
      </div>
    `;
  }

  function render() {
    const workspace = document.getElementById("moduleWorkspace");
    const title = document.getElementById("moduleTitle");
    if (!workspace) return;

    const titles = {
      dashboard: "Curriculum Dashboard",
      units: "Units",
      lessons: "Lessons",
      schemes: "Schemes of Work",
      resources: "Teaching Assets",
      planner: "Planner",
      settings: "Settings"
    };

    if (title) title.textContent = titles[state.activeView] || "Curriculum Centre";

    let body = "";
    if (state.activeView === "dashboard") body = renderDashboard();
    if (state.activeView === "units") body = renderUnits();
    if (state.activeView === "lessons") body = renderLessons();
    if (state.activeView === "schemes") body = renderUnits();
    if (state.activeView === "resources") body = renderResources();
    if (state.activeView === "planner") body = renderPlanner();
    if (state.activeView === "settings") body = renderSettings();

    workspace.innerHTML = `
      <div id="curriculumNotice" class="curriculum-notice"></div>
      <div class="curriculum-toolbar">
        <div class="curriculum-toolbar-left">
          <input id="curriculumSearch" class="curriculum-input" placeholder="Search units, lessons, resources..." value="${escape(state.search)}">
        </div>
        <div class="curriculum-toolbar-right">
          <button class="curriculum-button" id="newUnitBtn">New Unit</button>
          <button class="curriculum-button" id="newLessonBtn">New Lesson</button>
          <button class="curriculum-button secondary" id="newResourceBtn">New Asset</button>
        </div>
      </div>
      ${body}
      ${renderModal()}
    `;

    bindEvents();
  }

  function renderModal() {
    return `
      <div id="curriculumModalBackdrop" class="curriculum-modal-backdrop ${state.modalMode ? "active" : ""}">
        <div class="curriculum-modal">
          ${modalContent()}
        </div>
      </div>
    `;
  }

  function modalContent() {
    if (!state.modalMode) return "";

    if (state.modalMode === "unit") {
      const unit = state.editingId ? getUnit(state.editingId) : {};
      return `
        <h2>${state.editingId ? "Edit Unit" : "New Unit"}</h2>
        <form id="unitForm" class="curriculum-form-grid">
          <input name="title" class="curriculum-input" placeholder="Unit title" value="${escape(unit.title)}" required>
          <input name="yearGroup" class="curriculum-input" placeholder="Year group" value="${escape(unit.yearGroup)}" required>
          <input name="keyStage" class="curriculum-input" placeholder="Key Stage" value="${escape(unit.keyStage)}">
          <input name="examBoard" class="curriculum-input" placeholder="Exam board" value="${escape(unit.examBoard)}">
          <select name="status" class="curriculum-select">
            ${["Draft","Active","Completed","Archived"].map(s => `<option ${unit.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <input name="notes" class="curriculum-input" placeholder="Notes" value="${escape(unit.notes)}">
          <div style="grid-column:1/-1;">
            <textarea name="intent" class="curriculum-textarea" placeholder="Curriculum intent">${escape(unit.intent)}</textarea>
          </div>
          <div class="curriculum-actions" style="grid-column:1/-1;">
            <button class="curriculum-button" type="submit">Save Unit</button>
            <button class="curriculum-button secondary" type="button" data-close-modal>Cancel</button>
          </div>
        </form>
      `;
    }

    if (state.modalMode === "lesson") {
      const lesson = state.editingId ? getLesson(state.editingId) : {};
      return `
        <h2>${state.editingId ? "Edit Lesson" : "New Lesson"}</h2>
        <form id="lessonForm" class="curriculum-form-grid">
          <input name="title" class="curriculum-input" placeholder="Lesson title" value="${escape(lesson.title)}" required>
          <select name="unitId" class="curriculum-select" required>
            ${state.data.units.map(unit => `<option value="${escape(unit.id)}" ${lesson.unitId === unit.id ? "selected" : ""}>${escape(unit.title)}</option>`).join("")}
          </select>
          <input name="lessonNumber" class="curriculum-input" placeholder="Lesson number" type="number" value="${escape(lesson.lessonNumber)}">
          <input name="duration" class="curriculum-input" placeholder="Duration" value="${escape(lesson.duration)}">
          <select name="status" class="curriculum-select">
            ${["Draft","Planned","Completed","Archived"].map(s => `<option ${lesson.status === s ? "selected" : ""}>${s}</option>`).join("")}
          </select>
          <input name="vocabulary" class="curriculum-input" placeholder="Vocabulary, comma separated" value="${escape((lesson.vocabulary || []).join(", "))}">
          <div style="grid-column:1/-1;">
            <textarea name="objectives" class="curriculum-textarea" placeholder="Learning objectives, one per line">${escape((lesson.objectives || []).join("\n"))}</textarea>
          </div>
          <div style="grid-column:1/-1;">
            <textarea name="misconceptions" class="curriculum-textarea" placeholder="Misconceptions, one per line">${escape((lesson.misconceptions || []).join("\n"))}</textarea>
          </div>
          <div class="curriculum-actions" style="grid-column:1/-1;">
            <button class="curriculum-button" type="submit">Save Lesson</button>
            <button class="curriculum-button secondary" type="button" data-close-modal>Cancel</button>
          </div>
        </form>
      `;
    }

    if (state.modalMode === "resource") {
      const resource = state.editingId ? state.data.resources.find(r => r.id === state.editingId) : {};
      return `
        <h2>${state.editingId ? "Edit Teaching Asset" : "New Teaching Asset"}</h2>
        <form id="resourceForm" class="curriculum-form-grid">
          <input name="title" class="curriculum-input" placeholder="Asset title" value="${escape(resource.title)}" required>
          <select name="lessonId" class="curriculum-select">
            ${state.data.lessons.map(lesson => `<option value="${escape(lesson.id)}" ${resource.lessonId === lesson.id ? "selected" : ""}>${escape(lesson.title)}</option>`).join("")}
          </select>
          <input name="type" class="curriculum-input" placeholder="Type e.g. PDF, Canva, Code" value="${escape(resource.type)}">
          <input name="url" class="curriculum-input" placeholder="URL or file path" value="${escape(resource.url)}">
          <div style="grid-column:1/-1;">
            <textarea name="notes" class="curriculum-textarea" placeholder="Notes">${escape(resource.notes)}</textarea>
          </div>
          <div class="curriculum-actions" style="grid-column:1/-1;">
            <button class="curriculum-button" type="submit">Save Asset</button>
            <button class="curriculum-button secondary" type="button" data-close-modal>Cancel</button>
          </div>
        </form>
      `;
    }

    return "";
  }

  function bindEvents() {
    document.getElementById("curriculumSearch")?.addEventListener("input", (e) => {
      state.search = e.target.value;
      render();
    });

    document.getElementById("newUnitBtn")?.addEventListener("click", () => openModal("unit"));
    document.getElementById("newLessonBtn")?.addEventListener("click", () => openModal("lesson"));
    document.getElementById("newResourceBtn")?.addEventListener("click", () => openModal("resource"));

    document.querySelectorAll("[data-close-modal]").forEach(btn => btn.addEventListener("click", closeModal));

    document.querySelectorAll("[data-select-unit]").forEach(item => {
      item.addEventListener("click", () => {
        state.selectedUnitId = item.dataset.selectUnit;
        render();
      });
    });

    document.querySelectorAll("[data-edit-unit]").forEach(btn => btn.addEventListener("click", () => openModal("unit", btn.dataset.editUnit)));
    document.querySelectorAll("[data-edit-lesson]").forEach(btn => btn.addEventListener("click", () => openModal("lesson", btn.dataset.editLesson)));
    document.querySelectorAll("[data-edit-resource]").forEach(btn => btn.addEventListener("click", () => openModal("resource", btn.dataset.editResource)));

    document.querySelectorAll("[data-view-lesson]").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("moduleTitle").textContent = "Digital Lesson Twin";
        document.getElementById("moduleWorkspace").innerHTML = renderLessonTwin(btn.dataset.viewLesson);
        bindEvents();
      });
    });

    document.querySelectorAll("[data-delete-unit]").forEach(btn => btn.addEventListener("click", () => deleteUnit(btn.dataset.deleteUnit)));
    document.querySelectorAll("[data-delete-lesson]").forEach(btn => btn.addEventListener("click", () => deleteLesson(btn.dataset.deleteLesson)));
    document.querySelectorAll("[data-delete-resource]").forEach(btn => btn.addEventListener("click", () => deleteResource(btn.dataset.deleteResource)));

    document.getElementById("unitForm")?.addEventListener("submit", saveUnitForm);
    document.getElementById("lessonForm")?.addEventListener("submit", saveLessonForm);
    document.getElementById("resourceForm")?.addEventListener("submit", saveResourceForm);

    document.getElementById("exportCurriculumBtn")?.addEventListener("click", exportData);
    document.getElementById("resetCurriculumBtn")?.addEventListener("click", () => {
      if (confirm("Reset local curriculum data to the release seed?")) resetData();
    });
    document.getElementById("importCurriculumFile")?.addEventListener("change", (event) => {
      const file = event.target.files[0];
      if (file) importData(file);
    });
  }

  function openModal(mode, id = null) {
    state.modalMode = mode;
    state.editingId = id;
    render();
  }

  function closeModal() {
    state.modalMode = null;
    state.editingId = null;
    render();
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function saveUnitForm(event) {
    event.preventDefault();
    const data = formData(event.target);

    if (state.editingId) {
      const unit = getUnit(state.editingId);
      Object.assign(unit, data);
    } else {
      state.data.units.push({
        id: uid("PX-UNIT", state.data.units),
        ...data
      });
    }

    save();
    closeModal();
    notice("Unit saved.");
  }

  function saveLessonForm(event) {
    event.preventDefault();
    const data = formData(event.target);
    const payload = {
      ...data,
      lessonNumber: Number(data.lessonNumber || 0),
      objectives: String(data.objectives || "").split("\n").map(x => x.trim()).filter(Boolean),
      vocabulary: String(data.vocabulary || "").split(",").map(x => x.trim()).filter(Boolean),
      misconceptions: String(data.misconceptions || "").split("\n").map(x => x.trim()).filter(Boolean)
    };

    if (state.editingId) {
      const lesson = getLesson(state.editingId);
      Object.assign(lesson, payload);
    } else {
      state.data.lessons.push({
        id: uid("PX-LSN", state.data.lessons),
        ...payload
      });
    }

    save();
    closeModal();
    notice("Lesson saved.");
  }

  function saveResourceForm(event) {
    event.preventDefault();
    const data = formData(event.target);

    if (state.editingId) {
      const resource = state.data.resources.find(r => r.id === state.editingId);
      Object.assign(resource, data);
    } else {
      state.data.resources.push({
        id: uid("PX-AST", state.data.resources),
        ...data
      });
    }

    save();
    closeModal();
    notice("Teaching asset saved.");
  }

  function deleteUnit(id) {
    const lessonCount = state.data.lessons.filter(l => l.unitId === id).length;
    if (!confirm(`Delete this unit and ${lessonCount} linked lessons?`)) return;

    const lessonIds = state.data.lessons.filter(l => l.unitId === id).map(l => l.id);
    state.data.units = state.data.units.filter(u => u.id !== id);
    state.data.lessons = state.data.lessons.filter(l => l.unitId !== id);
    state.data.resources = state.data.resources.filter(r => !lessonIds.includes(r.lessonId));

    state.selectedUnitId = null;
    save();
    render();
  }

  function deleteLesson(id) {
    if (!confirm("Delete this lesson and its linked assets?")) return;
    state.data.lessons = state.data.lessons.filter(l => l.id !== id);
    state.data.resources = state.data.resources.filter(r => r.lessonId !== id);
    save();
    render();
  }

  function deleteResource(id) {
    if (!confirm("Delete this teaching asset?")) return;
    state.data.resources = state.data.resources.filter(r => r.id !== id);
    save();
    render();
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