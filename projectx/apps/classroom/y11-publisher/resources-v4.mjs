/* Project X v4 student-safe resource generator. No credentials, OCR paper text or marking keys. */
import {safeStudentContent,RELEASE_ID,unitNo} from './core-v5.mjs';
const esc=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const compact=s=>String(s??'').replace(/[^a-z0-9-]+/gi,'-').replace(/^-|-$/g,'');
const svgStyle='font-family:Inter,Arial,sans-serif';
const root=(body,w=900,h=480)=>`<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" role="img" aria-label="Project X lesson diagram"><rect width="${w}" height="${h}" fill="#f9f6ff"/>${body}</svg>`;
const t=(x,y,text,size=21,color='#27203a')=>`<text x="${x}" y="${y}" font-family="Arial,sans-serif" font-size="${size}" fill="${color}">${esc(text)}</text>`;
const r=(x,y,w,h,color='#eee7fa')=>`<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="12" fill="${color}" stroke="#8064aa" stroke-width="2"/>`;
function diagramFor(student){
 const u=unitNo(student.unitId);const title=t(34,48,`Year 11 · ${student.title} — learning diagram`,25,'#41266a');
 if(u==='01'){
  const body=title+r(50,90,495,340)+t(75,126,'CENTRAL PROCESSING UNIT',22,'#542b83')+r(85,162,195,96)+t(116,197,'CONTROL UNIT',19)+t(104,224,'coordinates activity',14)+r(310,162,195,96)+t(342,197,'ALU',22)+t(330,224,'arithmetic / logic',15)+r(85,283,420,99)+t(104,320,'Registers: PC · MAR · MDR · ACC',20)+t(104,349,'Fast storage for current processing',15)+r(620,170,220,130,'#e7efff')+t(650,210,'MAIN MEMORY',20)+t(645,242,'instructions + data',17)+`<path d="M 545 244 H 610 M 610 244 l-16 -9 M 610 244 l-16 9" stroke="#704797" fill="none" stroke-width="4"/>`+t(570,324,'Address/data bus',16)+t(60,446,'TASK: identify where an address is held, where data moves and which part calculates.',17);
  return {name:'CPU_architecture_diagram.svg',svg:root(body),caption:'Label the processing roles and distinguish addresses from data.'};
 }
 if(u==='02'){
  const body=title+[['Registers / cache',80,110,180,'fast · small'],['RAM / ROM',160,210,330,'primary storage'],['SSD / HDD',260,330,550,'secondary storage']].map(([name,x,y,w,note])=>r(x,y,w,85)+t(x+22,y+37,name,22)+t(x+22,y+65,note,16)).join('')+t(80,453,'TASK: compare volatility, access speed, purpose and capacity.',19);
  return {name:'memory_hierarchy.svg',svg:root(body),caption:'Storage hierarchy comparison.'};
 }
 if(u==='03'){
  let cells='';let filled=0;
  for(let row=0;row<8;row++)for(let col=0;col<8;col++){const on=(row===col||row+col===7);if(on)filled++;cells+=`<rect x="${88+col*43}" y="${91+row*40}" width="43" height="40" stroke="#80559c" fill="${on?'#634292':'#ffffff'}"/>`;}
  const body=title+cells+t(495,160,'8 × 8 pixels = 64 pixels',23)+t(495,214,'At 1 bit per pixel:',20)+t(495,251,'64 bits (8 bytes) uncompressed',21)+t(495,330,'TASK: change the pattern',19)+t(495,365,'then calculate its raw storage.',19);
  return {name:'bitmap_grid.svg',svg:root(body),caption:'Binary bitmap representation and raw size calculation.'};
 }
 if(u==='04'){
  const body=title+r(332,110,235,100,'#e7efff')+t(365,157,'NETWORK SWITCH',19)+[0,1,2,3].map((n)=>{const x=80+(n%2)*580,y=275+Math.floor(n/2)*95;return r(x,y,220,70)+t(x+20,y+43,`Device ${n+1}`,19)+`<line x1="${x+110}" y1="${y}" x2="${445}" y2="${210}" stroke="#7553a4" stroke-width="3"/>`}).join('')+t(66,464,'TASK: explain the topology, network hardware and possible points of failure.',17);
  return {name:'network_topology.svg',svg:root(body),caption:'Simple star network model.'};
 }
 if(u==='08'||u==='20'){
  const body=title+r(350,87,200,61)+t(390,125,'START',20)+`<path d="M450 150V205" stroke="#6b468d" stroke-width="4"/>`+`<polygon points="450,210 580,270 450,335 320,270" stroke="#6b468d" stroke-width="3" fill="#eee4fb"/>`+t(391,273,'Condition?',20)+`<path d="M450 334V391 M581 270H720" stroke="#6b468d" stroke-width="4"/>`+r(330,393,240,64)+t(370,432,'Process',22)+t(585,254,'False → exit',17)+t(462,374,'True',16);
  return {name:'algorithm_flowchart.svg',svg:root(body),caption:'Flowchart illustrating a decision and processing sequence.'};
 }
 if(u==='11'){
  const body=title+t(110,125,'A',24)+t(110,180,'B',24)+`<line x1="155" y1="116" x2="320" y2="116" stroke="#65428a" stroke-width="4"/><line x1="155" y1="175" x2="320" y2="175" stroke="#65428a" stroke-width="4"/><path d="M320 95 H385 A80 80 0 0 1 385 200 H320 Z" fill="#ece0fb" stroke="#65428a" stroke-width="4"/>`+`<line x1="464" y1="148" x2="665" y2="148" stroke="#65428a" stroke-width="4"/>`+t(680,157,'A AND B',22)+t(110,300,'Truth table: complete the output column',21)+r(110,327,560,125,'#fff')+t(155,365,'A',20)+t(315,365,'B',20)+t(490,365,'Output',20)+t(140,413,'0 / 0     0 / 1     1 / 0     1 / 1',18);
  return {name:'boolean_and_gate.svg',svg:root(body),caption:'AND gate and truth table template.'};
 }
 if(u==='22'){
  const body=title+t(65,125,'2D array (row, column)',25)+[0,1,2].map(row=>[0,1,2,3].map(col=>r(80+col*140,160+row*75,125,60,'#eee7fa')+t(98+col*140,198+row*75,`[${row}][${col}]`,18)).join('')).join('')+t(80,441,'TASK: explain row-major indexing and calculate a chosen cell value.',19);
  return {name:'array_grid.svg',svg:root(body),caption:'Two-dimensional list indexing scaffold.'};
 }
 if(u==='24'){
  const body=title+r(40,180,225,120)+t(85,222,'Python script',22)+t(65,254,'open / read / write',18)+r(348,180,220,120)+t(390,222,'Text file',22)+t(375,254,'Stored lines',18)+r(654,180,205,120)+t(693,222,'Results',22)+t(672,254,'display / count',18)+`<path d="M265 240H340 M568 240H645" stroke="#65428a" stroke-width="5"/>`+t(66,380,'TASK: mark the file mode (r, w, a) and describe its effect.',19);
  return {name:'file_io_diagram.svg',svg:root(body),caption:'Python file-processing flow diagram.'};
 }
 return null;
}
const startMap={
 '14':`# PROJECT X — Python setup (adapt for your lesson)\nprint("Hello, Year 11")\n`,
 '15':`# Variables and output\nitem = "Notebook"\nprice = 2.50\nquantity = 3\ntotal = price * quantity\nprint(f"{quantity} x {item}: £{total:.2f}")\n`,
 '16':`# Safe input and conversion\nname = input("Name: ").strip()\ntry:\n    age = int(input("Age: "))\n    print(f"Hello {name}, next year you will be {age + 1}.")\nexcept ValueError:\n    print("Enter a whole number for age.")\n`,
 '17':`# Number types and arithmetic\na = 17\nb = 5\nprint("Quotient:", a // b)\nprint("Remainder:", a % b)\nprint("Average:", (a + b) / 2)\n`,
 '18':`# Selection and logical conditions\nscore = 68\nif 0 <= score <= 100:\n    if score >= 70:\n        print("High achievement")\n    elif score >= 50:\n        print("Pass")\n    else:\n        print("Keep practising")\nelse:\n    print("Invalid mark")\n`,
 '19':`# Random numbers\nimport random\nsecret = random.randint(1, 6)\nprint("The die showed", secret)\n`,
 '20':`# Definite and indefinite iteration\ntotal = 0\nfor score in [60, 71, 55, 90]:\n    total += score\nprint("Mean:", total / 4)\n`,
 '21':`# Procedures and functions\ndef calculate_mean(values):\n    if not values:\n        return None\n    return sum(values) / len(values)\n\nprint(calculate_mean([60, 75, 90]))\n`,
 '22':`# Lists and 2D lists\ngrid = [[3, 5], [7, 9]]\nfor row in grid:\n    print(row)\nprint("Bottom-left:", grid[1][0])\n`,
 '23':`# String operations and number formatting\nusername = "  StudentOne  ".strip().lower()\nscore = 7 / 3\nprint(f"{username}: {score:.2f}")\n`,
 '24':`# File I/O example — creates a local practice file\nfrom pathlib import Path\npath = Path("practice_scores.txt")\npath.write_text("Asha,72\\nBen,48\\n", encoding="utf-8")\nfor line in path.read_text(encoding="utf-8").splitlines():\n    print(line)\n`,
 '25':`# Optional GUI enrichment (requires Tkinter)\nimport tkinter as tk\nroot = tk.Tk()\nroot.title("Project X")\ntk.Label(root, text="Hello from Year 11").pack(padx=20, pady=20)\nroot.mainloop()\n`,
 '26':`# Exception handling\ntry:\n    quantity = int(input("Quantity: "))\n    print("You entered", quantity)\nexcept ValueError:\n    print("Please enter a whole number.")\n`
};

function lessonSpecificSupport(student){
 const id=student.lessonId;
 const support={
 'PX25-Y11-U01-L001': {heading:'Guided CPU example',text:'An example (not an assessment answer): PC=80, memory[80]=ADD 220, memory[220]=4 and ACC=6. Identify the next instruction address; trace MAR and MDR during the instruction and operand fetch; then show how the ALU updates ACC. Check why the final accumulator is 10.',challenge:'Now repeat the process using PC=90, ADD 130, memory[130]=9, ACC=2. Annotate every state change.'},
 'PX25-Y11-U01-L002': {heading:'Guided fetch-decode-execute trace',text:'Start with PC=40 and memory[40]=LOAD 75. In the fetch stage copy PC to MAR, read memory[40] into MDR, then pass the instruction to the instruction register and advance PC. During decode, identify opcode and address. Execution loads the operand.',challenge:'Trace a second instruction at a different address and explain how a branch changes PC.'},
 'PX25-Y11-U02-L003': {heading:'Worked raw text-size calculation',text:'A plain-text file contains 175 characters at 8 bits per character. Size = 175 × 8 = 1400 bits, or 175 bytes. Ignore headers only when the question explicitly asks for raw character data.',challenge:'Calculate raw storage of 360 characters at 8 bits and at 16 bits per character.'},
 'PX25-Y11-U08-L003': {heading:'Worked insertion sort',text:'Insertion sort of [6,2,5,1]: insert 2 => [2,6,5,1]; insert 5 => [2,5,6,1]; insert 1 => [1,2,5,6]. Each step maintains a sorted left-hand portion.',challenge:'Trace insertion sort on [9,3,7,2] after each insertion, then explain how merge sort differs.'},
 'PX25-Y11-U09-L003': {heading:'Worked SQL SELECT',text:'For Students(Name, Score) containing (Ada, 68), (Ben, 52) and (Cora, 91), SELECT Name FROM Students WHERE Score >= 60 returns Ada and Cora.',challenge:'Write a query returning Name and Score where Score < 60. Explain the roles of SELECT, FROM and WHERE.'},
 'PX25-Y11-U10-L002': {heading:'Worked test-plan structure',text:'For a valid mark from 0 to 100, test normal input 50 (accept), boundary inputs 0 and 100 (accept), invalid input 101 (reject), and erroneous text input abc (handle without crashing). Record expected and actual outcomes separately.',challenge:'Build a test table for a different inclusive range, 1 to 12, including two boundaries and invalid types.'},
 'PX25-Y11-U11-L001': {heading:'Boolean reasoning model',text:'AND gives true only if both inputs are true; OR gives true if at least one is true; NOT reverses its input. Trace each subexpression before evaluating a combined expression.',challenge:'Fill in all four rows of (A AND B) OR NOT A, recording the intermediate AND and NOT values.'},
 'PX25-Y11-U20-L001': {heading:'Worked iteration trace',text:'For total=0 and values [2,4,6]: after adding 2 total is 2; after adding 4 total is 6; after adding 6 total is 12. Distinguish the changing accumulator from the loop variable.',challenge:'Trace the same loop with [3,1,5,7] and compute its mean.'},
 'PX25-Y11-U24-L001': {heading:'Writing a practice file',text:'A context manager closes files safely: with open("practice.txt", "w", encoding="utf-8") as f: f.write("first line\\n"). The w mode replaces existing contents; a mode appends.',challenge:'Write a script to append two extra lines, then read the file and print its contents.'}
 };
 return support[id]||null;
}

export function createStudentPack(raw){
 const student=safeStudentContent(raw),unit=unitNo(student.unitId); const diagram=diagramFor(student),starter=startMap[unit]||null;
 const example=lessonSpecificSupport(student);
 const teacherExample=student.activities.filter(a=>a.requiresTeacherProvidedExample);
 const resourceWarnings=[];
 if(teacherExample.length && !example)resourceWarnings.push(`Teacher-supplied worked example still needed in ${teacherExample.map(a=>a.stageId).join(', ')} stage(s).`);
 if(example)resourceWarnings.push('A demonstration example is included; teacher must verify it matches the intended lesson sequence.');
 if(!diagram)resourceWarnings.push('No subject-specific diagram generated for this unit; attach one manually if the lesson calls for a diagram.');
 if(/worksheet|video|diagram|slide|handout|external|download/i.test(student.activities.map(a=>a.instructions).join(' ')) && !diagram) resourceWarnings.push('Some activity instructions mention external resources that are not included.');
 const stepMarkup=student.activities.map((a,i)=>`<li><strong>${i+1}. ${esc(a.stageId)}</strong> — ${esc(a.instructions)}${a.requiresTeacherProvidedExample?' <em>(Teacher will provide a worked example in class.)</em>':''}<div class="answerbox"></div></li>`).join('');
 const qMarkup=student.questions.map((q,i)=>`<li><p><b>Question ${i+1} (${q.marks} ${q.marks===1?'mark':'marks'})</b> — ${esc(q.question)}</p><div class="answerbox tall"></div></li>`).join('');
 const doc=`<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Project X Worksheet — ${esc(student.title)}</title><style>body{font:14px/1.6 Arial,sans-serif;max-width:820px;margin:auto;padding:30px;color:#242036}h1,h2{color:#4c2e78}h1{border-bottom:3px solid #c4a36e;padding-bottom:12px}.muted{color:#605874}.answerbox{min-height:35px;border-bottom:1px dotted #aaa;margin:12px 0}.tall{min-height:80px}li{margin-bottom:16px}.notes{background:#f3edf9;padding:13px}ol{padding-left:26px}footer{margin-top:25px;border-top:1px solid #ddd;padding-top:12px;font-size:11px}</style></head><body><h1>${esc(student.title)}</h1><p class="muted">Project X · Year 11 · OCR GCSE J277 · Initial teaching pilot</p><p><strong>Name:</strong> ___________________ <strong>Date:</strong> _____________</p><section><h2>Learning context</h2><p>${esc(student.intro)}</p></section>${example?`<section class="notes"><h2>${esc(example.heading)}</h2><p>${esc(example.text)}</p><p><strong>Independent transfer:</strong> ${esc(example.challenge)}</p></section>`:``}<section><h2>Lesson tasks</h2><ol>${stepMarkup}</ol></section>${diagram?`<section><h2>Visual resource</h2><p>${esc(diagram.caption)}</p><p><em>See the separately attached diagram file.</em></p></section>`:''}${starter?`<section><h2>Programming activity</h2><p>Open the supplied Python starter code. Predict its output, run it, then adapt it to the lesson task.</p><div class="notes">Predict: ______________________________<br> Actual result: _________________________<br> Change made: ________________________</div></section>`:''}<section><h2>Assessment — 10 marks</h2><p>Answer independently; justify your reasoning where required.</p><ol>${qMarkup}</ol></section><section><h2>Reflection</h2><p>One concept I can explain: _______________________________________</p><p>One question for next time: _______________________________________</p></section><footer>ProjectX-Ref: ${esc(student.lessonId)} | ${esc(RELEASE_ID)} | student-resource-pack-v4 · Original Project X practice questions; not an OCR past paper. No teacher marking scheme included.</footer></body></html>`;
 const files=[{kind:'worksheet',name:`${student.lessonId}_Worksheet.html`,mime:'text/html',content:doc,convertToDoc:true,shareMode:'STUDENT_COPY'}];
 if(diagram)files.push({kind:'diagram',name:`${student.lessonId}_${diagram.name}`,mime:'image/svg+xml',content:diagram.svg,convertToDoc:false,shareMode:'VIEW'});
 if(starter)files.push({kind:'code',name:`${student.lessonId}_Starter.py`,mime:'text/x-python',content:`# ${student.lessonId} — ${student.title}\n# Project X original starter; check lesson alignment and adapt.\n${starter}`,convertToDoc:false,shareMode:'VIEW'});
 return {lessonId:student.lessonId,title:student.title,unitId:student.unitId,revisionId:RELEASE_ID,files,resourceWarnings,needsTeacherReview:true,assessmentCount:student.questions.length,assessmentMarks:student.questions.reduce((a,x)=>a+x.marks,0)};
}
export function packSummary(pack){return `${pack.files.map(f=>f.kind).join(', ')}${pack.resourceWarnings.length?' | CHECK: '+pack.resourceWarnings.join(' '):''}`;}
export function resourceMarker(lessonId){return `ProjectX-Ref: ${lessonId} | ${RELEASE_ID} | resource-pack-v4`;}
export function buildResourceMaterial(student,topicId,resources){
 const s=safeStudentContent(student);const intro=[`Project X · Y11 · ${s.title}`,`Student resource package: ${resources.files.map(f=>f.kind).join(', ')}.`,`A worksheet has been prepared for student work; teacher must verify the attachments before publishing. Marking guidance remains private.`,resources.resourceWarnings.length?`TEACHER CHECK REQUIRED: ${resources.resourceWarnings.join(' ')}`:'Teacher: verify final resource quality and visibility before publication.',resourceMarker(s.lessonId)].join('\n\n');
 return {title:`Y11 resources · ${s.title}`.slice(0,170),description:intro,topicId,state:'DRAFT'};
}
export function downloadTextFile(file,download){
 const blob=new Blob([file.content],{type:file.mime+';charset=utf-8'}),url=URL.createObjectURL(blob);
 const a=document.createElement('a');a.href=url;a.download=file.name;a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 return file.name;
}
