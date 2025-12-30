import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { getMyTasksToday, getDailyTasks, getDepartmentMembers, createDailyTask, startTask, completeTask, blockTask, deleteTask } from "@/api/dailyTasks";
import type { Task, DepartmentMember } from "@/api/dailyTasks";
import { getProductionChains, getChainKpis, getKpiCompletions } from "@/api/productionChains";
import type { ProductionChain, ChainKpi, KpiCompletion } from "@/api/productionChains";
import { Button } from "@/components/ui/Button";
import { ConfirmModal } from "@/components/ui/ConfirmModal";
import { GitMerge, Users, CheckCircle, GitBranch, Target } from "lucide-react";

const DailyTasks = () => {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [assignedTasks, setAssignedTasks] = useState<Task[]>([]);
  const [departmentMembers, setDepartmentMembers] = useState<DepartmentMember[]>([]);
  const [loading, setLoading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<Task | null>(null);

  // Refs for scrolling
  const assignFormRef = useRef<HTMLDivElement>(null);

  // Assign task form states
  const [selectedMember, setSelectedMember] = useState<DepartmentMember | null>(null);
  const [taskForm, setTaskForm] = useState({
    title: '',
    description: '',
    assigned_to: 0,
    date: new Date().toISOString().split('T')[0],
    priority: 'MEDIUM' as 'LOW' | 'MEDIUM' | 'HIGH'
  });
  const [assignLoading, setAssignLoading] = useState(false);

  // Production chain and KPI states
  const [productionChains, setProductionChains] = useState<ProductionChain[]>([]);
  const [selectedChain, setSelectedChain] = useState<ProductionChain | null>(null);
  const [chainKpis, setChainKpis] = useState<ChainKpi[]>([]);
  const [selectedKpi, setSelectedKpi] = useState<ChainKpi | null>(null);
  const [chainsLoading, setChainsLoading] = useState(false);
  const [kpiCompletions, setKpiCompletions] = useState<KpiCompletion[]>([]);

  // Week navigation states
  const [currentWeekStart, setCurrentWeekStart] = useState<Date>(() => {
    const today = new Date();
    const dayOfWeek = today.getDay(); // 0 = Sunday, 1 = Monday, etc.
    const monday = new Date(today);
    monday.setDate(today.getDate() - dayOfWeek + 1); // Get Monday of current week
    return monday;
  });

  // Get active tab from URL params, default to 'kpi'
  const activeTab = (searchParams.get('tab') as 'kpi' | 'daily') || 'kpi';

  // Function to change tab and update URL
  const setActiveTab = (tab: 'kpi' | 'daily') => {
    setSearchParams({ tab });
  };

  // Week navigation functions
  const getWeekDays = (weekStart: Date) => {
    const days = [];
    for (let i = 0; i < 7; i++) {
      const day = new Date(weekStart);
      day.setDate(weekStart.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const canNavigateWeek = (direction: 'prev' | 'next') => {
    if (!selectedKpi || !selectedKpi.start_date || !selectedKpi.end_date) return true;

    const kpiStart = new Date(selectedKpi.start_date);
    const kpiEnd = new Date(selectedKpi.end_date);

    // Get Monday of KPI start week
    const kpiStartMonday = new Date(kpiStart);
    const startDayOfWeek = kpiStart.getDay();
    kpiStartMonday.setDate(kpiStart.getDate() - startDayOfWeek + 1);

    // Get Monday of KPI end week
    const kpiEndMonday = new Date(kpiEnd);
    const endDayOfWeek = kpiEnd.getDay();
    kpiEndMonday.setDate(kpiEnd.getDate() - endDayOfWeek + 1);

    if (direction === 'prev') {
      const prevWeek = new Date(currentWeekStart);
      prevWeek.setDate(currentWeekStart.getDate() - 7);
      return prevWeek >= kpiStartMonday;
    } else {
      const nextWeek = new Date(currentWeekStart);
      nextWeek.setDate(currentWeekStart.getDate() + 7);
      return nextWeek <= kpiEndMonday;
    }
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    if (!selectedKpi) return;

    setCurrentWeekStart(prev => {
      const newDate = new Date(prev);
      newDate.setDate(prev.getDate() + (direction === 'next' ? 7 : -7));

      // Check bounds based on KPI start_date and end_date
      if (selectedKpi.start_date && selectedKpi.end_date) {
        const kpiStart = new Date(selectedKpi.start_date);
        const kpiEnd = new Date(selectedKpi.end_date);

        // Get Monday of KPI start week
        const kpiStartMonday = new Date(kpiStart);
        const startDayOfWeek = kpiStart.getDay();
        kpiStartMonday.setDate(kpiStart.getDate() - startDayOfWeek + 1);

        // Get Monday of KPI end week
        const kpiEndMonday = new Date(kpiEnd);
        const endDayOfWeek = kpiEnd.getDay();
        kpiEndMonday.setDate(kpiEnd.getDate() - endDayOfWeek + 1);

        // Don't go before KPI start week or after KPI end week
        if (newDate < kpiStartMonday) {
          return kpiStartMonday;
        }
        if (newDate > kpiEndMonday) {
          return kpiEndMonday;
        }
      }

      return newDate;
    });
  };

  const getKpiPerDay = (kpi: ChainKpi, date: Date) => {
    if (!kpi.weeks || !Array.isArray(kpi.weeks)) {
      // Fallback: chia đều cho 7 ngày
      const totalValue = typeof kpi.target_value === 'number' ? kpi.target_value : parseFloat(kpi.target_value) || 0;
      return Math.round(totalValue / 7 * 100) / 100;
    }

    // Tìm target_value cho ngày cụ thể trong weeks data
    const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD format

    for (const week of kpi.weeks) {
      if (week.days && Array.isArray(week.days)) {
        const dayData = week.days.find(day => day.date === dateStr);
        if (dayData && dayData.target_value !== undefined) {
          return dayData.target_value;
        }
      }
    }

    // Nếu không tìm thấy, trả về 0
    return 0;
  };

  const isDayCompleted = (date: Date) => {
    if (!selectedKpi || !kpiCompletions.length) return false;

    const dateStr = date.toISOString().split('T')[0];
    return kpiCompletions.some(completion =>
      completion.completion_type === 'day' &&
      completion.date_iso === dateStr &&
      completion.chain_kpi_id === selectedKpi.chain_kpi_id
    );
  };

  useEffect(() => {
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  // Update page title based on active tab
  useEffect(() => {
    const tabTitles = {
      kpi: 'Giao nhiệm vụ - Nhiệm vụ hằng ngày',
      daily: 'Nhiệm vụ hằng ngày'
    };
    document.title = tabTitles[activeTab];
  }, [activeTab]);

  // Load department members when KPI is selected
  useEffect(() => {
    const loadDepartmentMembers = async () => {
      if (!selectedKpi || !user) return;

      try {
        const membersRes = await getDepartmentMembers();
        const members = membersRes.data.members || [];

        // Sort members: department heads first, then others
        const sortedMembers = members.sort((a: DepartmentMember, b: DepartmentMember) => {
          const aIsHead = isDepartmentHead(a.department_position);
          const bIsHead = isDepartmentHead(b.department_position);

          if (aIsHead && !bIsHead) return -1;
          if (!aIsHead && bIsHead) return 1;
          return 0; // Keep original order for same type
        });

        // Calculate KPI count for each member (tasks assigned to them with the selected KPI)
        const membersWithKpiCount = sortedMembers.map((member: DepartmentMember) => ({
          ...member,
          kpiCount: assignedTasks.filter(task =>
            task.assigned_to === member.user_id &&
            task.related_kpi_task_id === selectedKpi.chain_kpi_id
          ).length
        }));

        setDepartmentMembers(membersWithKpiCount);
      } catch (error) {
        console.error('Error loading department members:', error);
      }
    };

    loadDepartmentMembers();
  }, [selectedKpi, assignedTasks, user]);

  // Helper function to check if user is department head
  const isDepartmentHead = (position?: string) => {
    if (!position) return false;

    const departmentHeadKeywords = [
      'truong ban',
      'truong phong',
      'truong bo phan',
      'truong nhom',
      'nhom truong',
      'head',
      'manager',
      'director'
    ];

    const normalized = position
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();

    return departmentHeadKeywords.some(keyword => normalized.includes(keyword));
  };

  const loadData = async () => {
    if (!user) return;

    setLoading(true);
    try {
      // Load today's tasks for current user
      const myTasksRes = await getMyTasksToday();
      setMyTasks(myTasksRes.data.tasks || []);

      // Load tasks for management if leader/admin
      if (user.role === 'admin' || user.role === 'leader') {
        const assignedTasksRes = await getDailyTasks();
        setAssignedTasks(assignedTasksRes.data.tasks || []);

        // Load production chains that department participates in
        await loadProductionChains();
      }
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadProductionChains = async () => {
    if (!user) return;

    setChainsLoading(true);
    try {
      const chains = await getProductionChains();

      // Admin can see all chains, leaders can see chains their department participates in
      let filteredChains = chains;
      if (user.role !== 'admin') {
        filteredChains = chains.filter(chain =>
          chain.steps?.some(step => step.department_id === user.department_id)
        );
      }

      setProductionChains(filteredChains);
    } catch (error) {
      console.error('Error loading production chains:', error);
    } finally {
      setChainsLoading(false);
    }
  };

  const handleChainSelect = async (chain: ProductionChain) => {
    setSelectedChain(chain);
    setSelectedKpi(null); // Reset selected KPI when changing chain

    try {
      const kpis = await getChainKpis(chain.chain_id!);
      // Sort KPIs by start_date from oldest to newest (left to right = past to future)
      // KPIs without start_date will be placed at the end
      const sortedKpis = kpis.sort((a, b) => {
        const dateA = a.start_date ? new Date(a.start_date).getTime() : 0;
        const dateB = b.start_date ? new Date(b.start_date).getTime() : 0;

        // If both have dates, sort by date (oldest first)
        if (dateA && dateB) {
          return dateA - dateB;
        }

        // If only one has date, prioritize the one with date
        if (dateA && !dateB) return -1;
        if (!dateA && dateB) return 1;

        // If neither has date, maintain original order
        return 0;
      });
      setChainKpis(sortedKpis);
    } catch (error) {
      console.error('Error loading chain KPIs:', error);
    }
  };

  const handleKpiSelect = async (kpi: ChainKpi) => {
    setSelectedKpi(kpi);
    setSelectedMember(null); // Reset member selection
    setTaskForm(prev => ({ ...prev, assigned_to: 0 })); // Reset assigned_to

    // Set current week to the week containing KPI start_date
    if (kpi.start_date) {
      const startDate = new Date(kpi.start_date);
      const dayOfWeek = startDate.getDay(); // 0 = Sunday, 1 = Monday, etc.
      const monday = new Date(startDate);
      monday.setDate(startDate.getDate() - dayOfWeek + 1); // Get Monday of the week
      setCurrentWeekStart(monday);
    }

    try {
      // Load KPI completions data
      const completions = await getKpiCompletions(kpi.chain_kpi_id!);
      setKpiCompletions(completions);
    } catch (error) {
      console.error('Error loading KPI completions:', error);
      setKpiCompletions([]); // Set empty array on error
    }
  };

  const handleAssignTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskForm.title || !taskForm.assigned_to || !user?.department_id) return;

    setAssignLoading(true);
    try {
      const taskData = {
        ...taskForm,
        department_id: user.department_id,
        related_kpi_task_id: selectedKpi?.chain_kpi_id
      };

      await createDailyTask(taskData);

      // Reset form
      setTaskForm({
        title: '',
        description: '',
        assigned_to: 0,
        date: new Date().toISOString().split('T')[0],
        priority: 'MEDIUM'
      });
      setSelectedMember(null);
      setSelectedChain(null);
      setSelectedKpi(null);
      setChainKpis([]);

      await loadData();
    } catch (error) {
      console.error('Error creating task:', error);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleMemberSelect = (member: DepartmentMember) => {
    setSelectedMember(member);
    setTaskForm(prev => ({ ...prev, assigned_to: member.user_id }));
  };

  // AssignTaskForm component
  const AssignTaskForm = () => (
    <div className="space-y-6">
      {/* Production Chain Selection */}
      <div>
        <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
          <GitBranch className="w-4 h-4 mr-2 text-pink-600" />
          Chọn chuỗi sản xuất ({productionChains.length})
        </h4>
        {chainsLoading ? (
          <div className="text-center py-4 text-gray-500">Đang tải...</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
            {productionChains.map((chain) => (
              <div
                key={chain.chain_id}
                onClick={() => handleChainSelect(chain)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedChain?.chain_id === chain.chain_id
                    ? 'border-pink-300 bg-pink-50 shadow-sm'
                    : 'border-gray-200 hover:border-pink-200 hover:bg-pink-25'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-pink-600">
                      {chain.name.charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 truncate">{chain.name}</div>
                    <div className="text-sm text-gray-500 truncate">
                      {chain.steps?.length || 0} bước • {chain.status === 'active' ? 'Đang hoạt động' : 'Tạm dừng'}
                    </div>
                  </div>
                  {selectedChain?.chain_id === chain.chain_id && (
                    <CheckCircle className="w-5 h-5 text-pink-600 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* KPI Selection */}
      {selectedChain && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
            <Target className="w-4 h-4 mr-2 text-pink-600" />
            Chọn KPI trong chuỗi ({chainKpis.length})
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 max-h-40 overflow-y-auto">
            {chainKpis.map((kpi) => (
              <div
                key={kpi.chain_kpi_id}
                onClick={() => handleKpiSelect(kpi)}
                className={`p-3 rounded-lg border cursor-pointer transition-all ${
                  selectedKpi?.chain_kpi_id === kpi.chain_kpi_id
                    ? 'border-pink-300 bg-pink-50 shadow-sm'
                    : 'border-gray-200 hover:border-pink-200 hover:bg-pink-25'
                }`}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-pink-100 rounded-full flex items-center justify-center">
                    <span className="text-sm font-medium text-pink-600">
                      KPI
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900">
                      Mục tiêu: {kpi.target_value}
                    </div>
                    <div className="text-sm text-gray-500">
                      {kpi.start_date ? new Date(kpi.start_date).toLocaleDateString('vi-VN') : 'Chưa bắt đầu'} - {kpi.end_date ? new Date(kpi.end_date).toLocaleDateString('vi-VN') : 'Chưa kết thúc'}
                    </div>
                  </div>
                  {selectedKpi?.chain_kpi_id === kpi.chain_kpi_id && (
                    <CheckCircle className="w-5 h-5 text-pink-600 flex-shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Weekly KPI View - Only show after KPI is selected */}
      {selectedKpi && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
            <Target className="w-4 h-4 mr-2 text-pink-600" />
            KPI theo ngày trong tuần
          </h4>

          {/* Week Navigation */}
          <div className="flex items-center justify-between mb-4">
            <button
              onClick={() => navigateWeek('prev')}
              disabled={!canNavigateWeek('prev')}
              className={`p-2 rounded-lg border transition-colors ${
                canNavigateWeek('prev')
                  ? 'border-gray-200 hover:border-pink-300 hover:bg-pink-50 cursor-pointer'
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
              }`}
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>

            <div className="text-sm font-medium text-gray-700">
              Tuần: {currentWeekStart.toLocaleDateString('vi-VN')} - {new Date(currentWeekStart.getTime() + 6 * 24 * 60 * 60 * 1000).toLocaleDateString('vi-VN')}
            </div>

            <button
              onClick={() => navigateWeek('next')}
              disabled={!canNavigateWeek('next')}
              className={`p-2 rounded-lg border transition-colors ${
                canNavigateWeek('next')
                  ? 'border-gray-200 hover:border-pink-300 hover:bg-pink-50 cursor-pointer'
                  : 'border-gray-100 bg-gray-50 cursor-not-allowed opacity-50'
              }`}
            >
              <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>

          {/* Daily KPI Grid */}
          <div className="grid grid-cols-7 gap-2">
            {getWeekDays(currentWeekStart).map((day, index) => {
              const dayNames = ['CN', 'T2', 'T3', 'T4', 'T5', 'T6', 'T7'];
              const kpiValue = getKpiPerDay(selectedKpi, day);
              const isToday = day.toDateString() === new Date().toDateString();
              const completed = isDayCompleted(day);

              return (
                <div
                  key={index}
                  className={`p-3 rounded-lg border text-center relative ${
                    completed
                      ? 'border-green-300 bg-green-50'
                      : isToday
                      ? 'border-pink-300 bg-pink-50'
                      : 'border-gray-200 bg-white'
                  }`}
                >
                  {completed && (
                    <div className="absolute -top-1 -right-1">
                      <CheckCircle className="w-4 h-4 text-green-600 bg-white rounded-full" />
                    </div>
                  )}
                  <div className="text-xs font-medium text-gray-500 mb-1">
                    {dayNames[index]}
                  </div>
                  <div className="text-xs text-gray-400 mb-2">
                    {day.getDate()}/{day.getMonth() + 1}
                  </div>
                  <div className={`text-sm font-semibold ${
                    completed
                      ? 'text-green-600'
                      : isToday
                      ? 'text-pink-600'
                      : 'text-gray-900'
                  }`}>
                    {kpiValue}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">
                    đơn vị/ngày
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Department Members Selection - Only show after KPI is selected */}
      {selectedKpi && (
        <div>
          <h4 className="text-md font-medium text-gray-900 mb-3 flex items-center">
            <Users className="w-4 h-4 mr-2 text-pink-600" />
            Chọn thành viên ({departmentMembers.length})
          </h4>
          <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 max-h-40 overflow-y-auto">
            {departmentMembers.map((member) => (
            <div
              key={member.user_id}
              onClick={() => handleMemberSelect(member)}
              className={`p-3 rounded-lg border cursor-pointer transition-all ${
                selectedMember?.user_id === member.user_id
                  ? 'border-pink-300 bg-pink-50 shadow-sm'
                  : 'border-gray-200 hover:border-pink-200 hover:bg-pink-25'
              }`}
            >
              <div className="flex items-center space-x-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="font-medium text-gray-900 text-pink-600 truncate">{member.name}</div>
                  </div>
                  <div className="text-sm text-gray-500 truncate">
                    {member.department_position || member.position}
                  </div>
                </div>
                {selectedMember?.user_id === member.user_id && (
                  <CheckCircle className="w-5 h-5 text-pink-600 flex-shrink-0" />
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
      )}

      {/* Task Form - Only show after member is selected */}
      {selectedMember && (
        <form onSubmit={handleAssignTask} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Số lượng KPI <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
              placeholder="Nhập tiêu đề nhiệm vụ..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tiêu đề nhiệm vụ <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              required
              value={taskForm.title}
              onChange={(e) => setTaskForm(prev => ({ ...prev, title: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
              placeholder="Nhập tiêu đề nhiệm vụ..."
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Độ ưu tiên <span className="text-red-500">*</span>
          </label>
          <select
            value={taskForm.priority}
            onChange={(e) => setTaskForm(prev => ({ ...prev, priority: e.target.value as 'LOW' | 'MEDIUM' | 'HIGH' }))}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
          >
            <option value="LOW">Thấp</option>
            <option value="MEDIUM">Trung bình</option>
            <option value="HIGH">Cao</option>
          </select>
        </div>
        <div>
          <label className="w-full block text-sm font-medium text-gray-700 mb-2">
            Mô tả chi tiết
          </label>
          <textarea
            value={taskForm.description}
            onChange={(e) => setTaskForm(prev => ({ ...prev, description: e.target.value }))}
            rows={3}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-pink-500 focus:border-pink-500"
            placeholder="Mô tả chi tiết về nhiệm vụ..."
          />
        </div>

        {/* Preview */}
        {taskForm.title && (
          <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
            <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
              <GitBranch className="w-4 h-4 mr-2" />
              Preview nhiệm vụ
            </h5>
            <div className="bg-white rounded border p-3">
              <div className="flex items-center space-x-2 mb-2">
                <span className="font-medium text-gray-900">{taskForm.title}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                  taskForm.priority === 'HIGH' ? 'bg-red-100 text-red-800' :
                  taskForm.priority === 'MEDIUM' ? 'bg-yellow-100 text-yellow-800' :
                  'bg-green-100 text-green-800'
                }`}>
                  {taskForm.priority === 'HIGH' ? 'Cao' :
                   taskForm.priority === 'MEDIUM' ? 'Trung bình' : 'Thấp'}
                </span>
              </div>
              {taskForm.description && (
                <p className="text-sm text-gray-700 mb-2">{taskForm.description}</p>
              )}
              <div className="space-y-1 text-sm text-gray-600">
                <div>Giao cho: {selectedMember?.name || 'Chưa chọn'}</div>
                <div>Ngày: {new Date(taskForm.date).toLocaleDateString('vi-VN')}</div>
                {selectedChain && (
                  <div>Chuỗi: {selectedChain.name}</div>
                )}
                {selectedKpi && (
                  <div>KPI: Mục tiêu {selectedKpi.target_value}</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="flex justify-end">
          <Button
            type="submit"
            disabled={assignLoading || !taskForm.title || !selectedMember}
            className="bg-pink-600 hover:bg-pink-700 text-white"
          >
            {assignLoading ? 'Đang giao...' : 'Giao nhiệm vụ'}
          </Button>
        </div>
      </form>
      )}
    </div>
  );

  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    try {
      await deleteTask(taskToDelete.task_id);
      setShowDeleteModal(false);
      setTaskToDelete(null);
      await loadData();
    } catch (error) {
      console.error('Error deleting task:', error);
    }
  };

  const handleStartTask = async (taskId: number) => {
    try {
      await startTask(taskId);
      await loadData();
    } catch (error) {
      console.error('Error starting task:', error);
    }
  };

  const handleCompleteTask = async (taskId: number) => {
    try {
      await completeTask(taskId);
      await loadData();
    } catch (error) {
      console.error('Error completing task:', error);
    }
  };

  const handleBlockTask = async (taskId: number) => {
    try {
      await blockTask(taskId);
      await loadData();
    } catch (error) {
      console.error('Error blocking task:', error);
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'COMPLETED': return 'bg-green-100 text-green-800';
      case 'DOING': return 'bg-blue-100 text-blue-800';
      case 'WAITING_CONFIRM': return 'bg-purple-100 text-purple-800';
      case 'PENDING': return 'bg-yellow-100 text-yellow-800';
      case 'BLOCKED': return 'bg-red-100 text-red-800';
      case 'CANCELLED': return 'bg-gray-100 text-gray-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'HIGH': return 'bg-red-100 text-red-800';
      case 'MEDIUM': return 'bg-orange-100 text-orange-800';
      case 'LOW': return 'bg-green-100 text-green-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const canManageTasks = user?.role === 'admin' || user?.role === 'leader';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Nhiệm vụ hằng ngày</h1>
          {user?.department && (
            <p className="text-sm text-gray-600 mt-1">Phòng ban: {user.department}</p>
          )}
        </div>
        {canManageTasks && (
          <Button onClick={() => setActiveTab('kpi')}>
            Giao nhiệm vụ
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {canManageTasks && (
            <button
              onClick={() => setActiveTab('kpi')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'kpi'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Nhiệm vụ KPI
            </button>
          )}
          <button
            onClick={() => setActiveTab('daily')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'daily'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Nhiệm vụ hằng ngày
          </button>
        </nav>
      </div>

      {/* KPI Summary for leaders/admins */}
      {activeTab === 'kpi' && canManageTasks && (
        <div className="space-y-6">
          {/* Assign Task Section */}
          <div ref={assignFormRef} className="bg-white shadow rounded-lg">
            <div className="border-b border-gray-200 px-6 py-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-pink-100 rounded-full flex items-center justify-center">
                  <GitMerge className="w-5 h-5 text-pink-600" />
                </div>
                <div>
                  <h2 className="text-xl font-semibold text-gray-900">Giao nhiệm vụ mới</h2>
                  <p className="text-sm text-gray-600">Tạo và giao nhiệm vụ cho thành viên trong phòng ban</p>
                </div>
              </div>
            </div>

            <div className="p-6">
              <AssignTaskForm />
            </div>
          </div>
        </div>
      )}

      {/* Tasks List */}
      {activeTab === 'daily' && (
        <div className="bg-white shadow rounded-lg">
          <div className="px-4 py-5 sm:p-6">
            <h3 className="text-lg font-medium text-gray-900 mb-4">
              Nhiệm vụ của tôi
            </h3>

            {loading ? (
              <div className="text-center py-4">Đang tải...</div>
            ) : (
              <div className="space-y-4">
                {(activeTab === 'daily' ? myTasks : assignedTasks).map((task) => (
                  <div key={task.task_id} className="border border-gray-200 rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="text-sm font-medium text-gray-900">{task.title}</h4>
                          <span className={`px-2 py-1 rounded-full text-xs ${getPriorityColor(task.priority)}`}>
                            {task.priority}
                          </span>
                          <span className={`px-2 py-1 rounded-full text-xs ${getStatusColor(task.status)}`}>
                            {task.status}
                          </span>
                        </div>

                        {task.description && (
                          <p className="text-sm text-gray-600 mb-2">{task.description}</p>
                        )}

                        <div className="flex items-center space-x-4 text-xs text-gray-500">
                          {task.assigner && (
                            <span>Giao bởi: {task.assigner.name}</span>
                          )}
                          {task.date && (
                            <span>Ngày: {new Date(task.date).toLocaleDateString('vi-VN')}</span>
                          )}
                          {task.relatedStep && (
                            <span>Step: {task.relatedStep.name}</span>
                          )}
                          {task.relatedKpiTask && (
                            <span>KPI: {task.relatedKpiTask.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center space-x-2 ml-4">
                        {task.status === 'PENDING' && (
                          <Button
                            onClick={() => handleStartTask(task.task_id)}
                            size="sm"
                            variant="outline"
                          >
                            Bắt đầu
                          </Button>
                        )}

                        {task.status === 'DOING' && (
                          <Button
                            onClick={() => handleCompleteTask(task.task_id)}
                            size="sm"
                            variant="outline"
                          >
                            Hoàn thành
                          </Button>
                        )}

                        {(task.status === 'DOING' || task.status === 'PENDING') && (
                          <Button
                            onClick={() => handleBlockTask(task.task_id)}
                            size="sm"
                            variant="outline"
                          >
                            Chặn
                          </Button>
                        )}

                        {(task.assigned_by === user?.user_id || user?.role === 'admin') && (
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => {
                              setTaskToDelete(task);
                              setShowDeleteModal(true);
                            }}
                          >
                            Xóa
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {(activeTab === 'daily' ? myTasks : assignedTasks).length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Chưa có nhiệm vụ nào
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      <ConfirmModal
        isOpen={showDeleteModal}
        title="Xóa nhiệm vụ"
        message={`Bạn có chắc muốn xóa nhiệm vụ "${taskToDelete?.title}"?`}
        onConfirm={handleDeleteTask}
        onCancel={() => {
          setShowDeleteModal(false);
          setTaskToDelete(null);
        }}
      />

    </div>
  );
};

export default DailyTasks;