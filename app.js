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

function populateDatalist(id, items){
  const dl = document.getElementById(id);
  dl.innerHTML = '';
  const uniq = Array.from(new Set(items)).filter(Boolean).sort();
  uniq.forEach(v=>{ const opt = document.createElement('option'); opt.value = v; dl.appendChild(opt); });
}

function extractPdfTitle(url){
  // extract filename: https://...files/2023-05/2023-24-example-title-merged.pdf
  const match = url.match(/\/([^/]+)\.pdf$/i);
  if(!match){ return 'PDF'; }
  let filename = match[1];
  // remove date prefix like "2023-24-"
  filename = filename.replace(/^\d{4}-\d{2}-/, '');
  // remove "-merged" suffix
  filename = filename.replace(/-merged$/, '');
  // replace hyphens with spaces and capitalize
  const title = filename.split('-').map(w=>w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
  return title;
}

function renderCell(headerName, value){
  const cell = document.createElement('td');
  if(!value){ return cell; }
  
  const isUrlField = /^(2023|2024|2025|2026)$/.test(headerName);
  if(isUrlField && value.includes('http')){
    // split by ' ; ' for multiple URLs
    const urls = value.split(/\s*;\s*/).filter(u=>u.trim());
    urls.forEach((url, i) => {
      const a = document.createElement('a');
      const trimmedUrl = url.trim();
      a.href = trimmedUrl;
      a.target = '_blank';
      a.rel = 'noopener';
      a.textContent = extractPdfTitle(trimmedUrl);
      cell.appendChild(a);
      if(i < urls.length - 1){ cell.appendChild(document.createElement('br')); }
    });
  } else {
    cell.textContent = value;
  }
  return cell;
}

function showDetails(rows, headers){
  const tbody = document.querySelector('#details tbody'); tbody.innerHTML = '';
  if(!rows || rows.length === 0){ tbody.innerHTML = '<tr><td>No matches</td></tr>'; return; }

  rows.forEach((row, idx) => {
    const titleTr = document.createElement('tr');
    const titleTh = document.createElement('th'); titleTh.colSpan = 2; titleTh.textContent = `${row.prgrm_type} — ${row.prgrm_name}`;
    titleTr.appendChild(titleTh); tbody.appendChild(titleTr);

    headers.forEach(h=>{
      const tr = document.createElement('tr');
      const th = document.createElement('th'); th.textContent = h;
      const td = renderCell(h, row[h] || '');
      tr.appendChild(th); tr.appendChild(td); tbody.appendChild(tr);
    });

    if(idx < rows.length - 1){ const sep = document.createElement('tr'); const empty = document.createElement('td'); empty.colSpan = 2; empty.style.height = '8px'; sep.appendChild(empty); tbody.appendChild(sep); }
  });
}

async function init(){
  const rows = await loadCSV('data/checklist.csv');
  const {headers, data} = buildLookup(rows);
  // populate datalists
  const majors = data.filter(r=>r.prgrm_type === 'Major').map(r=>r.prgrm_name);
  const minors = data.filter(r=>r.prgrm_type === 'Minor').map(r=>r.prgrm_name);
  const cons = data.filter(r=>r.prgrm_type === 'Concentration').map(r=>r.prgrm_name);

  populateDatalist('major_list', majors);
  // keep minor and concentration lists strictly separate
  populateDatalist('minor_list', minors);
  populateDatalist('con_list', cons);

  const majorInput = document.getElementById('major_input');
  const minorInput = document.getElementById('minor_input');
  const conInput = document.getElementById('con_input');
  const searchBtn = document.getElementById('search_btn');
  const clearBtn = document.getElementById('clear_btn');

  function doSearch(){
    const results = [];
    const seen = new Set();
    const m = (majorInput.value || '').trim();
    const mi = (minorInput.value || '').trim();
    const c = (conInput.value || '').trim();

    if(m){ const row = data.find(r=>r.prgrm_type === 'Major' && r.prgrm_name === m); if(row && !seen.has(row.prgrm_name)){ results.push(row); seen.add(row.prgrm_name); } }
    if(mi){ const row = data.find(r=>r.prgrm_type === 'Minor' && r.prgrm_name === mi); if(row && !seen.has(row.prgrm_name)){ results.push(row); seen.add(row.prgrm_name); } }
    if(c){ const row = data.find(r=>r.prgrm_type === 'Concentration' && r.prgrm_name === c); if(row && !seen.has(row.prgrm_name)){ results.push(row); seen.add(row.prgrm_name); } }

    showDetails(results, headers);
  }

  searchBtn.addEventListener('click', doSearch);
  clearBtn.addEventListener('click', ()=>{ majorInput.value = ''; minorInput.value = ''; conInput.value = ''; showDetails([], headers); });


  [majorInput, minorInput, conInput].forEach(inp => {
    inp.addEventListener('keydown', (e)=>{ if(e.key === 'Enter'){ e.preventDefault(); doSearch(); } });
    inp.addEventListener('focus', ()=>{ inp.value = ''; });
    inp.addEventListener('click', ()=>{ inp.value = ''; });
  });

  // initial empty state
  showDetails([], headers);
}

init().catch(err=>{
  console.error(err);
  const tbody = document.querySelector('#details tbody');
  tbody.innerHTML = '<tr><td>Error loading data. See console.</td></tr>';
});
