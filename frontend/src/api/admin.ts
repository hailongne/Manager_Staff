import axios from './axios';

// ============= SETTINGS ADMIN API =============

export const getSettings = async () => {
  const response = await axios.get('/admin/settings');
  return response.data;
};

export const updateSettings = async (data: {
  standard_workdays_per_month?: number;
  overtime_rate?: number;
  late_tolerance_minutes?: number;
  late_cutoff_hour?: number;
  early_leave_hour?: number;
}) => {
  const response = await axios.put('/admin/settings', data);
  return response.data;
};

