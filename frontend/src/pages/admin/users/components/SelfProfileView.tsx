import React from "react";
import type { ApiUser } from "../types";
import { formatDate } from "../utils";

interface SelfProfileViewProps {
  user: ApiUser;
  renderStatusBadge: (status: string | null | undefined) => React.ReactNode;
}

function InfoRow({ label, value }: { label: string; value?: React.ReactNode }) {
  return (
    <div>
      <dt className="text-[10px] uppercase text-slate-400 tracking-wide">{label}</dt>
      <dd className="mt-1 text-slate-100 leading-relaxed">{value ?? <span className="text-slate-500">—</span>}</dd>
    </div>
  );
}

function InfoCard({ title, children }: { title?: string; children: React.ReactNode }) {
  return (
    <section className="bg-slate-800 rounded-2xl p-5 border border-slate-700/40 shadow-sm">
      {title ? <h3 className="text-sm text-slate-300 uppercase tracking-wide mb-3">{title}</h3> : null}
      <div className="space-y-3">{children}</div>
    </section>
  );
}

export function SelfProfileView({ user, renderStatusBadge }: SelfProfileViewProps) {
  const show = (v?: string | number | null) => (v || v === 0 ? v : undefined);

  return (
    <div>
      <div className="max-w-6xl mx-auto overflow-y-auto h-[50vh] px-4 md:px-0">
        <header className="mb-4 flex items-center gap-6">

          <div className="flex-1">
            <h1 className="text-2xl font-semibold tracking-wide text-slate-100 leading-tight">{user.name ?? "Không tên"}</h1>
            <div className="mt-2 flex flex-col md:flex-row md:items-center md:gap-4">
              <div className="inline-flex items-center gap-2 px-2 py-0.5 rounded-full text-sm font-semibold">
                {renderStatusBadge(user.employment_status)}
              </div>
              <div className="text-sm text-slate-400 mt-2 md:mt-0">
                <span className="mr-3">{user.department ?? "-"}</span>
                <span className="text-slate-300">{user.department_position ?? "-"}</span>
              </div>
            </div>
          </div>
        </header>

        {/* Stats row similar to screenshot */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2 space-y-6">
            <InfoCard title="Công việc">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoRow label="Phòng ban" value={show(user.department)} />
          <InfoRow label="Chức vụ" value={show(user.department_position)} />
          <InfoRow label="Ngày vào làm" value={user.date_joined ? formatDate(user.date_joined) : undefined} />
          <InfoRow label="Ca làm việc" value={`${user.work_shift_start ?? "--"} → ${user.work_shift_end ?? "--"}`} />
              </div>
            </InfoCard>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <InfoCard title="Nghỉ phép">
          <div className="space-y-2">
            <InfoRow
              label="Phép còn lại"
              value={`${(user.remaining_leave_days ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} / ${(user.annual_leave_quota ?? 0).toLocaleString("vi-VN", { maximumFractionDigits: 2 })} ngày`}
            />
          </div>
              </InfoCard>

              <InfoCard title="Ghi chú">
          <div className="text-sm text-slate-100 leading-relaxed">{user.note ?? <span className="text-slate-500">Không có</span>}</div>
              </InfoCard>
            </div>
          </div>

          <div className="md:col-span-1">
            <InfoCard title="Liên hệ">
                <div className="space-y-3 text-sm">
                <InfoRow label="Số điện thoại" value={<span className="font-mono">{user.phone ?? "—"}</span>} />
                <InfoRow
                  label="Email"
                  value={
                  <span className="inline-block max-w-full break-words text-[clamp(.6rem,1vw,0.875rem)]">
                    {user.email ?? "—"}
                  </span>
                  }
                />
                <InfoRow label="Địa chỉ" value={<span className="break-words whitespace-normal">{user.address ?? "--"}</span>} />
                </div>
            </InfoCard>
          </div>
        </div>
      </div>
    </div>
  );
}
