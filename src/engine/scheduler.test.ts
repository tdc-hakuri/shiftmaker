import test from 'node:test';
import assert from 'node:assert/strict';
import { sampleData } from '../data/sampleData.js';
import { generateShiftPlan } from './scheduler.js';

test('希望休(SLOT_NG)を守る', () => {
  const plan = generateShiftPlan(sampleData, '2026-03-03', '2026-03-03');
  const forbidden = plan.assignments.find(
    (a) => a.staffId === 'suzuki' && a.date === '2026-03-03' && a.slotId === 'late',
  );
  assert.equal(forbidden, undefined);
});

test('欠員がある場合はvacancyAlertsに出る', () => {
  const plan = generateShiftPlan(sampleData, '2026-03-02', '2026-03-02');
  assert.ok(plan.vacancyAlerts.length >= 1);
});
