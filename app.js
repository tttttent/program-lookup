async function loadCSV(path){
  const res = await fetch(path);
  const text = await res.text();
  return parseCSV(text);
}

// Basic CSV parser that handles quoted fields
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
  // last field/row
  if(inQuotes){ /* malformed but attempt to close */ }
  if(field !== '' || cur.length){ cur.push(field); rows.push(cur); }
  return rows;
}

function buildLookup(rows){
  const headers = rows[0].map(h => h.trim());
  const data = rows.slice(1).map(r => {
    const obj = {};
    headers.forEach((h,i)=> obj[h] = (r[i] || '').trim());
    return obj;
  });
  return {headers, data};
}

function populateTypeDropdown(data){
  const types = Array.from(new Set(data.map(r=>r.prgrm_type))).filter(Boolean).sort();
  const sel = document.getElementById('prgrm_type');
  types.forEach(t=>{
    const o = document.createElement('option'); o.value = t; o.textContent = t; sel.appendChild(o);
  });
}

function populateProgramDropdown(data, type){
  const sel = document.getElementById('prgrm_name');
  sel.innerHTML = '<option value="">-- select program --</option>';
  const filtered = data.filter(r=>r.prgrm_type === type).map(r=>r.prgrm_name).filter(Boolean).sort();
  filtered.forEach(n=>{
    const o = document.createElement('option'); o.value = n; o.textContent = n; sel.appendChild(o);
  });
}

function showDetails(row, headers){
  const tbody = document.querySelector('#details tbody'); tbody.innerHTML = '';
  if(!row){ tbody.innerHTML = '<tr><td>No selection</td></tr>'; return; }
  headers.forEach(h=>{
    const tr = document.createElement('tr');
    const th = document.createElement('th'); th.textContent = h; const td = document.createElement('td'); td.textContent = row[h] || '';
    tr.appendChild(th); tr.appendChild(td); tbody.appendChild(tr);
  });
}

async function init(){
  const rows = await loadCSV('data/checklist.csv');
  const {headers, data} = buildLookup(rows);
  populateTypeDropdown(data);

  const typeSel = document.getElementById('prgrm_type');
  const nameSel = document.getElementById('prgrm_name');

  typeSel.addEventListener('change', ()=>{
    const t = typeSel.value; populateProgramDropdown(data, t); showDetails(null, headers);
  });

  nameSel.addEventListener('change', ()=>{
    const name = nameSel.value; const row = data.find(r=>r.prgrm_name === name && r.prgrm_type === typeSel.value);
    showDetails(row, headers);
  });
}

init().catch(err=>{
  console.error(err);
  const tbody = document.querySelector('#details tbody');
  tbody.innerHTML = '<tr><td>Error loading data. See console.</td></tr>';
});
