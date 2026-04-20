import { mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { sampleData } from './data/sampleData.js';
import { generateShiftPlan } from './engine/scheduler.js';
import { exportShiftXlsx } from './export/excel.js';
import { acquireSiteLock, releaseLock, saveData } from './persistence/store.js';

const OUTPUT_DIR = join(process.cwd(), 'output');

async function main(): Promise<void> {
  await mkdir(OUTPUT_DIR, { recursive: true });
  const lockPaths = await Promise.all(
    sampleData.sites.map((site) => acquireSiteLock(OUTPUT_DIR, site.siteId)),
  );

  try {
    const plan = generateShiftPlan(sampleData, '2026-03-02', '2026-03-03');
    await saveData(OUTPUT_DIR, sampleData, plan);
    await exportShiftXlsx(plan, sampleData.sites, sampleData.staff, join(OUTPUT_DIR, 'shift-plan.xlsx'));
    console.log('Shift generated:', plan.assignments.length);
    console.log('Vacancies:', plan.vacancyAlerts.length);
    console.log('Policy alerts:', plan.policyAlerts.length);
  } finally {
    await Promise.all(lockPaths.map((path) => releaseLock(path)));
  }
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
