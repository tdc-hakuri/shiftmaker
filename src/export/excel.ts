import Excel from 'exceljs';
import { ShiftPlan, Site, Staff } from '../domain/models.js';

export async function exportShiftXlsx(
  plan: ShiftPlan,
  sites: Site[],
  staffList: Staff[],
  filePath: string,
): Promise<void> {
  const wb = new Excel.Workbook();
  const staffMap = new Map(staffList.map((s) => [s.staffId, s]));

  for (const site of sites) {
    const ws = wb.addWorksheet(`${site.siteName}-${plan.period.startDate}`.slice(0, 31));
    ws.addRow(['役割\\日付', ...dateRange(plan.period.startDate, plan.period.endDate)]);

    for (const slot of site.shiftSlots) {
      ws.addRow([`--- ${slot.slotName} ---`]);
      for (const role of slot.roles) {
        const row: string[] = [`${slot.slotName}:${role}`];
        for (const date of dateRange(plan.period.startDate, plan.period.endDate)) {
          const names = plan.assignments
            .filter(
              (a) =>
                a.siteId === site.siteId && a.slotId === slot.slotId && a.role === role && a.date === date,
            )
            .map((a) => {
              const staff = staffMap.get(a.staffId);
              return staff ? `${staff.name}(${staff.staffId})` : a.staffId;
            })
            .join(', ');
          const shortage = plan.vacancyAlerts
            .filter(
              (v) =>
                v.siteId === site.siteId && v.slotId === slot.slotId && v.role === role && v.date === date,
            )
            .reduce((sum, s) => sum + s.shortage, 0);
          row.push(shortage > 0 ? `${names} [不足:${shortage}]`.trim() : names);
        }
        ws.addRow(row);
      }
    }
  }
  await wb.xlsx.writeFile(filePath);
}

function dateRange(startDate: string, endDate: string): string[] {
  const out: string[] = [];
  const d = new Date(startDate);
  const end = new Date(endDate);
  while (d <= end) {
    out.push(d.toISOString().slice(0, 10));
    d.setDate(d.getDate() + 1);
  }
  return out;
}
