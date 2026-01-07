import { useState, useEffect, useRef } from "react";
import { updateKpiWeeks, getKpiCompletions, updateChainKpi } from "../../../../api/productionChains";
import type { ProductionChain, ChainKpi, KpiCompletion } from "../../../../api/productionChains";
import { useModalToast } from "../../../../hooks/useToast";
import { KpiStatistics } from "./KpiStatistics";
import { WeekCard } from "./WeekCard";
import { KpiEditActions } from "./KpiEditActions";
import type { KpiWeek, KpiDay } from "./types";

interface KpiEditModalProps {
  isOpen: boolean;
  kpi: ChainKpi | null;
  chain: ProductionChain | null;
  onClose: () => void;
  onSuccess?: (updatedKpi?: ChainKpi) => void;
  userRole?: string;
}

// Helper function to safely merge weeks while preserving metadata
function mergeWeeksPreserveMeta(
  currentWeeks: KpiWeek[],
  backendWeeks: KpiWeek[]
): KpiWeek[] {
  return currentWeeks.map(currentWeek => {
    const backendWeek = backendWeeks.find(
      w => w.week_index === currentWeek.week_index
    );

    if (!backendWeek) return currentWeek;

    return {
      ...currentWeek,
      // Preserve all week metadata from current state
      start_date: currentWeek.start_date,
      end_date: currentWeek.end_date,
      working_days: currentWeek.working_days,
      target_value: backendWeek.target_value,
      days: currentWeek.days.map(currentDay => {
        const backendDay = backendWeek.days.find(
          d => d.date === currentDay.date
        );

        return {
          ...currentDay,
          target_value:
            backendDay?.target_value ?? currentDay.target_value
          // ⛔ DO NOT TOUCH:
          // is_completed
          // is_working_day
        };
      })
    };
  });
}

export function KpiEditModal({
  isOpen,
  kpi,
  chain,
  onClose,
  onSuccess,
  userRole
}: KpiEditModalProps) {
  const { showSuccessToast, showErrorToast } = useModalToast();
  const [weeks, setWeeks] = useState<KpiWeek[]>([]);
  const [previewWeeks, setPreviewWeeks] = useState<KpiWeek[]>([]);
  const [originalWeeks, setOriginalWeeks] = useState<KpiWeek[]>([]);
  const [loading, setLoading] = useState(false);
  const [newTotalKpi, setNewTotalKpi] = useState<number>(0);
  const [effectiveTotalKpi, setEffectiveTotalKpi] = useState<number>(0);
  const modalRef = useRef<HTMLDivElement>(null);

  console.log('KpiEditModal userRole:', userRole);

  // Calculate current totals for display
  const currentTotalKpi = weeks.reduce((sum, week) => sum + week.target_value, 0);
  const targetTotalKpi = effectiveTotalKpi;
  const kpiDifference = currentTotalKpi - targetTotalKpi;

  useEffect(() => {
    const loadKpiData = async () => {
      if (kpi && isOpen) {
        try {
          // Load completions to merge with weeks data
          const completions = await getKpiCompletions(kpi.chain_kpi_id);
          
          // Create a map of completed days and weeks for quick lookup
          const completedDays = new Set<string>();
          const completedWeeks = new Set<number>();
          
          completions.forEach((completion: KpiCompletion) => {
            if (completion.completion_type === 'day' && completion.date_iso) {
              completedDays.add(completion.date_iso);
            } else if (completion.completion_type === 'week' && completion.week_index) {
              completedWeeks.add(completion.week_index);
            }
          });

          // Merge completion status into weeks data
          const initialWeeks = (kpi.weeks || []).map(week => ({
            ...week,
            days: week.days.map(day => {
              const dayOfWeek = new Date(day.date).getDay();
              const defaultAttending = ![0, 6].includes(dayOfWeek); // Default attending except Sat/Sun
              const storedAttending = localStorage.getItem(`kpi_attending_${kpi.chain_kpi_id}_${week.week_index}_${day.date}`);
              const userAttending = storedAttending !== null ? storedAttending === 'true' : defaultAttending;
              
              return {
                ...day,
                is_completed: completedDays.has(day.date) || completedWeeks.has(week.week_index),
                user_attending: userAttending
              };
            })
          }));

          console.log('Loaded completions:', { completedDays: Array.from(completedDays), completedWeeks: Array.from(completedWeeks) });
          console.log('Initial weeks after merge:', initialWeeks);

          setWeeks(initialWeeks);
          setPreviewWeeks(JSON.parse(JSON.stringify(initialWeeks)));
          setOriginalWeeks(JSON.parse(JSON.stringify(initialWeeks))); // Deep copy
          const total = kpi.target_value || 0;
          setNewTotalKpi(total);
          setEffectiveTotalKpi(total);
        } catch (error) {
          console.error('Error loading KPI completions:', error);
          // Fallback to original data if completions fail to load
          const initialWeeks = kpi.weeks || [];
          setWeeks(initialWeeks);
          setPreviewWeeks(JSON.parse(JSON.stringify(initialWeeks)));
          setOriginalWeeks(JSON.parse(JSON.stringify(initialWeeks)));
          const total = kpi.target_value || 0;
          setNewTotalKpi(total);
          setEffectiveTotalKpi(total);
        }
      }
    };

    loadKpiData();
  }, [kpi, isOpen]);

  // Handle ESC key and click outside
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(event.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener("keydown", handleKeyDown);
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("keydown", handleKeyDown);
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen, onClose]);

  const validateForm = (): boolean => {
    // Validate weeks total equals overall target (KPI total is now read-only)
    // IMPORTANT: Validation should check 'weeks' (committed data) because that's what we submit.
    // However, the user might see 'previewWeeks' which is valid.
    // If 'previewWeeks' is valid but 'weeks' is invalid, we should probably allow submit?
    // Wait, requirement: "backend only receives manual edits".
    // If I didn't edit anything, I submit 'weeks' (original). If original was valid, fine.
    // If I edited one thing, 'weeks' changes.
    // Validation runs on 'weeks'.
    
    if (weeks.length > 0) {
      const weeksTotal = weeks.reduce((sum: number, week: KpiWeek) => sum + (parseFloat(week.target_value?.toString() || "0") || 0), 0);
      const totalValue = effectiveTotalKpi;
      if (Math.abs(weeksTotal - totalValue) > 0) {
        showErrorToast(`Tổng KPI các tuần (${weeksTotal}) không bằng KPI tổng mới (${totalValue})`);
        return false;
      }

      // Validate days within each week
      for (const week of weeks) {
        if (week.days && week.days.length > 0) {
          const weekTarget = parseFloat(week.target_value?.toString() || "0") || 0;

          // Calculate total KPI from all days in the week (completed + non-completed)
          const allDaysTotal = week.days.reduce((sum: number, day: KpiDay) => sum + (parseFloat(day.target_value?.toString() || "0") || 0), 0);

          // Validate that total of all days equals week target
          if (Math.abs(allDaysTotal - weekTarget) > 0) {
            const completedTotal = week.days
              .filter(day => day.is_completed)
              .reduce((sum: number, day: KpiDay) => sum + (parseFloat(day.target_value?.toString() || "0") || 0), 0);
            const nonCompletedTotal = week.days
              .filter(day => !day.is_completed)
              .reduce((sum: number, day: KpiDay) => sum + (parseFloat(day.target_value?.toString() || "0") || 0), 0);

            showErrorToast(`Tuần ${week.week_index}: Tổng KPI tất cả ngày (${allDaysTotal}) không bằng KPI tuần (${weekTarget}). Đã hoàn thành: ${completedTotal}, Chưa hoàn thành: ${nonCompletedTotal}`);
            return false;
          }
        }
      }
    }

    return true;
  };

  // Check if week can be edited (admin and leader can edit week targets)
  const canEditWeek = (week: KpiWeek): boolean => {
    return (userRole === 'admin' || userRole === 'leader')  && week.days.some(day => day.user_attending && !day.is_completed);
  };

  const handleWeekTargetChange = (weekIndex: number, value: string) => {
    // Allow empty string for better UX, but always store as number
    const newValue = value === '' ? 0 : (isNaN(parseFloat(value)) ? 0 : parseFloat(value));
    
    // Update BOTH weeks and previewWeeks because manual edits are committed
    const updateWeeks = (prevWeeks: KpiWeek[]) => 
      prevWeeks.map(week => {
        if (week.week_index === weekIndex) {
          // Distribute the new target value evenly across attending days in this week
          const attendingDays = week.days.filter(day => day.user_attending && !day.is_completed);
          const baseValue = attendingDays.length > 0 ? Math.floor(newValue / attendingDays.length) : 0;
          const remainder = attendingDays.length > 0 ? newValue % attendingDays.length : 0;
          
          const updatedDays = week.days.map((day) => {
            if (day.user_attending && !day.is_completed) {
              const attendingDayIndex = attendingDays.findIndex(ad => ad.date === day.date);
              const dayValue = baseValue + (attendingDayIndex < remainder ? 1 : 0);
              return { ...day, target_value: dayValue };
            }
            return day;
          });
          
          return {
            ...week,
            target_value: newValue,
            days: updatedDays
          };
        }
        return week;
      });

    setWeeks(updateWeeks);
    setPreviewWeeks(updateWeeks);
  };

  const handleDayTargetChange = (weekIndex: number, date: string, value: string) => {
    const newValue = value === '' ? 0 : (isNaN(parseFloat(value)) ? 0 : parseFloat(value));
    
    // Update BOTH weeks and previewWeeks because manual edits are committed
    const updateWeeks = (prevWeeks: KpiWeek[]) =>
      prevWeeks.map(week => {
        if (week.week_index === weekIndex) {
          const updatedDays = week.days.map(day =>
            day.date === date
              ? { ...day, target_value: newValue }
              : day
          );

          // Recalculate week target_value as sum of all day target_values
          const newWeekTargetValue = updatedDays.reduce((sum, day) => sum + day.target_value, 0);

          return {
            ...week,
            target_value: newWeekTargetValue,
            days: updatedDays
          };
        }
        return week;
      });

    setWeeks(updateWeeks);
    setPreviewWeeks(updateWeeks);
  };

  const handleToggleAttending = (weekIndex: number, date: string) => {
    // Update BOTH weeks and previewWeeks because manual edits are committed
    const updateWeeks = (prevWeeks: KpiWeek[]) =>
      prevWeeks.map(week => {
        if (week.week_index === weekIndex) {
          const updatedDays = week.days.map(day => {
            if (day.date === date) {
              const newAttending = !day.user_attending;
              // Store in localStorage
              localStorage.setItem(`kpi_attending_${kpi?.chain_kpi_id}_${week.week_index}_${day.date}`, newAttending.toString());
              return {
                ...day,
                user_attending: newAttending,
                target_value: newAttending ? day.target_value : 0 // Reset to 0 if not attending
              };
            }
            return day;
          });

          // Recalculate week target_value as sum of all day target_values
          const newWeekTargetValue = updatedDays.reduce((sum, day) => sum + day.target_value, 0);

          return {
            ...week,
            target_value: newWeekTargetValue,
            days: updatedDays
          };
        }
        return week;
      });

    setWeeks(updateWeeks);
    setPreviewWeeks(updateWeeks);
  };

  const handleNewTotalKpiChange = (value: string) => {
    const newValue = value === '' ? 0 : (isNaN(parseFloat(value)) ? 0 : parseFloat(value));
    setNewTotalKpi(newValue);
  };

  const handleSaveNewTotalKpi = async () => {
    if (!kpi || !chain || newTotalKpi <= 0) {
      showErrorToast("Dữ liệu không hợp lệ");
      return;
    }

    setLoading(true);
    try {
      // Update the KPI target_value (this will trigger sync of total_kpi via database triggers)
      await updateChainKpi(kpi.chain_kpi_id, { target_value: newTotalKpi });

      // Update local state
      setEffectiveTotalKpi(newTotalKpi);

      // Reset newTotalKpi to empty for next edit
      setNewTotalKpi(0);

      // Automatically redistribute the KPI to attending days
      distributeKpiEvenly();

      showSuccessToast("Đã cập nhật tổng KPI!");
    } catch (error) {
      console.error("Lỗi cập nhật KPI:", error);
      showErrorToast("Có lỗi xảy ra khi cập nhật KPI");
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateStr: string | undefined) => {
    if (!dateStr) return '';
    return new Date(dateStr).toLocaleDateString('vi-VN');
  };

  const formatDayDetail = (dateStr: string) => {
    const date = new Date(dateStr);
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const dayOfWeek = date.toLocaleDateString('vi-VN', { weekday: 'long' });

    return `${dayOfWeek}, ${day}/${month}`;
  };

  const distributeKpiEvenly = () => {
    const totalKpi = effectiveTotalKpi;
    if (totalKpi <= 0 || !weeks.length) return;

    // Calculate total KPI from completed days (these won't be redistributed)
    let completedKpiTotal = 0;
    let remainingAttendingDays = 0;

    weeks.forEach(week => {
      week.days.forEach(day => {
        if (day.user_attending) {
          if (day.is_completed) {
            completedKpiTotal += day.target_value || 0;
          } else {
            remainingAttendingDays++;
          }
        }
      });
    });

    console.log('Distribute KPI:', { totalKpi, completedKpiTotal, remainingAttendingDays });

    if (remainingAttendingDays === 0) return;

    // Calculate remaining KPI to distribute
    const remainingKpi = totalKpi - completedKpiTotal;
    if (remainingKpi <= 0) return;

    console.log('Remaining KPI to distribute:', remainingKpi);

    // Calculate KPI per remaining attending day (integer division)
    const kpiPerDay = Math.floor(remainingKpi / remainingAttendingDays);
    const remainder = remainingKpi % remainingAttendingDays;

    console.log('KPI per day:', kpiPerDay, 'remainder:', remainder);

    // Distribute KPI to days
    let dayIndex = 0;
    const updatedWeeks = weeks.map(week => {
      const updatedDays = week.days.map(day => {
        if (day.user_attending && !day.is_completed) {
          // Distribute to attending non-completed days
          const extra = dayIndex < remainder ? 1 : 0;
          const dayKpi = kpiPerDay + extra;
          dayIndex++;
          return { ...day, target_value: dayKpi };
        } else {
          // Keep completed days unchanged
          return day;
        }
      });

      // Calculate new week total from all days (completed + updated non-completed)
      const newWeekTotal = updatedDays.reduce((sum, day) => sum + (day.target_value || 0), 0);

      return {
        ...week,
        target_value: newWeekTotal, // Update week total to match sum of all days
        days: updatedDays
      };
    });

    // Update BOTH weeks and previewWeeks to commit the distribution
    setWeeks(updatedWeeks);
    setPreviewWeeks(updatedWeeks);
    showSuccessToast("Đã phân bổ đều KPI vào các ngày đi làm.");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!kpi || !validateForm()) return;

    setLoading(true);
    try {
      // Update weeks if changed
      // Compare 'weeks' (committed) with 'originalWeeks'
      const weeksChanged = weeks.some((week, index) => {
        const originalWeek = originalWeeks[index];
        if (!originalWeek) return true; // New week added

        // Check if week target_value changed
        if (week.target_value !== originalWeek.target_value) return true;

        // Check if any day target_value changed
        if (week.days && originalWeek.days) {
          return week.days.some((day, dayIndex) => {
            const originalDay = originalWeek.days[dayIndex];
            return originalDay && day.target_value !== originalDay.target_value;
          });
        }

        return false;
      });

      let updatedKpi: ChainKpi | undefined;

      if (weeksChanged) {
        const weeksData = weeks.map(week => ({
          week_index: week.week_index,
          target_value: week.target_value || 0,
          start_date: week.start_date,
          end_date: week.end_date,
          days: week.days
            .filter(day => !day.is_completed) // 🔥 STRIP COMPLETED DAYS
            .map(day => ({
              date: day.date,
              target_value: day.target_value || 0
            }))
        }));

        console.log('Submitting weeks data:', weeksData);
        updatedKpi = await updateKpiWeeks(kpi.chain_kpi_id, weeksData);
        console.log('Update KPI weeks response:', updatedKpi);
      }

      showSuccessToast("Cập nhật KPI thành công!");
      onSuccess?.(updatedKpi);
      
      // Update weeks data with response from backend
      // Don't reload completions as backend might incorrectly create completion records
      if (updatedKpi?.weeks) {
        // Use helper function to safely merge while preserving metadata
        const updatedWeeks = mergeWeeksPreserveMeta(weeks, updatedKpi.weeks);

        setWeeks(updatedWeeks);
        setPreviewWeeks(JSON.parse(JSON.stringify(updatedWeeks)));
        setOriginalWeeks(JSON.parse(JSON.stringify(updatedWeeks)));
      }
      
      // Don't close modal automatically - let user continue editing or close manually
      // onClose();
    } catch (error) {
      console.error("Lỗi cập nhật KPI:", error);
      showErrorToast("Có lỗi xảy ra khi cập nhật KPI");
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !chain || !kpi) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm px-4 py-6 animate-in fade-in duration-200">
      <div ref={modalRef} className="w-full max-w-7xl max-h-[95vh] overflow-hidden rounded-2xl bg-white shadow-2xl border border-orange-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-orange-50 via-orange-100 to-orange-200 px-8 py-6 border-b border-orange-200 flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold text-orange-800">Điều chỉnh KPI</h2>
            <p className="text-orange-600 text-sm mt-1">Quản lý mục tiêu KPI chi tiết theo tuần và ngày</p>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-2 text-orange-700 hover:bg-orange-100 hover:text-orange-900 transition-all duration-200"
            aria-label="Đóng"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          <form onSubmit={handleSubmit} className="p-8 space-y-8">
            {/* Header Info & KPI Total */}
            <div className="bg-gradient-to-r from-white to-orange-50 rounded-xl p-6 border border-orange-200">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                    <svg className="w-6 h-6 text-orange-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">{chain.name}</h3>
                    <p className="text-sm text-gray-600">{chain.description}</p>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="flex flex-col items-center gap-2">
                  <button
                    type="button"
                    onClick={distributeKpiEvenly}
                    className="flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white text-sm font-semibold rounded-lg hover:from-orange-600 hover:to-orange-700 focus:outline-none focus:ring-4 focus:ring-orange-100 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                    disabled={!weeks.length}
                    title="Tự động phân bổ KPI cho các ngày đi làm chưa hoàn thành, giữ nguyên KPI của ngày đã hoàn thành"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                    Phân bổ đều
                  </button>
                  <p className="text-xs text-gray-500 text-center max-w-32 leading-tight">
                    Phân bổ KPI cho ngày đi làm chưa hoàn thành, giữ nguyên ngày đã hoàn thành
                  </p>
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Statistics */}
            {previewWeeks.length > 0 && (
              <KpiStatistics
                previewWeeks={previewWeeks}
                effectiveTotalKpi={effectiveTotalKpi}
              />
            )}

            {/* Weeks and Days Table */}
            {previewWeeks && previewWeeks.length > 0 ? (
              <div className="space-y-6">
                <div className="flex items-center gap-3">
                  <h3 className="text-xl font-bold text-orange-800">Chi tiết KPI theo tuần</h3>
                  <div className="flex-1 h-px bg-gradient-to-r from-gray-300 to-transparent"></div>
                </div>

                {previewWeeks.map((week) => (
                  <WeekCard
                    key={week.week_index}
                    week={week}
                    userRole={userRole}
                    canEditWeek={canEditWeek}
                    onWeekTargetChange={handleWeekTargetChange}
                    onToggleAttending={handleToggleAttending}
                    onDayTargetChange={handleDayTargetChange}
                    formatDate={formatDate}
                    formatDayDetail={formatDayDetail}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-12 text-center text-gray-500 bg-gray-50 rounded-xl border-2 border-dashed border-gray-200">
                <svg className="w-16 h-16 mb-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <p className="text-lg font-medium">Chưa có dữ liệu tuần</p>
                <p className="text-sm">Vui lòng kiểm tra lại cấu hình KPI</p>
              </div>
            )}

            {/* Actions */}
            <KpiEditActions
              newTotalKpi={newTotalKpi}
              onNewTotalKpiChange={handleNewTotalKpiChange}
              onSaveNewTotalKpi={handleSaveNewTotalKpi}
              currentTotalKpi={currentTotalKpi}
              effectiveTotalKpi={effectiveTotalKpi}
              kpiDifference={kpiDifference}
              onDistributeEvenly={distributeKpiEvenly}
              weeksLength={weeks.length}
              loading={loading}
              onClose={onClose}
            />
          </form>
        </div>
      </div>
    </div>
  );
}