/* Pure, opt-in proposal for approved revision Classroom sync.
   Does not contact Google, create posts or expose teacher-only content. */
export function approvedLessonClassroomPreview(approved, existing, marker){
 if(!approved||approved.approvalStatus!=='approved'||approved.visibility!=='owner_private'||
   approved.studentPublished!==false||!approved.revisionId||!approved.approvedProposalId)
  throw Error('A verified private approved revision is required');
 if(!existing||!existing.id||!['DRAFT','PUBLISHED'].includes(existing.state)||
   typeof existing.description!=='string')throw Error('Existing Classroom Material required');
 if(typeof marker!=='string'||marker.length<8||!existing.description.includes(marker))
  throw Error('Project X lesson identity marker missing');
 if(typeof existing.title!=='string'||!existing.title.trim())throw Error('Missing Classroom title');
 const obj=approved.teacherPlan?.learningObjectives,sc=approved.teacherPlan?.successCriteria;
 if(!Array.isArray(obj)||!Array.isArray(sc)||!obj.length||!sc.length||
    [...obj,...sc].some(s=>typeof s!=='string'||!s.trim()||s.length>750))
  throw Error('Approved learning objectives and success criteria must be reviewed');
 const text=existing.description;
 const beginning='Learning objectives:\n', middle='\n\nSuccess criteria:\n';
 const i=text.indexOf(beginning),j=text.indexOf(middle,i+beginning.length);
 if(i<0||j<0||text.indexOf(beginning,i+1)!==-1||text.indexOf(middle,j+1)!==-1)
  throw Error('Original objective/success heading structure is ambiguous; manual review required');
 const end=text.indexOf('\n\n',j+middle.length);
 if(end<0)throw Error('Success criteria section boundary missing; manual review required');
 const objectives=obj.map((s,i)=>`${i+1}. ${s.trim()}`).join('\n');
 const success=sc.map((s,i)=>`${i+1}. ${s.trim()}`).join('\n');
 const proposed=text.slice(0,i)+beginning+objectives+middle+success+text.slice(end);
 if(!proposed.trimEnd().endsWith(marker)||proposed.split(marker).length!==2)
  throw Error('Project X marker was modified or duplicated');
 if(proposed.length>25000)throw Error('Classroom description exceeds maximum length');
 // Deliberately not auto-merging teacher explanations, assessments,
 // notes, marking guidance or attachments into student-facing content.
 return {materialId:existing.id,state:existing.state,existingDescription:existing.description,
  proposedDescription:proposed,requiresHumanReview:true,requiresOAuth:true,
  requiresFreshRemoteVerification:true,approvalRevisionId:approved.revisionId};
}
