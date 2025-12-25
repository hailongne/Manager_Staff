import type { FormEvent, ChangeEvent } from "react";
import type { ApiDepartment, ApiUser, DepartmentLinkFormState } from "./types";
import { normalizeDepartmentId } from "./utils";

const humanizeCount = (count: number) => count.toLocaleString("vi-VN");

interface ChainFormProps {
  linkForm: DepartmentLinkFormState;
  availableDepartments: ApiDepartment[];
  departmentById: Map<number, ApiDepartment>;
  departmentMembersById: Map<number, ApiUser[]>;
  selectedSummary: string;
  onProductNameChange: (event: ChangeEvent<HTMLInputElement>) => void;
  onToggleLinkDepartment: (departmentId: number) => () => void;
  onReorderDepartment: (departmentId: number, direction: "up" | "down") => () => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}

export function ChainForm({
  linkForm,
  availableDepartments,
  departmentById,
  departmentMembersById,
  selectedSummary,
  onProductNameChange,
  onToggleLinkDepartment,
  onReorderDepartment,
  onSubmit
}: ChainFormProps) {
  return (
    <section className="mb-8 bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <header className="mb-4">
        <h2 className="text-lg font-semibold text-gray-800">Tạo chuỗi mới</h2>
        <p className="text-sm text-gray-500">Chọn ít nhất hai phòng ban tham gia và đặt tên cho chuỗi.</p>
      </header>
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Tên chuỗi</label>
          <input
            type="text"
            value={linkForm.productName}
            onChange={onProductNameChange}
            placeholder="Ví dụ: Chuỗi sản xuất nội dung Tết"
            className="mt-1 w-full rounded-lg border border-pink-200 bg-pink-50 px-3 py-2 text-sm text-gray-700 placeholder-pink-300 focus:border-pink-300 focus:outline-none focus:ring-2 focus:ring-pink-200"
          />
        </div>
        <div>
          <p className="text-sm font-medium text-gray-700 mb-2">Phòng ban tham gia</p>
          <div className="flex flex-wrap gap-2">
            {availableDepartments.map((dept) => {
              const id = normalizeDepartmentId(dept.department_id);
              if (id == null) return null;
              const isSelected = linkForm.selectedIds.includes(String(id));
              const orderLabel = isSelected ? linkForm.selectedIds.indexOf(String(id)) + 1 : null;
              const participantCount = departmentMembersById.get(id)?.length ?? 0;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={onToggleLinkDepartment(id)}
                  className={`px-3 py-2 rounded-lg border text-sm transition ${
                    isSelected
                      ? "border-pink-400 bg-pink-100 text-pink-700"
                      : "border-gray-200 bg-white hover:border-pink-200 hover:text-pink-600"
                  }`}
                >
                  <span className="font-medium">{dept.name}</span>
                  {orderLabel ? (
                    <span className="ml-1 rounded bg-pink-100 px-2 py-0.5 text-[11px] font-semibold text-pink-600">
                      #{orderLabel}
                    </span>
                  ) : null}
                  <span className="ml-2 text-xs text-gray-500">({humanizeCount(participantCount)} người)</span>
                </button>
              );
            })}
          </div>
          <p className="mt-2 text-xs text-gray-500">Thứ tự xử lý: {selectedSummary || "Chưa chọn phòng ban"}</p>
          {linkForm.selectedIds.length > 1 ? (
            <div className="mt-2 rounded-lg border border-pink-100 bg-pink-50 p-3">
              <p className="text-xs font-semibold text-pink-700">Điều chỉnh thứ tự:</p>
              <ul className="mt-2 space-y-1">
                {linkForm.selectedIds.map((value: string, index: number) => {
                  const id = Number(value);
                  if (!Number.isFinite(id)) return null;
                  const name = departmentById.get(id)?.name ?? `#${id}`;
                  return (
                    <li key={value} className="flex items-center justify-between text-xs text-pink-700">
                      <span>
                        {index + 1}. {name}
                      </span>
                      <span className="inline-flex gap-1">
                        <button
                          type="button"
                          onClick={onReorderDepartment(id, "up")}
                          className="rounded border border-pink-200 bg-white px-2 py-0.5 text-[11px] text-pink-600 disabled:opacity-40"
                          disabled={index === 0}
                        >
                          Lên
                        </button>
                        <button
                          type="button"
                          onClick={onReorderDepartment(id, "down")}
                          className="rounded border border-pink-200 bg-white px-2 py-0.5 text-[11px] text-pink-600 disabled:opacity-40"
                          disabled={index === linkForm.selectedIds.length - 1}
                        >
                          Xuống
                        </button>
                      </span>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="inline-flex items-center gap-2 rounded-lg bg-pink-500 px-4 py-2 text-sm font-semibold text-white hover:bg-pink-600"
          >
            Tạo chuỗi
          </button>
        </div>
      </form>
    </section>
  );
}