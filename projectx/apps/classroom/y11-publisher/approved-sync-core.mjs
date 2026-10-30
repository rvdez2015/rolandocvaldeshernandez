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
 const proposed=[`Learning objectives:\n${obj.map(s=>'• '+s.trim()).join('\n')}`,
  `Success criteria:\n${sc.map(s=>'• '+s.trim()).join('\n')}`,marker].join('\n\n');
 if(proposed.length>25000)throw Error('Classroom description exceeds maximum length');
 // Deliberately not auto-merging teacher explanations, assessments,
 // notes, marking guidance or attachments into student-facing content.
 return {materialId:existing.id,state:existing.state,existingDescription:existing.description,
  proposedDescription:proposed,requiresHumanReview:true,requiresOAuth:true,
  requiresFreshRemoteVerification:true,approvalRevisionId:approved.revisionId};
}
