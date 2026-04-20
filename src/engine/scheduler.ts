import {
  AppData,
  Assignment,
  RuleConfig,
  ShiftPlan,
  Staff,
  VacancyAlert,
  Weekday,
} from '../domain/models.js';

interface StaffStats {
  assignedDates: Set<string>;
  weekdayCount: Map<Weekday, number>;
  roleCount: Map<string, number>;
}

const toDateKey = (date: Date) => date.toISOString().slice(0, 10);

function* eachDay(startDate: string, endDate: string): Generator<string> {
  const d = new Date(startDate);
  const end = new Date(endDate);
  while (d <= end) {
    yield toDateKey(d);
    d.setDate(d.getDate() + 1);
  }
}

function isTimeOff(staffId: string, date: string, slotId: string, appData: AppData): boolean {
  return appData.timeOff.some((t) => {
    if (t.staffId !== staffId || t.date !== date) {
      return false;
    }
    if (t.scope.type === 'FULL_DAY') {
      return true;
    }
    return t.scope.type === 'SLOT_NG' && t.scope.slotId === slotId;
  });
}

function canHandle(staff: Staff, siteId: string, slotId: string, role: string): boolean {
  return staff.assignments.some(
    (a) => a.siteId === siteId && a.slotIds.includes(slotId) && a.roles.includes(role),
  );
}

function getWeekday(dateKey: string): Weekday {
  return new Date(dateKey).getDay() as Weekday;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  const weekday = d.getDay();
  const diffToMonday = (weekday + 6) % 7;
  d.setDate(d.getDate() - diffToMonday);
  d.setHours(0, 0, 0, 0);
  return d;
}

function countWeekAssignments(staffId: string, dateKey: string, assignments: Assignment[]): number {
  const date = new Date(dateKey);
  const start = startOfWeek(date);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const uniqueDates = new Set(
    assignments
      .filter((a) => a.staffId === staffId)
      .map((a) => a.date)
      .filter((d) => new Date(d) >= start && new Date(d) <= end),
  );
  return uniqueDates.size;
}

function consecutiveDays(staffId: string, dateKey: string, assignments: Assignment[]): number {
  let streak = 1;
  let cursor = new Date(dateKey);
  for (let i = 0; i < 20; i += 1) {
    cursor.setDate(cursor.getDate() - 1);
    const prev = toDateKey(cursor);
    const worked = assignments.some((a) => a.staffId === staffId && a.date === prev);
    if (!worked) {
      return streak;
    }
    streak += 1;
  }
  return streak;
}

function candidateScore(
  staff: Staff,
  date: string,
  role: string,
  stats: StaffStats,
  assignments: Assignment[],
  rule: RuleConfig,
): { score: number; alerts: string[] } {
  let score = 0;
  const alerts: string[] = [];
  const weekday = getWeekday(date);

  if (!staff.preferredWeekdays.includes(weekday)) {
    if (rule.strictPreferredWeekdays) {
      return { score: Number.NEGATIVE_INFINITY, alerts: ['基本勤務曜日違反(厳格モード)'] };
    }
    score += 50;
    alerts.push('基本勤務曜日違反');
  }

  const weeklyAssigned = countWeekAssignments(staff.staffId, date, assignments);
  score += Math.abs(staff.weeklyContractDays - (weeklyAssigned + 1)) * 10;

  const currentWeekdayCount = stats.weekdayCount.get(weekday) ?? 0;
  score += currentWeekdayCount * 2;

  const currentRoleCount = stats.roleCount.get(role) ?? 0;
  score += currentRoleCount * 3;

  const streak = consecutiveDays(staff.staffId, date, assignments);
  if (streak > rule.maxConsecutiveWorkDays) {
    score += 100;
    alerts.push(`連勤上限超過(${streak}日)`);
  }

  return { score, alerts };
}

export function generateShiftPlan(
  appData: AppData,
  startDate: string,
  endDate: string,
): ShiftPlan {
  const assignments: Assignment[] = [];
  const vacancyAlerts: VacancyAlert[] = [];
  const policyAlerts: string[] = [];

  const staffStats = new Map<string, StaffStats>();
  appData.staff.forEach((s) => {
    staffStats.set(s.staffId, {
      assignedDates: new Set(),
      weekdayCount: new Map(),
      roleCount: new Map(),
    });
  });

  for (const date of eachDay(startDate, endDate)) {
    for (const site of appData.sites) {
      for (const slot of site.shiftSlots) {
        for (const role of slot.roles) {
          const key = `${date}|${slot.slotId}|${role}`;
          const demand = site.demand[key] ?? {};
          const needed = demand[role] ?? 0;

          for (let i = 0; i < needed; i += 1) {
            const candidates = appData.staff
              .filter((staff) => canHandle(staff, site.siteId, slot.slotId, role))
              .filter((staff) => !isTimeOff(staff.staffId, date, slot.slotId, appData))
              .filter(
                (staff) =>
                  !assignments.some(
                    (a) =>
                      a.staffId === staff.staffId &&
                      a.date === date &&
                      a.siteId === site.siteId &&
                      a.slotId === slot.slotId,
                  ),
              )
              .map((staff) => {
                const stats = staffStats.get(staff.staffId)!;
                const { score, alerts } = candidateScore(
                  staff,
                  date,
                  role,
                  stats,
                  assignments,
                  appData.rules,
                );
                return { staff, score, alerts };
              })
              .filter((c) => c.score > Number.NEGATIVE_INFINITY)
              .sort((a, b) => a.score - b.score);

            const picked = candidates[0];
            if (!picked) {
              vacancyAlerts.push({
                date,
                siteId: site.siteId,
                slotId: slot.slotId,
                role,
                shortage: 1,
              });
              continue;
            }

            const assign: Assignment = {
              date,
              siteId: site.siteId,
              slotId: slot.slotId,
              role,
              staffId: picked.staff.staffId,
              reasonAlerts: picked.alerts,
            };
            assignments.push(assign);

            const stats = staffStats.get(picked.staff.staffId)!;
            stats.assignedDates.add(date);
            const weekday = getWeekday(date);
            stats.weekdayCount.set(weekday, (stats.weekdayCount.get(weekday) ?? 0) + 1);
            stats.roleCount.set(role, (stats.roleCount.get(role) ?? 0) + 1);

            picked.alerts.forEach((a) => {
              policyAlerts.push(
                `${date} ${picked.staff.name} ${site.siteName}/${slot.slotName}/${role}: ${a}`,
              );
            });
          }
        }
      }
    }
  }

  return {
    period: { startDate, endDate },
    assignments,
    vacancyAlerts,
    policyAlerts,
  };
}
