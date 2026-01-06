import { useEffect, useState, useRef } from 'react';
import { getMyAssignments, postAssignmentDayResult, acceptAssignment } from '../../api/productionChains';
import { useToast } from '../../hooks/useToast';

interface Assignment {
  assignment_id: number;
  chain_kpi_id: number;
  week_index: number;
  step_id: number;
  assigned_to: number | null;
  day_assignments: Record<string, number> | null;
  day_results?: Record<string, { link: string; saved_by?: number; saved_at?: string } | { link: string; saved_by?: number; saved_at?: string }[]> | null;
  assignee?: { user_id: number; name: string; department_position?: string } | null;
  handed_over: boolean;
  accepted?: boolean;
  accepted_by?: number | null;
  day_titles?: Record<string, string[]> | null;
  created_at: string;
  updated_at: string;
  kpi?: { weeks?: { week_index: number; days?: { date: string; target_value?: number }[] }[] } | null;
}

export default function MyAssignments() {
  const [items, setItems] = useState<Assignment[]>([]);
  const [loading, setLoading] = useState(false);
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; assignmentId: number; date: string; slotIndex?: number } | null>(null);
  const [linkInput, setLinkInput] = useState('');
  const menuRef = useRef<HTMLDivElement | null>(null);
  const { showSuccessToast, showErrorToast } = useToast();

  const formatDateVi = (iso?: string) => {
    if (!iso) return { weekday: '', displayDate: '' };
    const dt = new Date(iso);
    const weekdayRaw = dt.toLocaleDateString('vi-VN', { weekday: 'long' });
    const weekday = weekdayRaw.split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
    const displayDate = dt.toLocaleDateString('vi-VN');
    return { weekday, displayDate };
  };

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await getMyAssignments();
      if (Array.isArray(res)) setItems(res as Assignment[]);
      else if (res && Array.isArray((res as { assignments?: unknown }).assignments)) setItems((res as { assignments?: unknown }).assignments as Assignment[]);
      else setItems([]);
    } catch (e) {
      console.error(e);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchItems(); }, []);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenu(null);
      }
    };
    document.addEventListener('mousedown', onDoc);
    return () => document.removeEventListener('mousedown', onDoc);
  }, []);

  const closeMenu = () => setContextMenu(null);

  // Compute menu position clamped to the viewport so it won't be cut off near edges
  let menuLeft = 0;
  let menuTop = 0;
  if (contextMenu && typeof window !== 'undefined') {
    const margin = 12;
    const menuWidth = 320; // corresponds to Tailwind `w-80`
    const maxLeft = Math.max(margin, window.innerWidth - menuWidth - margin);
    const tentativeLeft = contextMenu.x;
    menuLeft = Math.min(Math.max(tentativeLeft, margin), maxLeft);

    // approximate menu height and clamp; we use a conservative maxHeight
    const maxTop = Math.max(margin, window.innerHeight - 200);
    const tentativeTop = contextMenu.y;
    menuTop = Math.min(Math.max(tentativeTop, margin), maxTop);
  }

  return (
    <div className="p-6">
      {loading ? (
        <div>Đang tải...</div>
      ) : (
        <div className="space-y-3">
          {items.length === 0 && <div className="text-sm text-gray-500">Không có công việc nào.</div>}
          {items.map((it) => {
            const kpiWeeks = (it.kpi && it.kpi.weeks) || [];
            const week = kpiWeeks.find(w => w.week_index === it.week_index);
            const days = (week && week.days) || Object.keys(it.day_assignments || {}).map(d => ({ date: d }));

            return (
              <div key={it.assignment_id} className="rounded-lg border border-pink-100 p-4 bg-white shadow-sm">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold mb-4">Công việc được giao</h2>
                  <div>
                    {(() => {
                      const kpiWeekDays = (week && week.days) || [];
                      const dateList = kpiWeekDays.length ? kpiWeekDays.map(d => d.date) : Object.keys(it.day_assignments || {});
                      const sortedDates = Array.from(dateList).sort();
                      const startDate = sortedDates.length ? sortedDates[0] : it.created_at;
                      const endDate = sortedDates.length ? sortedDates[sortedDates.length - 1] : it.created_at;
                      return (
                      <div className="flex items-center gap-4">
                        <div className="text-sm text-gray-600">Tuần {it.week_index}</div>
                        <div className="text-sm text-gray-500">Từ {formatDateVi(startDate).displayDate} đến {formatDateVi(endDate).displayDate}</div>
                      </div>
                      );
                    })()}
                  </div>
                  <div className="flex items-center gap-4">
                    {(() => {
                      const name = it.assignee?.name || '—';
                      const position = it.assignee?.department_position || '';
                      const initials = name && name !== '—' ? name.split(' ').filter(Boolean).map(n => n[0]).slice(0,2).join('').toUpperCase() : '?';
                      return (
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 flex items-center justify-center rounded-full bg-pink-50 text-pink-600 font-semibold text-sm">{initials}</div>
                          <div className="text-right">
                            <div className="text-sm font-medium text-gray-900">{name}</div>
                            {position && <div className="text-xs text-gray-500">{position}</div>}
                          </div>
                        </div>
                      );
                    })()}

                  </div>
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {days.map((d) => {
                    const dateIso = d.date;
                    const { weekday, displayDate } = formatDateVi(dateIso);
                    const assignedVal = it.day_assignments && it.day_assignments[dateIso] ? it.day_assignments[dateIso] : 0;
                    const dayResults = it.day_results && it.day_results[dateIso];

                    const count = Number(assignedVal || 0);

                    // If no KPI assigned for this date, render a muted disabled card
                    if (count === 0) {
                      return (
                        <div key={dateIso} className="rounded-md border border-pink-100 bg-pink-50 p-3 opacity-80 cursor-not-allowed">
                          <div className="flex items-baseline justify-between mb-2">
                            <div>
                              <div className="text-xs text-pink-400">{weekday}</div>
                              <div className="text-sm font-semibold text-pink-600">{displayDate}</div>
                            </div>
                            <div className="text-xs text-pink-300">0 KPI</div>
                          </div>
                          <div className="text-sm text-pink-400">Không có KPI được giao cho ngày này.</div>
                        </div>
                      );
                    }

                    return (
                      <div key={dateIso} className="rounded-md border border-pink-100 bg-white p-3 shadow-sm">
                        <div className="flex items-baseline justify-between mb-2">
                          <div>
                              <div className="text-xs text-pink-400">{weekday}</div>
                              <div className="text-sm font-semibold text-pink-700">{displayDate}</div>
                          </div>
                          <div className="text-xs text-gray-500 ml-2">{assignedVal} KPI</div>
                        </div>

                        <div className="space-y-2">
                          {Array.from({ length: count }).map((_, idx) => {
                            const slotIndex = idx;
                            // Support dayResults as array or single object
                            let slotLink = '';
                            if (Array.isArray(dayResults)) slotLink = dayResults[slotIndex]?.link || '';
                            else if (dayResults && typeof dayResults === 'object') slotLink = dayResults.link || '';

                            // KPI title per slot (from backend day_titles) or fallback
                            const slotTitle = (it.day_titles && Array.isArray(it.day_titles[dateIso]) && it.day_titles[dateIso][slotIndex]) || `KPI ${slotIndex + 1}`;

                            return (
                              <div
                                key={idx}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  if (!it.accepted) {
                                    showErrorToast('Vui lòng nhấn "Nhận KPI" trước khi nộp kết quả.');
                                    return;
                                  }
                                  setLinkInput(slotLink);
                                  setContextMenu({ x: e.clientX, y: e.clientY, assignmentId: it.assignment_id, date: dateIso, slotIndex });
                                }}
                                className="flex items-center justify-between gap-3 p-2 rounded-md border bg-white hover:shadow-sm cursor-context-menu"
                              >
                                <div className="flex items-center gap-3">
                                  <div className="w-8 h-8 flex items-center justify-center bg-pink-50 text-pink-600 rounded">{idx + 1}</div>
                                      <div>
                                        <div className="text-sm font-medium text-pink-700">{slotTitle}</div>
                                      </div>
                                </div>
                                <div className="text-right">
                                      {slotLink ? (
                                        <a href={slotLink} target="_blank" rel="noreferrer" className="text-sm text-pink-600 underline truncate max-w-[160px] block">Xem kết quả</a>
                                      ) : (
                                        <div className="text-sm text-pink-400">Chưa có kết quả</div>
                                      )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 flex justify-end">
                  {it.accepted ? (
                    <div className="text-xs text-pink-600 font-semibold">Bạn đã nhận KPI</div>
                  ) : (
                    <button className="px-3 py-1 rounded bg-pink-600 text-white text-sm" onClick={async () => {
                      try {
                        const res = await acceptAssignment(it.assignment_id);
                        if (res?.accepted !== false) {
                          showSuccessToast('Đã nhận KPI.');
                          await fetchItems();
                        } else {
                          showErrorToast('Không thể nhận KPI.');
                        }
                      } catch (e) {
                        console.error(e);
                        showErrorToast('Không thể nhận KPI.');
                      }
                    }}>Nhận KPI</button>
                  )}
                </div>
              </div>
            );
          })}

          {contextMenu && (
            <div ref={menuRef} style={{ left: menuLeft, top: menuTop }} className="fixed z-50 bg-white p-3 rounded-lg shadow-lg w-80 border border-pink-100">
              {(() => {
                const { weekday, displayDate } = formatDateVi(contextMenu.date);
                return (
                  <div className="text-sm font-medium mb-2">Lưu kết quả cho {weekday}, {displayDate}{contextMenu.slotIndex !== undefined ? ` · KPI #${contextMenu.slotIndex + 1}` : ''}</div>
                );
              })()}
              <input value={linkInput} onChange={(e) => setLinkInput(e.target.value)} placeholder="Link kết quả" className="w-full rounded border px-2 py-1 text-sm" />
              <div className="mt-2 flex justify-end gap-2">
                <button className="px-3 py-1 text-sm" onClick={() => { setLinkInput(''); closeMenu(); }}>Hủy</button>
                <button className="px-3 py-1 bg-pink-600 text-white rounded text-sm" onClick={async () => {
                  try {
                    await postAssignmentDayResult(contextMenu.assignmentId, contextMenu.date, linkInput, contextMenu.slotIndex);
                    await fetchItems();
                  } catch (e) { console.error(e); }
                  closeMenu();
                }}>Lưu</button>
              </div>
            </div>
          )}

        </div>
      )}
    </div>
  );
}
