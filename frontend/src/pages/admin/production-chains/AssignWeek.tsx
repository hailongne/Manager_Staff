import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { getCurrentUser, getUsers } from '../../../api/users';
import type { User } from '../../../api/users';
import { getProductionChains, assignWeek, getChainKpis, getAssignmentsForKpiWeek } from '../../../api/productionChains';
import type { ProductionChain, ChainKpi, ProductionChainStep } from '../../../api/productionChains';
import { useToast } from '../../../hooks/useToast';

interface StepAssign {
  step_id: number;
  step_title: string;
  id: string;
  assigned_to?: number | null;
  day_assignments?: Record<string, number>;
  day_titles?: Record<string, string[]>;
  handed_over?: boolean;
}

export default function AssignWeek() {
  const params = useParams();
  const navigate = useNavigate();
  const chainId = params.chainId ? Number(params.chainId) : undefined;
  const kpiId = params.kpiId ? Number(params.kpiId) : undefined;
  const weekIndex = params.weekIndex ? Number(params.weekIndex) : undefined;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [chain, setChain] = useState<ProductionChain | null>(null);
  const [chains, setChains] = useState<ProductionChain[]>([]);
  const [kpis, setKpis] = useState<ChainKpi[]>([]);
  const [selectedChainId, setSelectedChainId] = useState<number | null>(chainId ?? null);
  const [selectedKpiId, setSelectedKpiId] = useState<number | null>(kpiId ?? null);
  const [selectedWeekIndex, setSelectedWeekIndex] = useState<number | null>(weekIndex ?? null);
  const [selectedDepartment, setSelectedDepartment] = useState<number | null>(null);
  const [stepAssigns, setStepAssigns] = useState<StepAssign[]>([]);
  const [assignedByDate, setAssignedByDate] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showErrorToast, showSuccessToast } = useToast();

  useEffect(() => {
    (async () => {
      setLoading(true);
      try {
        const [cu, us] = await Promise.all([getCurrentUser(), getUsers()]);
        setCurrentUser(cu);
        setUsers(us);

        const allChains = await getProductionChains();
        setChains(allChains);
        if (selectedChainId) {
          const found = allChains.find(c => c.chain_id === selectedChainId);
          if (found) {
            setChain(found);
            const steps = found.steps || [];
            const initial = steps.map((s, idx) => ({ id: `${s.step_id ?? s.step_order ?? 0}-${idx}`, step_id: s.step_id ?? s.step_order ?? 0, step_title: s.title, assigned_to: null, handed_over: false }));
            setStepAssigns(initial);
            const deptIds = Array.from(new Set(steps.map(s => s.department_id)));
            if (cu.role === 'leader') {
              setSelectedDepartment(cu.department_id || null);
            } else if (deptIds.length > 0) {
              setSelectedDepartment(deptIds[0]);
            }
            try {
              const fetchedKpis = await getChainKpis(found.chain_id!);
              setKpis(fetchedKpis);
            } catch (e) {
              console.error('Failed to fetch KPIs for chain', e);
            }
          }
        } else {
          if (cu.role === 'leader') setSelectedDepartment(cu.department_id || null);
        }
      } catch (err) {
        console.error(err);
        showErrorToast('Không thể tải dữ liệu.');
      } finally {
        setLoading(false);
      }
    })();
  }, [chainId, selectedChainId, showErrorToast]);

  // Fetch existing assignments for selected KPI/week and compute totals per date
  useEffect(() => {
    (async () => {
      const kpiIdSelected = selectedKpiId ?? kpiId;
      const wk = (selectedWeekIndex ?? weekIndex) as number | null;
      if (!kpiIdSelected || wk === undefined || wk === null) {
        setAssignedByDate({});
        return;
      }

      try {
        const resp = await getAssignmentsForKpiWeek(kpiIdSelected, wk);
        // resp is expected to be an array of assignment records
        const map: Record<string, number> = {};
        if (Array.isArray(resp)) {
          type AssignmentResp = { day_assignments?: Record<string, number> };
          (resp as AssignmentResp[]).forEach((r) => {
            const da = r.day_assignments || {};
            Object.keys(da).forEach(date => {
              const v = Number(da[date] || 0);
              map[date] = (map[date] || 0) + v;
            });
          });
        }
        setAssignedByDate(map);
      } catch (err) {
        console.error('Failed to load assignments for kpi/week', err);
        setAssignedByDate({});
      }
    })();
  }, [selectedKpiId, selectedWeekIndex, kpiId, weekIndex]);

  

  const employeesForDept = (deptId: number | null) => users.filter(u => u.department_id === deptId);

  const currentKpi = kpis.find(k => k.chain_kpi_id === (kpiId ?? selectedKpiId)) ?? null;

  // NOTE: intentionally not re-loading previous assignments here to avoid
  // re-applying old data and causing assignment conflicts.

  const handleAssignChange = (assignId: string, userId: number | undefined) => {
    setStepAssigns(prev => prev.map(s => s.id === assignId ? { ...s, assigned_to: userId ?? null } : s));
  };

  const handleDayChange = (assignId: string, dateIso: string, value: number) => {
    // Clamp by server-authoritative remaining per-day KPI
    const kpiSelectedId = selectedKpiId ?? kpiId;
    const wk = (selectedWeekIndex ?? weekIndex) as number | null;
    let clampedValue = value;
    if (kpiSelectedId && wk !== undefined && wk !== null) {
      const weekObj = (currentKpi?.weeks || []).find(w => w.week_index === wk);
      const dayObj = weekObj?.days?.find(d => d.date === dateIso);
      const dayTarget = dayObj ? Number(dayObj.target_value || 0) : 0;
      const assigned = assignedByDate[dateIso] || 0;
      const remainingDayKpi = Math.max(0, dayTarget - assigned);
      clampedValue = Math.min(Math.max(value, 0), remainingDayKpi);
    }

    setStepAssigns(prev => prev.map(s => {
      if (s.id !== assignId) return s;
      const next = { ...s };
      next.day_assignments = { ...(next.day_assignments || {}) };
      next.day_assignments[dateIso] = clampedValue;
      // adjust titles array length to match count
      const prevTitles = (next.day_titles && next.day_titles[dateIso]) || [];
      if (!next.day_titles) next.day_titles = {};
      if (clampedValue <= 0) {
        delete next.day_titles[dateIso];
      } else {
        const arr = prevTitles.slice(0, clampedValue);
        while (arr.length < clampedValue) arr.push('');
        next.day_titles[dateIso] = arr;
      }
      return next;
    }));
  };

  const handleDayTitleChange = (assignId: string, dateIso: string, slotIndex: number, title: string) => {
    setStepAssigns(prev => prev.map(s => {
      if (s.id !== assignId) return s;
      const next = { ...s };
      if (!next.day_titles) next.day_titles = {};
      const arr = (next.day_titles[dateIso] || []).slice();
      while (arr.length <= slotIndex) arr.push('');
      arr[slotIndex] = title;
      next.day_titles[dateIso] = arr;
      return next;
    }));
  };

  const addAssignee = (step: ProductionChainStep) => {
    const newAssign: StepAssign = {
      id: `${step.step_id ?? step.step_order}-${Date.now()}-${Math.random().toString(36).slice(2,8)}`,
      step_id: step.step_id ?? step.step_order ?? 0,
      step_title: step.title,
      assigned_to: null,
      day_assignments: {},
      day_titles: {},
      handed_over: false
    };
    setStepAssigns(prev => {
      const copy = prev.slice();
      // insert after last entry for this step
      const lastIndex = copy.map(x => x.step_id).lastIndexOf(newAssign.step_id);
      if (lastIndex >= 0) copy.splice(lastIndex + 1, 0, newAssign);
      else copy.push(newAssign);
      return copy;
    });
  };

  const removeAssignee = (assignId: string) => {
    setStepAssigns(prev => prev.filter(s => s.id !== assignId));
  };

  

  const handleSubmit = async () => {
    const chosenWeek = (selectedWeekIndex ?? weekIndex);
    if (!currentKpi || chosenWeek === undefined || chosenWeek === null) {
      showErrorToast('Không tìm thấy KPI hoặc tuần thực hiện. Vui lòng chọn một KPI có ngày bắt đầu/kết thúc và một tuần khả dụng, hoặc tạo KPI mới.');
      return;
    }
    setSubmitting(true);
    try {
      const assignments = stepAssigns
        .filter(s => s.assigned_to)
          .map(s => ({ step_id: s.step_id, assigned_to: s.assigned_to!, day_assignments: s.day_assignments || {}, day_titles: s.day_titles || {} }));

      if (assignments.length === 0) {
        showErrorToast('Chưa chọn nhân viên cho bước nào.');
        return;
      }

      const res = await assignWeek(currentKpi.chain_kpi_id, chosenWeek, assignments);
      // merge returned assignments into local state so UI reflects persisted data
      if (res && Array.isArray((res as { assignments?: unknown }).assignments)) {
        type SavedAssignment = { step_id?: number; assigned_to?: number | null; day_assignments?: Record<string, number>; day_titles?: Record<string, string[]> };
        const saved = (res as { assignments?: unknown }).assignments as SavedAssignment[];
        setStepAssigns(prev => prev.map(s => {
          const found = saved.find(x => x.step_id === s.step_id);
          if (!found) return s;
          return {
            ...s,
            assigned_to: found.assigned_to ?? s.assigned_to,
            day_assignments: found.day_assignments ?? s.day_assignments,
            day_titles: found.day_titles ?? s.day_titles
          };
        }));

        // compute remaining totals using saved assignments (authoritative)
        try {
          type WeekLike = { week_index: number; days?: { date: string; target_value?: number }[] };
          const wk = chosenWeek as number;
          const weekObj = (currentKpi?.weeks || []).find((w: WeekLike) => w.week_index === wk) as WeekLike | undefined;
          const kpiStart = currentKpi && currentKpi.start_date ? new Date(currentKpi.start_date) : null;
          const kpiEnd = currentKpi && currentKpi.end_date ? new Date(currentKpi.end_date) : null;
          const displayDays = (weekObj?.days || []).filter((d) => {
            const dt = new Date(d.date);
            if (kpiStart && dt < kpiStart) return false;
            if (kpiEnd && dt > kpiEnd) return false;
            return true;
          });

          const dayAssignedTotalsAll: Record<string, number> = {};
          displayDays.forEach((d) => {
            dayAssignedTotalsAll[d.date] = saved.reduce((acc, sa) => acc + ((sa.day_assignments && sa.day_assignments[d.date]) || 0), 0);
          });

          const weekTotal = displayDays.reduce((a: number, dd) => a + Number(dd.target_value || 0), 0);
          const weekAssignedAll = Object.values(dayAssignedTotalsAll).reduce((a, b) => a + (b || 0), 0);
          const weekRemaining = Math.max(0, weekTotal - weekAssignedAll);

          const fmt = (iso: string) => {
            const d = new Date(iso);
            return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
          };

          const perDayMsgs = displayDays.map((d) => `${fmt(d.date)}: ${Math.max(0, Number(d.target_value || 0) - (dayAssignedTotalsAll[d.date] || 0))}`);

          showSuccessToast(`Giao KPI tuần thành công. Còn lại tuần: ${weekRemaining} KPI. Theo ngày: ${perDayMsgs.join(' · ')}`);
        } catch {
          // ignore errors computing summary
        }
      }
      
    } catch (err) {
      console.error(err);
      if (err instanceof Error) showErrorToast(err.message || 'Lỗi khi gửi giao việc.');
      else showErrorToast(String(err) || 'Lỗi khi gửi giao việc.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 px-12 py-10">
      <div className="mx-auto full-w space-y-6">
        <div className="rounded-2xl border border-gray-200 bg-white px-8 py-6 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-4 border-b border-gray-100 pb-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-gray-500">Quy trình giao KPI</p>
              <h1 className="text-2xl font-semibold text-gray-900">Giao KPI theo tuần</h1>
            </div>
            <button className="text-sm font-medium text-pink-500 hover:text-pink-700" onClick={() => navigate(-1)}>Quay lại</button>
          </div>

          {loading ? (
            <div className="py-12 text-center text-sm text-gray-600">Đang tải dữ liệu...</div>
          ) : (
            <div className="space-y-6 pt-6">
              <div className="grid gap-4 rounded-xl border border-gray-100 bg-gray-50/60 p-5 sm:grid-cols-2 lg:grid-cols-4">
                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Chuỗi sản xuất</p>
                  <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500" value={selectedChainId ?? ''} onChange={(e) => setSelectedChainId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">-- Chọn chuỗi --</option>
                    {chains.map(c => (<option key={c.chain_id} value={c.chain_id}>{c.name}</option>))}
                  </select>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">KPI mục tiêu</p>
                  <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500" value={selectedKpiId ?? ''} onChange={(e) => setSelectedKpiId(e.target.value ? Number(e.target.value) : null)}>
                    <option value="">-- Chọn KPI --</option>
                    {kpis.map(k => (
                      <option key={k.chain_kpi_id} value={k.chain_kpi_id}>{`Mục tiêu ${k.target_value} KPI${k.start_date && k.end_date ? ` — ${new Date(k.start_date).toLocaleDateString()} → ${new Date(k.end_date).toLocaleDateString()}` : k.end_date ? ` — Hạn: ${new Date(k.end_date).toLocaleDateString()}` : ''}`}</option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Tuần thực hiện</p>
                  {(() => {
                    const kpiStart = currentKpi && currentKpi.start_date ? new Date(currentKpi.start_date) : null;
                    const kpiEnd = currentKpi && currentKpi.end_date ? new Date(currentKpi.end_date) : null;

                    const weeksWithDisplay = (currentKpi?.weeks || []).map(w => {
                      const displayDays = (w.days || []).filter(d => {
                        const dt = new Date(d.date);
                        if (kpiStart && dt < kpiStart) return false;
                        if (kpiEnd && dt > kpiEnd) return false;
                        return true;
                      });
                      return { week: w, displayDays };
                    }).filter(x => x.displayDays.length > 0);

                    const fmt = (iso: string) => {
                      const d = new Date(iso);
                      return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`;
                    };

                    return (
                      <select className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500" value={selectedWeekIndex ?? ''} onChange={(e) => setSelectedWeekIndex(e.target.value ? Number(e.target.value) : null)}>
                        <option value="">-- Chọn tuần --</option>
                        {weeksWithDisplay.map(({ week, displayDays }) => (
                          <option key={week.week_index} value={week.week_index}>
                            {`Tuần ${week.week_index} — ngày ${fmt(displayDays[0].date)} / ngày ${fmt(displayDays[displayDays.length - 1].date)}`}
                          </option>
                        ))}
                      </select>
                    );
                  })()}
                </div>

                {currentUser?.role === 'leader' && (
                  <div className="space-y-1">
                    <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Phòng ban của bạn</p>
                    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">{chain?.steps.find(s => s.department_id === currentUser.department_id)?.department?.name || '—'}</div>
                  </div>
                )}
              </div>

              {currentUser?.role === 'admin' && chain && (
                <div className="rounded-xl border border-gray-100 bg-white/80 p-5">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">Phòng ban chịu trách nhiệm</p>
                  <div className="mt-3">
                    <select className="w-80 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500" value={selectedDepartment ?? ''} onChange={(e) => setSelectedDepartment(e.target.value ? Number(e.target.value) : null)}>
                      <option value="">-- Chọn phòng ban --</option>
                      {(() => {
                        const uniq = Array.from(new Map((chain.steps || []).map(s => {
                          const id = s.department?.department_id ?? s.department_id;
                          const dept = s.department ?? { department_id: id, name: `Phòng ${id}` };
                          return [id, dept];
                        })).values());
                        return uniq.map(d => (
                          <option key={d.department_id} value={d.department_id}>{d.name}</option>
                        ));
                      })()}
                    </select>
                  </div>
                </div>
              )}

              <div className="rounded-2xl border border-gray-100 bg-white p-6">
                <div className="flex items-center justify-between border-b border-gray-100 pb-4">
                  <div>
                    <p className="text-sm text-gray-500">Chọn nhân sự và phân KPI theo từng ngày làm việc</p>
                  </div>
                  <span className="rounded-full bg-gray-100 px-3 py-1 text-xs font-semibold text-gray-600">{(chain?.steps || []).filter(s => !selectedDepartment || s.department_id === selectedDepartment).length} bước</span>
                </div>

                <div className="mt-6 space-y-4">
                  {(chain?.steps || []).filter(s => !selectedDepartment || s.department_id === selectedDepartment).map(step => (
                    <div key={step.step_id ?? step.step_order} className="rounded-xl border border-gray-100 bg-gray-50/60 p-5 shadow-sm">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="text-base font-semibold text-gray-900">{step.title}</h3>
                          <p className="text-xs text-gray-500">Phòng ban: {step.department?.name || step.department_id}</p>
                        </div>
                        <div className="w-full max-w-sm">
                          <p className="text-[11px] font-medium uppercase tracking-wide text-gray-500">Nhân sự phụ trách</p>
                          <div className="space-y-2">
                            {(stepAssigns.filter(s => s.step_id === (step.step_id ?? step.step_order))).map(assign => (
                              <div key={assign.id} className="flex items-center gap-2">
                                <select className={`mt-1 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500`} value={assign.assigned_to ?? ''} onChange={(e) => handleAssignChange(assign.id, e.target.value ? Number(e.target.value) : undefined)}>
                                  <option value="">-- Chọn nhân viên --</option>
                                  {employeesForDept(step.department_id).map(u => (
                                    <option key={u.user_id} value={u.user_id}>{u.name} ({u.department_position || '—'})</option>
                                  ))}
                                </select>
                                <button type="button" className="text-sm text-gray-500" onClick={() => removeAssignee(assign.id)}>Xóa</button>
                              </div>
                            ))}
                            <button type="button" className="mt-2 text-sm text-pink-600" onClick={() => addAssignee(step)}>Thêm người</button>
                          </div>
                        </div>
                      </div>

                      {
                        // render one block per assignee instance for this step
                        (stepAssigns.filter(s => s.step_id === (step.step_id ?? step.step_order))
                          .filter(a => a.assigned_to)
                          .map(assign => {
                            const week = currentKpi?.weeks?.find(w => w.week_index === (selectedWeekIndex ?? weekIndex));
                            if (!week) return null;

                            const kpiStart = currentKpi && currentKpi.start_date ? new Date(currentKpi.start_date) : null;
                            const kpiEnd = currentKpi && currentKpi.end_date ? new Date(currentKpi.end_date) : null;

                            const displayDays = (week.days || []).filter(d => {
                              const dt = new Date(d.date);
                              if (kpiStart && dt < kpiStart) return false;
                              if (kpiEnd && dt > kpiEnd) return false;
                              return true;
                            });

                            if (displayDays.length === 0) return null;

                            const dayAssignedTotalsAll: Record<string, number> = {};
                            displayDays.forEach(d => {
                              dayAssignedTotalsAll[d.date] = assignedByDate[d.date] || 0;
                            });

                            const weekRemainingByDayLimit = displayDays.reduce((a, d) => a + Math.max(0, Number(d.target_value || 0) - (dayAssignedTotalsAll[d.date] || 0)), 0);

                            return (
                              <div key={assign.id} className="mt-5 rounded-lg border border-gray-200 bg-white/90 p-4">
                                <div className="flex flex-wrap items-center justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Phân bổ theo ngày</p>
                                    <p className="text-sm text-gray-600">{users.find(u => u.user_id === assign.assigned_to)?.name || '—'}</p>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    <div className="rounded-full bg-pink-50 px-3 py-1 text-xs font-semibold text-pink-600">Còn lại (theo ngày): {weekRemainingByDayLimit} KPI</div>
                                  </div>
                                </div>
                                <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                                  {displayDays.map(day => {
                                    const dateIso = day.date;
                                    const dayTarget = Number(day.target_value || 0);
                                    const currentValue = (assign.day_assignments && assign.day_assignments[dateIso]) ?? 0;
                                    const assigned = assignedByDate[dateIso] || 0;
                                    const remainingDayKpi = Math.max(0, dayTarget - assigned);

                                    return (
                                      <div key={dateIso} className="rounded-lg border border-gray-100 bg-gray-50/80 p-3">
                                        <p className="text-xs font-semibold text-gray-600">{new Date(dateIso).toLocaleDateString()}</p>
                                        <p className="text-[11px] text-gray-500">Tổng {dayTarget} KPI · Còn lại {remainingDayKpi} KPI</p>
                                        <input
                                          type="number"
                                          min={0}
                                          max={remainingDayKpi}
                                          value={String(currentValue)}
                                          onChange={(e) => {
                                            const v = Number(e.target.value) || 0;
                                            const clamped = Math.min(Math.max(v, 0), remainingDayKpi);
                                            handleDayChange(assign.id, dateIso, clamped);
                                          }}
                                          className="mt-3 w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm focus:border-pink-500 focus:ring-pink-500"
                                        />
                                        {currentValue > 0 && (
                                          <div className="mt-3 space-y-2">
                                            {Array.from({ length: currentValue }).map((_, k) => (
                                              <input
                                                key={k}
                                                placeholder={`Tên KPI #${k + 1}`}
                                                value={(assign.day_titles && assign.day_titles[dateIso] && assign.day_titles[dateIso][k]) || ''}
                                                onChange={(e) => handleDayTitleChange(assign.id, dateIso, k, e.target.value)}
                                                className="w-full rounded-md border border-gray-200 bg-white px-3 py-2 text-sm"
                                              />
                                            ))}
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            );
                          }))
                      }
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex flex-wrap items-center justify-end gap-3 border-t border-gray-100 pt-5">
                <button className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-semibold text-gray-600 hover:border-gray-400" onClick={() => navigate(-1)}>Hủy</button>
                <button className="rounded-lg bg-pink-600 px-5 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-pink-700 disabled:cursor-not-allowed disabled:opacity-60" onClick={handleSubmit} disabled={submitting}>{submitting ? 'Đang gửi...' : 'Giao tuần'}</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
