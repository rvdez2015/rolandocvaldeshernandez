const ProjectXCurriculumService = (() => {
  const dataUrl = "/rolandocvaldeshernandez/projectx/data/modules/curriculum/curriculum-data.json";
  const storageKey = "projectx.curriculum.data.v1";
  let state = null;

  async function initialise() {
    const saved = localStorage.getItem(storageKey);

    if (saved) {
      try {
        state = JSON.parse(saved);
        return state;
      } catch (error) {
        console.warn("Project X Curriculum: saved data could not be parsed. Loading defaults.", error);
      }
    }

    const response = await fetch(dataUrl, { cache: "no-store" });
    if (!response.ok) throw new Error(`Curriculum data request failed: ${response.status}`);
    state = await response.json();
    save();
    return state;
  }

  function getState() {
    return state;
  }

  function save() {
    if (!state) return;
    localStorage.setItem(storageKey, JSON.stringify(state));
  }

  function reset() {
    localStorage.removeItem(storageKey);
    window.location.reload();
  }

  function slug(value) {
    return String(value || "item")
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");
  }

  function getUnits() {
    return state?.units || [];
  }

  function getLessons() {
    return state?.lessons || [];
  }

  function getResources() {
    return state?.resources || [];
  }

  function getSettings() {
    return state?.settings || {};
  }

  function addUnit(formData) {
    const title = formData.get("title");
    const unit = {
      id: `unit-${slug(formData.get("yearGroup"))}-${slug(title)}-${Date.now()}`,
      yearGroup: formData.get("yearGroup") || "Unassigned",
      keyStage: formData.get("keyStage") || "",
      title: title || "Untitled Unit",
      strand: formData.get("strand") || "",
      status: formData.get("status") || "Draft",
      lessons: Number(formData.get("lessons") || 0),
      intent: formData.get("intent") || "",
      coverage: String(formData.get("coverage") || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
    };

    state.units.unshift(unit);
    save();
    return unit;
  }

  function addLesson(formData) {
    const title = formData.get("title");
    const lesson = {
      id: `lesson-${slug(formData.get("yearGroup"))}-${slug(title)}-${Date.now()}`,
      unitId: formData.get("unitId") || "",
      title: title || "Untitled Lesson",
      yearGroup: formData.get("yearGroup") || "Unassigned",
      duration: Number(formData.get("duration") || 45),
      status: formData.get("status") || "Draft",
      objective: formData.get("objective") || "",
      resources: String(formData.get("resources") || "")
        .split(",")
        .map(item => item.trim())
        .filter(Boolean)
    };

    state.lessons.unshift(lesson);
    save();
    return lesson;
  }

  function updateSettings(formData) {
    state.settings = {
      school: formData.get("school") || "",
      subject: formData.get("subject") || "",
      defaultExamBoard: formData.get("defaultExamBoard") || "",
      academicYear: formData.get("academicYear") || ""
    };
    save();
    return state.settings;
  }

  return {
    initialise,
    getState,
    getUnits,
    getLessons,
    getResources,
    getSettings,
    addUnit,
    addLesson,
    updateSettings,
    reset
  };
})();

window.ProjectXCurriculumService = ProjectXCurriculumService;
