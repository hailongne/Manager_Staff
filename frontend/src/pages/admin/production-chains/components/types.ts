export interface KpiWeek {
  week_index: number;
  start_date: string;
  end_date: string;
  target_value: number;
  working_days: number;
  days: KpiDay[];
}

export interface KpiDay {
  date: string;
  target_value: number;
  is_working_day: boolean;
  is_completed?: boolean;
  user_attending?: boolean; // User choice to attend work on this day
}