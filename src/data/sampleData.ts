import { AppData } from '../domain/models.js';

export const sampleData: AppData = {
  sites: [
    {
      siteId: 'site-a',
      siteName: 'A現場',
      shiftSlots: [
        {
          slotId: 'early',
          slotName: '早番',
          weekdayTimeRules: [
            { weekday: 1, start: '08:00', end: '12:00' },
            { weekday: 2, start: '08:00', end: '12:00' },
            { weekday: 6, start: '09:00', end: '12:00' },
          ],
          roles: ['床', 'トイレ', '台拭き'],
        },
        {
          slotId: 'late',
          slotName: '遅番',
          weekdayTimeRules: [
            { weekday: 1, start: '13:00', end: '17:00' },
            { weekday: 2, start: '13:00', end: '17:00' },
            { weekday: 6, start: '13:00', end: '16:00' },
          ],
          roles: ['床', 'トイレ'],
        },
      ],
      demand: {
        '2026-03-02|early|床': { 床: 1 },
        '2026-03-02|early|トイレ': { トイレ: 1 },
        '2026-03-02|early|台拭き': { 台拭き: 1 },
        '2026-03-02|late|床': { 床: 1 },
        '2026-03-02|late|トイレ': { トイレ: 1 },
        '2026-03-03|early|床': { 床: 1 },
        '2026-03-03|early|トイレ': { トイレ: 1 },
        '2026-03-03|late|床': { 床: 1 },
        '2026-03-03|late|トイレ': { トイレ: 1 }
      },
    },
  ],
  staff: [
    {
      staffId: 'suzuki',
      name: '鈴木',
      age: 34,
      assignments: [{ siteId: 'site-a', slotIds: ['early', 'late'], roles: ['床', 'トイレ'] }],
      weeklyContractDays: 4,
      preferredWeekdays: [1, 2, 3, 4],
    },
    {
      staffId: 'sato',
      name: '佐藤',
      age: 41,
      assignments: [{ siteId: 'site-a', slotIds: ['early'], roles: ['床', '台拭き', 'トイレ'] }],
      weeklyContractDays: 3,
      preferredWeekdays: [1, 2, 5, 6],
    },
  ],
  timeOff: [{ staffId: 'suzuki', date: '2026-03-03', scope: { type: 'SLOT_NG', slotId: 'late' } }],
  rules: {
    strictPreferredWeekdays: false,
    minOffDaysPerWeek: 2,
    maxConsecutiveWorkDays: 5,
  },
};
