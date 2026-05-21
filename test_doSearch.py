import csv
import sys

with open('data/checklist.csv', newline='', encoding='utf-8') as f:
    reader = csv.reader(f)
    rows = list(reader)

headers = [h.strip() for h in rows[0]]
data = []
for r in rows[1:]:
    obj = {headers[i]: (r[i].strip() if i < len(r) else '') for i in range(len(headers))}
    data.append(obj)

minors = [r['prgrm_name'] for r in data if r['prgrm_type'] == 'Minor']
cons = [r['prgrm_name'] for r in data if r['prgrm_type'] == 'Concentration']

ok = True

for name in cons:
    row = next((r for r in data if r['prgrm_type'] == 'Concentration' and r['prgrm_name'] == name), None)
    if not row:
        print('FAIL: concentration not found for', name)
        ok = False

for name in minors:
    row = next((r for r in data if r['prgrm_type'] == 'Minor' and r['prgrm_name'] == name), None)
    if not row:
        print('FAIL: minor not found for', name)
        ok = False

# report names that exist in both lists
both = set(minors) & set(cons)
if both:
    print('Names present as both Minor and Concentration:', file=sys.stderr)
    for n in sorted(both):
        print(' -', n, file=sys.stderr)

if ok:
    print('All direct lookups OK')
    sys.exit(0)
else:
    sys.exit(1)
