// API chuỗi sản xuất
import api from "./axios";

export interface ProductionChainFeedback {
  feedback_id: number;
  chain_id: number;
  message: string;
  sender_id: number;
  sender_role: 'leader' | 'admin';
  created_at: string;
  sender?: {
    user_id: number;
    name: string;
    email: string;
  };
}

export interface ProductionChainStep {
  step_id?: number;
  chain_id?: number;
  step_order: number;
  department_id: number;
  title: string;
  // description?: string;
  estimated_duration?: number;
  created_at?: string;
  updated_at?: string;
  department?: {
    department_id: number;
    name: string;
  };
}

export interface ProductionChain {
  chain_id?: number;
  name: string;
  description?: string;
  created_by: number;
  status: 'active' | 'inactive';
  created_at?: string;
  updated_at?: string;
  steps: ProductionChainStep[];
  creator?: {
    user_id: number;
    name: string;
  };
  feedbackUser?: {
    user_id: number;
    name: string;
    email: string;
  };
}

// Tạo chuỗi sản xuất mới
export const createProductionChain = async (data: {
  name: string;
  description?: string;
  steps: Omit<ProductionChainStep, 'step_id' | 'chain_id' | 'estimated_duration'>[];
}): Promise<ProductionChain> => {
  const { data: response } = await api.post("/production-chains", data);
  return response.chain;
};

// Lấy danh sách chuỗi sản xuất
export const getProductionChains = async (): Promise<ProductionChain[]> => {
  const { data } = await api.get("/production-chains");
  return data;
};

// Lấy danh sách chuỗi sản xuất đã vô hiệu hóa
export const getDisabledProductionChains = async (): Promise<ProductionChain[]> => {
  const { data } = await api.get("/production-chains/disabled");
  return data;
};

// Bắt đầu chuỗi sản xuất
export const startProductionChain = async (
  chain_id: number,
  data: { title?: string; description?: string; date?: string }
): Promise<{ task: { task_id: number; title: string; status: string } }> => {
  const { data: response } = await api.post(`/production-chains/${chain_id}/start`, data);
  return response;
};

// Hoàn thành bước task và chuyển sang bước tiếp theo
export const completeTaskStep = async (task_id: number): Promise<{ nextTask?: { task_id: number; title: string; status: string } }> => {
  const { data } = await api.post(`/production-chains/task/${task_id}/complete`);
  return data;
};

// Xóa chuỗi sản xuất
export const deleteProductionChain = async (chain_id: number): Promise<{ message: string }> => {
  const { data } = await api.delete(`/production-chains/${chain_id}`);
  return data;
};

// Vô hiệu hóa chuỗi sản xuất
export const disableProductionChain = async (chain_id: number): Promise<{ message: string }> => {
  const { data } = await api.patch(`/production-chains/${chain_id}/disable`);
  return data;
};

// Kích hoạt lại chuỗi sản xuất
export const enableProductionChain = async (chain_id: number): Promise<{ message: string }> => {
  const { data } = await api.patch(`/production-chains/${chain_id}/enable`);
  return data;
};

// Cập nhật chuỗi sản xuất
export const updateProductionChain = async (
  chain_id: number,
  data: {
    name: string;
    description?: string;
    steps: Omit<ProductionChainStep, 'step_id' | 'chain_id' | 'estimated_duration'>[];
  }
): Promise<ProductionChain> => {
  const { data: response } = await api.put(`/production-chains/${chain_id}`, data);
  return response.chain;
};

// Thêm phản hồi cho chuỗi sản xuất (Manager only)
export const addFeedback = async (
  chain_id: number,
  feedback: string
): Promise<ProductionChainFeedback> => {
  const { data: response } = await api.post(`/production-chains/${chain_id}/feedback`, { feedback });
  return response.feedback;
};

// Lấy danh sách phản hồi của chuỗi
export const getChainFeedbacks = async (chain_id: number): Promise<ProductionChainFeedback[]> => {
  const { data } = await api.get(`/production-chains/${chain_id}/feedbacks`);
  return data;
};

// Gửi phản hồi mới (Leader only)
export const sendFeedbackMessage = async (
  chain_id: number,
  message: string
): Promise<ProductionChainFeedback> => {
  const { data: response } = await api.post(`/production-chains/${chain_id}/feedback`, { message });
  return response.feedback;
};

// Trả lời phản hồi (Admin only)
export const replyToFeedback = async (
  chain_id: number,
  message: string
): Promise<ProductionChainFeedback> => {
  const { data: response } = await api.post(`/production-chains/${chain_id}/reply`, { message });
  return response.feedback;
};

// KPI APIs
export interface ChainKpi {
  chain_kpi_id: number;
  chain_id: number;
  target_value: number;
  start_date?: string;
  end_date?: string;
  weeks?: KpiWeek[];
  creator?: {
    user_id: number;
    name: string;
  };
  created_at: string;
}

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
}

export interface KpiCompletion {
  kpi_completion_id: number;
  chain_kpi_id: number;
  completion_type: 'week' | 'day';
  week_index?: number;
  date_iso?: string;
  completed_by: number;
  created_at: string;
}

// Lấy danh sách KPI của chuỗi
export const getChainKpis = async (chain_id: number): Promise<ChainKpi[]> => {
  const { data } = await api.get(`/production-chains/${chain_id}/kpis`);
  return data;
};

// Tạo KPI mới
export const createChainKpi = async (
  chain_id: number,
  data: {
    target_value: number;
    start_date?: string;
    end_date?: string;
  }
): Promise<ChainKpi> => {
  const { data: response } = await api.post(`/production-chains/${chain_id}/kpis`, data);
  return response.kpi;
};

// Cập nhật KPI
export const updateChainKpi = async (
  kpi_id: number,
  data: {
    target_value?: number;
  }
): Promise<ChainKpi> => {
  const { data: response } = await api.put(`/production-chains/kpis/${kpi_id}`, data);
  return response.kpi;
};

// Cập nhật KPI tuần
export const updateKpiWeeks = async (
  kpi_id: number,
  weeks: {
    week_index: number;
    target_value: number;
    days: { date: string; target_value: number }[]
  }[]
): Promise<ChainKpi> => {
  const { data: response } = await api.put(`/production-chains/kpis/${kpi_id}/weeks`, { weeks });
  return response.kpi;
};

// Cập nhật KPI ngày
export const updateKpiDays = async (
  kpi_id: number,
  days: { date: string; target_value: number }[]
): Promise<ChainKpi> => {
  const { data: response } = await api.put(`/production-chains/kpis/${kpi_id}/days`, { days });
  return response.kpi;
};

// Xóa KPI
export const deleteChainKpi = async (kpi_id: number): Promise<{ message: string }> => {
  const { data } = await api.delete(`/production-chains/kpis/${kpi_id}`);
  return data;
};

// Toggle week completion
export const toggleWeekCompletion = async (
  kpi_id: number,
  week_index: number
): Promise<{ message: string }> => {
  const { data } = await api.post(`/production-chains/kpis/${kpi_id}/complete-week/${week_index}`);
  return data;
};

// Toggle day completion
export const toggleDayCompletion = async (
  kpi_id: number,
  date_iso: string
): Promise<{ message: string }> => {
  const { data } = await api.post(`/production-chains/kpis/${kpi_id}/complete-day/${date_iso}`);
  return data;
};

// Get KPI completions
export const getKpiCompletions = async (kpi_id: number): Promise<KpiCompletion[]> => {
  const { data } = await api.get(`/production-chains/kpis/${kpi_id}/completions`);
  return data;
};

// Update production chain total KPI
export const updateProductionChainTotalKpi = async (
  chain_id: number,
  total_kpi: number
): Promise<ProductionChain> => {
  const { data } = await api.put(`/production-chains/${chain_id}/total-kpi`, { total_kpi });
  return data.chain;
};