import type { KpiDay } from "./types";

interface DayCardProps {
  day: KpiDay;
  weekIndex: number;
  userRole?: string;
  onToggleAttending: (weekIndex: number, date: string) => void;
  onDayTargetChange: (weekIndex: number, date: string, value: string) => void;
  formatDayDetail: (date: string) => string;
}

export function DayCard({
  day,
  weekIndex,
  userRole,
  onToggleAttending,
  onDayTargetChange,
  formatDayDetail
}: DayCardProps) {
  return (
    <div
      className={`relative rounded-xl border-2 p-4 text-center transition-all duration-200 hover:shadow-md ${
        day.is_completed
          ? 'bg-green-50 border-green-200'
          : !day.user_attending || (userRole !== 'admin' && userRole !== 'leader')
          ? 'bg-gray-50 border-gray-100 opacity-60'
          : 'bg-white border-gray-100 hover:border-sky-200'
      }`}
    >
      <div className="mb-2">
        <p className={`text-sm font-medium ${
          day.is_completed ? 'text-green-700' : 'text-gray-600'
        }`}>
          {formatDayDetail(day.date)}
        </p>
        {day.is_completed && (
          <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-green-500" title="Đã hoàn thành"></span>
        )}
        {!day.is_completed && (!day.user_attending || (userRole !== 'admin' && userRole !== 'leader')) && (
          <span className="absolute top-2 right-2 w-4 h-4 rounded-full bg-gray-400 flex items-center justify-center" title="Không đi làm">
            <svg className="w-2 h-2 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </span>
        )}
      </div>

      {/* Toggle Attending Button */}
      {(userRole === 'admin' || userRole === 'leader') && !day.is_completed && (
        <button
          type="button"
          onClick={() => onToggleAttending(weekIndex, day.date)}
          className={`mb-2 px-2 py-1 text-xs font-semibold rounded-full transition-all duration-200 ${
            day.user_attending
              ? 'bg-green-100 text-green-700 hover:bg-green-200'
              : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
          }`}
          title={day.user_attending ? 'Đi làm' : 'Nghỉ'}
        >
          {day.user_attending ? 'Đi làm' : 'Nghỉ'}
        </button>
      )}

      <input
        type="number"
        value={day.target_value || ''}
        onChange={(e) => onDayTargetChange(weekIndex, day.date, e.target.value)}
        disabled={!day.user_attending || day.is_completed || (userRole !== 'admin' && userRole !== 'leader')}
        className={`w-full rounded-lg border-2 px-2 py-1.5 text-center font-bold focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500 transition-all duration-200 appearance-none ${
          day.is_completed
            ? 'border-green-200 bg-green-50 text-green-700 cursor-not-allowed'
            : day.is_working_day === false || (userRole !== 'admin' && userRole !== 'leader')
            ? 'border-transparent bg-transparent text-gray-400 cursor-not-allowed'
            : 'border-gray-200 bg-white text-gray-900'
        }`}
      />
    </div>
  );
}