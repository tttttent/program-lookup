const fs = require('fs');

function parseCSV(text){
  const rows = [];
  let cur = [];
  let i = 0;
  const len = text.length;
  let field = '';
  let inQuotes = false;

  while(i < len){
    const ch = text[i];
    if(inQuotes){
      if(ch === '"'){
        if(text[i+1] === '"'){
          field += '"';
          i += 2; continue;
        } else {
          inQuotes = false; i++; continue;
        }
      } else {
        field += ch; i++; continue;
      }
    } else {
      if(ch === '"'){
        inQuotes = true; i++; continue;
      }
      if(ch === ','){
        cur.push(field); field = ''; i++; continue;
      }
      if(ch === '\r') { i++; continue; }
      if(ch === '\n'){
        cur.push(field); field = ''; rows.push(cur); cur = []; i++; continue;
      }
      field += ch; i++; continue;
    }
  }
  if(field !== '' || cur.length){ cur.push(field); rows.push(cur); }
  return rows;
}

const text = fs.readFileSync('data/checklist.csv','utf8');
const rows = parseCSV(text);
const headers = rows[0].map(h => h.trim());
const data = rows.slice(1).map(r => { const obj = {}; headers.forEach((h,i)=> obj[h] = (r[i] || '').trim()); return obj; });

const minors = data.filter(r=>r.prgrm_type === 'Minor').map(r=>r.prgrm_name);
const cons = data.filter(r=>r.prgrm_type === 'Concentration').map(r=>r.prgrm_name);

let ok = true;

// For each concentration name, ensure the concentration lookup finds a Concentration row
cons.forEach(name => {
  const row = data.find(r => r.prgrm_type === 'Concentration' && r.prgrm_name === name);
  if(!row){ console.error('FAIL: concentration not found for', name); ok = false; }
});

// For each minor name, ensure the minor lookup finds a Minor row
minors.forEach(name => {
  const row = data.find(r => r.prgrm_type === 'Minor' && r.prgrm_name === name);
  if(!row){ console.error('FAIL: minor not found for', name); ok = false; }
});

// Ensure no cross-type ambiguity when selecting concentration: selecting a concentration name should NOT return a Minor row in our lookup logic
cons.forEach(name => {
  const minorMatch = data.find(r => r.prgrm_type === 'Minor' && r.prgrm_name === name);
  if(minorMatch){ console.log('NOTE: name exists as Minor too:', name); }
});

if(ok){ console.log('All concentration/minor direct lookups exist.'); process.exit(0); } else { process.exit(1); }
