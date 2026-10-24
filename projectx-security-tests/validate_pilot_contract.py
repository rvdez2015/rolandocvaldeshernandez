"""Offline static checks for the exact pilot JSON against Firestore rule field contracts.
No network, credentials, or database writes. Run: python validate_pilot_contract.py path/to/ProjectX_Importer_PRIVATE.zip
"""
import json,zipfile,sys,re,collections,pathlib

def main(file):
  if file.suffix.lower()=='.zip':
    with zipfile.ZipFile(file) as z: data=json.loads(z.read('PRIVATE_IMPORT_PAYLOAD.json'))
  else:data=json.loads(file.read_text(encoding='utf-8'))
  rules=pathlib.Path(__file__).with_name('firestore.rules').read_text()
  counts={k:len(data[k]) for k in ('lessons','questions','families','teacherKeys','studentLessons','studentQuestions')}
  assert counts=={'lessons':94,'questions':376,'families':376,'teacherKeys':94,'studentLessons':94,'studentQuestions':376},counts
  assert len({l['lessonId'] for l in data['lessons']})==94
  assert not re.search(r'^\s*match\s+/\{document=\*\*\}',rules,re.M)
  assert '&& !isPilotLessonId(lessonId)' in rules
  assert "allow update, delete: if false;" in rules
  meta={'sourceHash','importReleaseId','schoolId','createdByUid','createdByEmail','createdAt','revisionStatus','visibility','changedFields','parentRevisionId','changeReason','importSchema'}
  for item,collection in [('studentQuestions','StudentQuestionBank'),('studentLessons','StudentLessons')]:
    match=re.search(r'match /catalogue'+collection+r'/.*?keys\(\)\.hasOnly\(\[(.*?)\]\)',rules,re.S)
    assert match,'Missing student record whitelist: '+collection
    allow=set(re.findall(r"'([^']+)'",match.group(1)))
    bad=[(r.get('questionId',r.get('lessonId')),sorted(set(r)|meta-allow)) for r in data[item] if not (set(r)|meta)<=allow]
    assert not bad,(item,bad[:3])
  for l in data['lessons']:
    assert re.fullmatch(r'PX25-Y11-U\d{2}-L\d{3}',l['lessonId'])
    assert l['revisionId']==data['releaseId']
    assert sum(a['minutes'] for a in l['activities'])==45
    assert sum(q['marks'] for q in l['studentPlan']['assessmentQuestions'])==10
  assert data['releaseId']=='y11-j277-canonical-pilot-20261024-r1'
  print('STATIC CONTRACT CHECKS PASSED:', counts, '1410 revision documents expected.')
  print('NOTICE: This is NOT an executed Firebase Rules test. Run the emulator test suite separately.')

if __name__=='__main__':
 if len(sys.argv)!=2:raise SystemExit('Usage: python validate_pilot_contract.py private.zip|PRIVATE_IMPORT_PAYLOAD.json')
 main(pathlib.Path(sys.argv[1]))
