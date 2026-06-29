window.ProjectXViews = window.ProjectXViews || {};

(function () {
  function safe(value) {
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

  function units() {
    return ProjectXCurriculumService.getUnits();
  }

  function lessons() {
    return ProjectXCurriculumService.getLessons();
  }

  function resources() {
    return ProjectXCurriculumService.getResources();
  }

  function settings() {
    return ProjectXCurriculumService.getSettings();
  }

  function statusSummary() {
    const unitCount = units().length;
    const lessonCount = lessons().length;
    const resourceCount = resources().length;
    const keyStages = new Set(units().map(unit => unit.keyStage).filter(Boolean)).size;

    return `
      <div class="curriculum-kpi-grid">
        <div class="curriculum-kpi"><span>Units</span><strong>${unitCount}</strong></div>
        <div class="curriculum-kpi"><span>Lessons</span><strong>${lessonCount}</strong></div>
        <div class="curriculum-kpi"><span>Resources</span><strong>${resourceCount}</strong></div>
        <div class="curriculum-kpi"><span>Key Stages</span><strong>${keyStages}</strong></div>
      </div>
    `;
  }

  function unitRows(list = units()) {
    return list.map(unit => `
      <tr>
        <td><strong>${safe(unit.title)}</strong><br><small>${safe(unit.intent)}</small></td>
        <td>${safe(unit.yearGroup)}<br><small>${safe(unit.keyStage)}</small></td>
        <td>${safe(unit.strand)}</td>
        <td><span class="projectx-status">${safe(unit.status)}</span></td>
        <td>${safe(unit.lessons)}</td>
      </tr>
    `).join("");
  }

  function lessonRows(list = lessons()) {
    return list.map(lesson => `
      <tr>
        <td><strong>${safe(lesson.title)}</strong><br><small>${safe(lesson.objective)}</small></td>
        <td>${safe(lesson.yearGroup)}</td>
        <td>${safe(lesson.duration)} mins</td>
        <td><span class="projectx-status">${safe(lesson.status)}</span></td>
        <td>${(lesson.resources || []).map(item => `<span class="curriculum-pill">${safe(item)}</span>`).join(" ")}</td>
      </tr>
    `).join("");
  }

  window.ProjectXViews.curriculum_dashboard = function () {
    const recentUnits = units().slice(0, 3);
    const recentLessons = lessons().slice(0, 3);

    return `
      ${statusSummary()}
      <div class="curriculum-split">
        <div class="projectx-card">
          <span class="projectx-status">Curriculum</span>
          <h3>Recent Units</h3>
          <p>Quick overview of the most recent curriculum units in the workspace.</p>
          <table class="curriculum-table">
            <thead><tr><th>Unit</th><th>Year</th><th>Status</th></tr></thead>
            <tbody>
              ${recentUnits.map(unit => `
                <tr>
                  <td>${safe(unit.title)}</td>
                  <td>${safe(unit.yearGroup)}</td>
                  <td>${safe(unit.status)}</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>

        <div class="projectx-card">
          <span class="projectx-status">Planning</span>
          <h3>Lesson Pipeline</h3>
          <p>Current lesson items prepared for teaching, evidence or further planning.</p>
          <table class="curriculum-table">
            <thead><tr><th>Lesson</th><th>Year</th><th>Duration</th></tr></thead>
            <tbody>
              ${recentLessons.map(lesson => `
                <tr>
                  <td>${safe(lesson.title)}</td>
                  <td>${safe(lesson.yearGroup)}</td>
                  <td>${safe(lesson.duration)} mins</td>
                </tr>
              `).join("")}
            </tbody>
          </table>
        </div>
      </div>
    `;
  };

  window.ProjectXViews.curriculum_units = function () {
    setTimeout(() => {
      const form = document.getElementById("addUnitForm");
      const search = document.getElementById("unitSearch");
      const tableBody = document.getElementById("unitTableBody");

      if (form) {
        form.addEventListener("submit", event => {
          event.preventDefault();
          ProjectXCurriculumService.addUnit(new FormData(form));
          form.reset();
          tableBody.innerHTML = unitRows();
        });
      }

      if (search) {
        search.addEventListener("input", () => {
          const q = search.value.toLowerCase().trim();
          const filtered = units().filter(unit =>
            String(unit.title).toLowerCase().includes(q) ||
            String(unit.yearGroup).toLowerCase().includes(q) ||
            String(unit.keyStage).toLowerCase().includes(q) ||
            String(unit.strand).toLowerCase().includes(q)
          );
          tableBody.innerHTML = unitRows(filtered);
        });
      }
    }, 0);

    return `
      <div class="projectx-card">
        <div class="curriculum-toolbar">
          <div>
            <span class="projectx-status">Unit Manager</span>
            <h2>Curriculum Units</h2>
            <p>Create, search and review units by year group, key stage and curriculum strand.</p>
          </div>
          <input id="unitSearch" class="curriculum-search" placeholder="Search units...">
        </div>

        <table class="curriculum-table">
          <thead><tr><th>Unit</th><th>Year / KS</th><th>Strand</th><th>Status</th><th>Lessons</th></tr></thead>
          <tbody id="unitTableBody">${unitRows()}</tbody>
        </table>
      </div>

      <div class="projectx-card" style="margin-top: 20px;">
        <span class="projectx-status">Create</span>
        <h3>Add New Unit</h3>
        <form id="addUnitForm" class="curriculum-form">
          <div class="curriculum-form-grid">
            <label>Title <input name="title" required placeholder="e.g. Algorithms and Flowcharts"></label>
            <label>Year Group <input name="yearGroup" placeholder="e.g. Year 9"></label>
            <label>Key Stage <input name="keyStage" placeholder="e.g. KS3"></label>
            <label>Strand <input name="strand" placeholder="e.g. Programming"></label>
            <label>Status
              <select name="status">
                <option>Draft</option>
                <option>Live</option>
                <option>Review</option>
                <option>Published</option>
              </select>
            </label>
            <label>Number of Lessons <input name="lessons" type="number" min="0" value="1"></label>
          </div>
          <label>Intent <textarea name="intent" placeholder="What is the purpose of this unit?"></textarea></label>
          <label>Coverage <input name="coverage" placeholder="Comma separated: variables, loops, selection"></label>
          <button class="projectx-button" type="submit">Add Unit</button>
        </form>
      </div>
    `;
  };

  window.ProjectXViews.curriculum_lessons = function () {
    setTimeout(() => {
      const form = document.getElementById("addLessonForm");
      const tableBody = document.getElementById("lessonTableBody");

      if (form) {
        form.addEventListener("submit", event => {
          event.preventDefault();
          ProjectXCurriculumService.addLesson(new FormData(form));
          form.reset();
          tableBody.innerHTML = lessonRows();
        });
      }
    }, 0);

    return `
      <div class="projectx-card">
        <span class="projectx-status">Lesson Library</span>
        <h2>Lessons</h2>
        <p>Manage reusable lessons connected to curriculum units and evidence workflows.</p>

        <table class="curriculum-table">
          <thead><tr><th>Lesson</th><th>Year</th><th>Duration</th><th>Status</th><th>Resources</th></tr></thead>
          <tbody id="lessonTableBody">${lessonRows()}</tbody>
        </table>
      </div>

      <div class="projectx-card" style="margin-top: 20px;">
        <span class="projectx-status">Create</span>
        <h3>Add New Lesson</h3>
        <form id="addLessonForm" class="curriculum-form">
          <div class="curriculum-form-grid">
            <label>Title <input name="title" required placeholder="e.g. For Loops in Python"></label>
            <label>Year Group <input name="yearGroup" placeholder="e.g. Year 8"></label>
            <label>Duration <input name="duration" type="number" min="15" value="45"></label>
            <label>Status
              <select name="status">
                <option>Draft</option>
                <option>Ready</option>
                <option>Evidence</option>
                <option>Review</option>
              </select>
            </label>
            <label>Linked Unit
              <select name="unitId">
                <option value="">Unlinked</option>
                ${units().map(unit => `<option value="${safe(unit.id)}">${safe(unit.title)}</option>`).join("")}
              </select>
            </label>
            <label>Resources <input name="resources" placeholder="Comma separated: worksheet, slides, code"></label>
          </div>
          <label>Learning Objective <textarea name="objective" placeholder="Students will be able to..."></textarea></label>
          <button class="projectx-button" type="submit">Add Lesson</button>
        </form>
      </div>
    `;
  };

  window.ProjectXViews.curriculum_schemes = function () {
    return `
      <div class="projectx-card">
        <span class="projectx-status">Schemes of Work</span>
        <h2>Scheme Builder</h2>
        <p>This view groups units into teachable sequences and prepares the structure for exportable schemes of work.</p>
        <div class="projectx-grid" style="margin-top: 20px;">
          ${units().map(unit => `
            <div class="projectx-card">
              <h3>${safe(unit.yearGroup)} — ${safe(unit.title)}</h3>
              <p>${safe(unit.intent)}</p>
              <div class="curriculum-pill-list">
                ${(unit.coverage || []).map(item => `<span class="curriculum-pill">${safe(item)}</span>`).join("")}
              </div>
            </div>
          `).join("")}
        </div>
      </div>
    `;
  };

  window.ProjectXViews.curriculum_resources = function () {
    return `
      <div class="projectx-card">
        <span class="projectx-status">Resource Library</span>
        <h2>Resources</h2>
        <p>Track lesson plans, worksheets, slides, evidence files and reusable teaching resources.</p>
        <table class="curriculum-table">
          <thead><tr><th>Resource</th><th>Type</th><th>Linked To</th><th>Status</th></tr></thead>
          <tbody>
            ${resources().map(resource => `
              <tr>
                <td><strong>${safe(resource.title)}</strong></td>
                <td>${safe(resource.type)}</td>
                <td>${safe(resource.linkedTo)}</td>
                <td><span class="projectx-status">${safe(resource.status)}</span></td>
              </tr>
            `).join("")}
          </tbody>
        </table>
      </div>
    `;
  };

  window.ProjectXViews.curriculum_planner = function () {
    return `
      <div class="projectx-card">
        <span class="projectx-status">Planner</span>
        <h2>Curriculum Planner</h2>
        <p>This is the planning workspace for future timetable integration, lesson sequencing and resource preparation.</p>
        <div class="projectx-grid" style="margin-top: 20px;">
          <div class="projectx-card"><h3>Next Lesson</h3><p>Select a year group and prepare the next lesson in sequence.</p></div>
          <div class="projectx-card"><h3>Upcoming Assessments</h3><p>Connect curriculum units to assessment windows and revision tasks.</p></div>
          <div class="projectx-card"><h3>Evidence Links</h3><p>Attach lesson plans, reflections and standards evidence to curriculum delivery.</p></div>
        </div>
      </div>
    `;
  };

  window.ProjectXViews.curriculum_settings = function () {
    const s = settings();

    setTimeout(() => {
      const form = document.getElementById("curriculumSettingsForm");
      const reset = document.getElementById("resetCurriculumData");

      if (form) {
        form.addEventListener("submit", event => {
          event.preventDefault();
          ProjectXCurriculumService.updateSettings(new FormData(form));
          alert("Curriculum settings saved locally.");
        });
      }

      if (reset) {
        reset.addEventListener("click", () => {
          if (confirm("Reset Curriculum Centre data to the Sprint 04 defaults?")) {
            ProjectXCurriculumService.reset();
          }
        });
      }
    }, 0);

    return `
      <div class="projectx-card">
        <span class="projectx-status">Settings</span>
        <h2>Curriculum Settings</h2>
        <p>These settings are saved locally in your browser for now. Later they can be connected to a full storage layer.</p>

        <form id="curriculumSettingsForm" class="curriculum-form" style="margin-top: 18px;">
          <div class="curriculum-form-grid">
            <label>School <input name="school" value="${safe(s.school)}"></label>
            <label>Subject <input name="subject" value="${safe(s.subject)}"></label>
            <label>Default Exam Board <input name="defaultExamBoard" value="${safe(s.defaultExamBoard)}"></label>
            <label>Academic Year <input name="academicYear" value="${safe(s.academicYear)}"></label>
          </div>
          <button class="projectx-button" type="submit">Save Settings</button>
        </form>
      </div>

      <div class="projectx-card" style="margin-top: 20px;">
        <span class="projectx-status">Maintenance</span>
        <h3>Reset Local Data</h3>
        <p>Use this only if you want to reload the default Sprint 04 curriculum dataset.</p>
        <button id="resetCurriculumData" class="projectx-button" type="button">Reset Curriculum Data</button>
      </div>
    `;
  };
})();
