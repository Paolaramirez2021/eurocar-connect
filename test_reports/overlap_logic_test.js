// Verify overlap logic matches ReservationForm.tsx
function overlaps(newStart, newEnd, rStart, rEnd) {
  return newStart < rEnd && newEnd > rStart;
}

const cases = [
  // [newStart, newEnd, rStart, rEnd, expected, description]
  ['2026-07-14', '2026-07-17', '2026-07-11', '2026-07-14', false, 'Same-day turnaround: new starts on day existing ends'],
  ['2026-07-11', '2026-07-14', '2026-07-14', '2026-07-17', false, 'Same-day turnaround: new ends on day existing starts'],
  ['2026-07-13', '2026-07-17', '2026-07-11', '2026-07-14', true, 'True overlap (mid)'],
  ['2026-07-11', '2026-07-14', '2026-07-11', '2026-07-14', true, 'Exact same dates'],
  ['2026-07-10', '2026-07-15', '2026-07-11', '2026-07-14', true, 'Existing fully inside new'],
  ['2026-07-12', '2026-07-13', '2026-07-11', '2026-07-14', true, 'New fully inside existing'],
  ['2026-07-15', '2026-07-17', '2026-07-11', '2026-07-14', false, 'No overlap (after gap)'],
];

let pass = 0, fail = 0;
for (const [ns, ne, rs, re, exp, desc] of cases) {
  const got = overlaps(ns, ne, rs, re);
  const ok = got === exp;
  console.log(`${ok ? 'PASS' : 'FAIL'}: ${desc} => expected=${exp}, got=${got}`);
  ok ? pass++ : fail++;
}
console.log(`\nTotal: ${pass}/${cases.length} passed, ${fail} failed`);
process.exit(fail > 0 ? 1 : 0);
