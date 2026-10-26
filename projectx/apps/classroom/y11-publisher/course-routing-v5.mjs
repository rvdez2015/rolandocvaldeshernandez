/** Project X course routing: pure, testable boundary for curriculum delivery.
 * Never infer a school class from numeric course IDs or the current topic title.
 * Only explicit Year N/Y N/KS designation from course name/section is accepted.
 */
const clean=s=>String(s??'').trim();
export function inferYearGroup(course){
  const label=[course?.name,course?.section,course?.descriptionHeading].map(clean).join(' | ');
  const hits=[...label.matchAll(/\b(?:year|yr|y)\s*[-:]?\s*(1[0-3]|[5-9])\b/gi)].map(m=>Number(m[1]));
  // Ambiguous mixed-year courses must not be selected for a single cohort.
  return [...new Set(hits)].length===1?hits[0]:null;
}
export function isEligibleCourse(course,year){
 return !!course?.id && (course.courseState===undefined || course.courseState==='ACTIVE') && inferYearGroup(course)===Number(year);
}
export function routeLessonToCourse(lesson,course,year=11){
 if(!lesson || Number(lesson.yearGroup||11)!==Number(year) || !/^PX25-Y11-U\d{2}-L\d{3}$/.test(lesson.lessonId||''))throw Error('Selected lesson is not an approved Year 11 pilot lesson.');
 if(!isEligibleCourse(course,year))throw Error(`COURSE BLOCKED: choose a clearly named active Year ${year} Classroom course. Year-group mixing is disabled.`);
 return Object.freeze({courseId:String(course.id),courseName:String(course.name),yearGroup:year,lessonId:lesson.lessonId});
}
export function routePlanToCourse(entries,course,year=11){
 if(!Array.isArray(entries)||!entries.length)throw Error('No lessons selected.');
 const routes=entries.map(x=>routeLessonToCourse(x,course,year));
 if(routes.some(x=>x.courseId!==routes[0].courseId))throw Error('Mixed destination courses not allowed.');
 return routes;
}
