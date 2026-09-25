const SITE_DATA = {
  "name": "Rolando Valdés Hernández MSc",
  "role": "Qualified Computer Science Teacher | Boarding Tutor | Curriculum Developer | AI in Education Practitioner",
  "location": "Willing to relocate anywhere",
  "currentSalary": "£43,000",
  "minimumSalary": "£50,000–£55,000+",
  "summary": "Dedicated Computer Science educator with 20+ years of teaching, curriculum development, leadership and technology experience. Currently teaching Computer Science across KS2–KS5, including GCSE and A Level, with additional boarding responsibilities. Strong interest in AI-supported learning, interactive dashboards, assessment systems, programming, robotics and evidence-informed teaching.",
  "pages": [
    ["index.html", "Home"],
    ["about.html", "About"],
    ["career.html", "Opportunity"],
    ["teaching.html", "Teaching"],
    ["curriculum.html", "Curriculum"],
    ["qts.html", "QTS"],
    ["evidence.html", "Evidence"],
    ["observations.html", "Observations"],
    ["teaching-evidence-centre.html", "Evidence Centre"],
    ["ai.html", "AI"],
    ["recommendations.html", "Recommendations"],
    ["projectx/index.html", "Launch Project X"],
    ["contact.html", "Contact"]
  ],
  "stats": [
    ["20+", "Years of teaching and training experience"],
    ["KS2–KS5", "Current teaching range"],
    ["QTS", "Qualified Teacher Status obtained in 2026"],
    ["£50k–£55k+", "Target salary depending on responsibilities and relocation package"]
  ],
  "career": {
    "seeking": [
      "Permanent full-time Computer Science Teacher role",
      "Lead Teacher of Computing or Head of Computing considered",
      "GCSE and A Level Computer Science teaching",
      "Curriculum development and digital learning leadership",
      "UK-wide opportunities; willing to relocate for the right role"
    ],
    "location": [
      "Willing to relocate anywhere in the UK",
      "UK-wide opportunities considered",
      "Relocation support/package welcomed where available"
    ],
    "salary": "Current salary: £43,000. Target: £50,000–£55,000+, depending on leadership responsibility, TLR, boarding expectations, relocation support and total package.",
    "ideal": "A supportive school with a collaborative staff culture, strong behaviour systems, scope for innovation, and an opportunity to develop Computer Science provision across GCSE and A Level."
  },
  "documents": [
    {
      "category": "CV",
      "title": "Full CV 2026",
      "desc": "Current professional CV with teaching experience, employment history and contact details.",
      "type": "PDF",
      "url": "downloads/rolando_valdes_hernandez_cv_2026.pdf"
    },
    {
      "category": "Qualifications",
      "title": "UK ENIC Bachelor Statement",
      "desc": "Statement of comparability confirming Bachelor degree equivalence.",
      "type": "PDF",
      "url": "documents/uk_enic_bachelors_statement.pdf"
    },
    {
      "category": "Qualifications",
      "title": "UK ENIC Master Statement",
      "desc": "Statement of comparability confirming Master degree equivalence.",
      "type": "PDF",
      "url": "documents/uk_enic_masters_statement.pdf"
    },
    {
      "category": "Safeguarding",
      "title": "DBS Update Service",
      "desc": "DBS Update Service supporting document.",
      "type": "PDF",
      "url": "documents/dbs_update_service.pdf"
    },
    {
      "category": "Safeguarding",
      "title": "DBS Certificate Page 1",
      "desc": "Enhanced DBS certificate evidence, page 1.",
      "type": "Image",
      "url": "documents/dbs_certificate_page_1.jpg"
    },
    {
      "category": "Safeguarding",
      "title": "DBS Certificate Page 2",
      "desc": "Enhanced DBS certificate evidence, page 2.",
      "type": "Image",
      "url": "documents/dbs_certificate_page_2.jpg"
    },
    {
      "category": "Career History",
      "title": "Employment and Study History 1980–2014",
      "desc": "Extended employment and study history document.",
      "type": "DOCX",
      "url": "documents/employment_and_study_history_1980_2014.docx"
    },
    {
      "category": "Dashboards",
      "title": "Final QTS Observation Dashboard",
      "desc": "Interactive Year 10 Binary Fractions in Python observation evidence dashboard.",
      "type": "HTML",
      "url": "dashboards/final_qts_observation_binary_fractions_dashboard.html"
    },
    {
      "category": "Dashboards",
      "title": "Ofsted Evidence Map",
      "desc": "Interactive Ofsted/QTS evidence mapping dashboard.",
      "type": "HTML",
      "url": "dashboards/index_ofsted_evidence_map.html"
    },
    {
      "category": "Dashboards",
      "title": "Fully Interactive Ofsted Evidence Map",
      "desc": "Expanded interactive evidence map with standards and subject audit evidence.",
      "type": "HTML",
      "url": "dashboards/mr_valdes_fully_interactive_ofsted_evidence_map.html"
    }
  ],
  "videoMarkers": [
    {
      "time": "00:00",
      "title": "Lesson opening / routines",
      "standard": "TS1 / TS7",
      "evidence": "Establishes expectations, learning climate and lesson purpose."
    },
    {
      "time": "03:00",
      "title": "Prior knowledge and questioning",
      "standard": "TS2 / TS6",
      "evidence": "Checks understanding and activates prior learning."
    },
    {
      "time": "08:00",
      "title": "Teacher modelling",
      "standard": "TS3 / TS4",
      "evidence": "Subject knowledge, explicit instruction and worked examples."
    },
    {
      "time": "15:00",
      "title": "Adaptive support",
      "standard": "TS5",
      "evidence": "Scaffolding, differentiated prompts and support for mixed attainment."
    },
    {
      "time": "24:00",
      "title": "Independent practice",
      "standard": "TS2 / TS4",
      "evidence": "Students apply learning while teacher circulates and intervenes."
    },
    {
      "time": "35:00",
      "title": "Review / plenary",
      "standard": "TS6",
      "evidence": "Assessment for learning and next-step feedback."
    }
  ]
};

async function getData() {
  try {
    const r = await fetch("data/site-data.json");
    if (r.ok) return await r.json();
  } catch (e) {}
  return SITE_DATA;
}

function nav(data) {
  return `
    <div class="topbar">
      <div class="wrap nav">
        <div class="brand">${data.name}</div>
        ${data.pages.map(p => `<a href="${p[0]}">${p[1]}</a>`).join("")}
      </div>
    </div>
  `;
}

function footer(data) {
  return `
    <div class="footer">
      ${data.name} · Professional Teaching Website · UK-wide opportunities · Willing to relocate
    </div>
  `;
}

function initShared() {
  getData().then(d => {
    const navEl = document.getElementById("nav");
    const footEl = document.getElementById("foot");

    if (navEl) navEl.innerHTML = nav(d);
    if (footEl) footEl.innerHTML = footer(d);

    if (window.pageInit) window.pageInit(d);
  });
}

function documentCards(docs) {
  return `
    <div class="docgrid">
      ${docs.map(d => `
        <article class="doc" data-cat="${d.category}" data-text="${(d.title + " " + d.desc + " " + d.category).toLowerCase()}">
          <span class="pill">${d.category}</span>
          <h3>${d.title}</h3>
          <p class="muted">${d.desc}</p>
          <p><b>${d.type}</b></p>
          <a class="btn" target="_blank" href="${d.url}">Open evidence</a>
        </article>
      `).join("")}
    </div>
  `;
}

function filterDocs() {
  const q = (document.getElementById("docSearch")?.value || "").toLowerCase();
  const c = document.getElementById("docCat")?.value || "all";

  document.querySelectorAll(".doc").forEach(el => {
    el.style.display =
      ((c === "all" || el.dataset.cat === c) && el.dataset.text.includes(q))
        ? "block"
        : "none";
  });
}

function sec(t) {
  const [m, s] = t.split(":").map(Number);
  return m * 60 + s;
}

function videoSeek(t) {
  const v = document.getElementById("lessonVideo");
  if (v) {
    v.currentTime = sec(t);
    v.play();
  }
}

document.addEventListener("DOMContentLoaded", initShared);