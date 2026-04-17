export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface WeekdayTimeRule {
  weekday: Weekday;
  start: string;
  end: string;
}

export interface ShiftSlot {
  slotId: string;
  slotName: string;
  weekdayTimeRules: WeekdayTimeRule[];
  roles: string[];
}

export interface Site {
  siteId: string;
  siteName: string;
  shiftSlots: ShiftSlot[];
  demand: Record<string, Record<string, number>>; // key: yyyy-mm-dd|slotId|role
}

export interface StaffAssignmentCapability {
  siteId: string;
  slotIds: string[];
  roles: string[];
}

export interface Staff {
  staffId: string;
  name: string;
  age: number;
  assignments: StaffAssignmentCapability[];
  weeklyContractDays: number;
  preferredWeekdays: Weekday[];
}

export type TimeOffScope =
  | { type: 'FULL_DAY' }
  | { type: 'SLOT_NG'; slotId: string };

export interface TimeOff {
  staffId: string;
  date: string;
  scope: TimeOffScope;
}

export interface RuleConfig {
  strictPreferredWeekdays: boolean;
  minOffDaysPerWeek: number;
  maxConsecutiveWorkDays: number;
}

export interface Period {
  startDate: string;
  endDate: string;
}

export interface Assignment {
  date: string;
  siteId: string;
  slotId: string;
  role: string;
  staffId: string;
  reasonAlerts: string[];
}

export interface VacancyAlert {
  date: string;
  siteId: string;
  slotId: string;
  role: string;
  shortage: number;
}

export interface ShiftPlan {
  period: Period;
  assignments: Assignment[];
  vacancyAlerts: VacancyAlert[];
  policyAlerts: string[];
}

export interface AppData {
  sites: Site[];
  staff: Staff[];
  timeOff: TimeOff[];
  rules: RuleConfig;
}
