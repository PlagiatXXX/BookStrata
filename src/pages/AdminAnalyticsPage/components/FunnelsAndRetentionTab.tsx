import type { FunnelResult, FunnelStage, RetentionResult } from "@/lib/analyticsApi";

function rateColor(value: number): string {
  if (value >= 40) return "text-emerald-400";
  if (value >= 20) return "text-amber-400";
  return "text-red-400";
}

function heatBg(value: number | null): string {
  if (value === null) return "bg-transparent text-gray-600";
  if (value >= 40) return "bg-emerald-500/25 text-emerald-300";
  if (value >= 20) return "bg-amber-500/20 text-amber-300";
  if (value > 0) return "bg-violet-500/15 text-violet-300";
  return "bg-white/5 text-gray-500";
}

function FunnelCard({
  title,
  subtitle,
  stages,
  palette,
}: {
  title: string;
  subtitle: string;
  stages: FunnelStage[];
  palette: string[];
}) {
  const maxCount = stages.length ? Math.max(...stages.map((s) => s.count), 1) : 1;

  return (
    <div className="rounded-xl border border-gray-800 bg-[#121212] p-5">
      <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">{title}</h2>
      <p className="text-xs text-gray-500 mt-0.5 mb-4">{subtitle}</p>
      <div className="flex flex-col gap-3">
        {stages.map((stage, i) => {
          const pct = Math.round((stage.count / maxCount) * 100);
          return (
            <div key={stage.name}>
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-sm text-gray-300">{stage.name}</span>
                <div className="flex items-center gap-2">
                  {stage.conversionFromStart !== null && stage.conversionFromStart !== undefined && (
                    <span className="text-[11px] text-gray-500">
                      от старта: {stage.conversionFromStart}%
                    </span>
                  )}
                  <span className="text-sm font-bold text-[#f6f1e8] tabular-nums">{stage.count}</span>
                </div>
              </div>
              <div className="relative h-5 w-full bg-gray-800 rounded-sm overflow-hidden">
                <div
                  className="h-full rounded-sm transition-all duration-500"
                  style={{
                    width: `${stage.count > 0 ? Math.max(pct, 3) : 0}%`,
                    backgroundColor: palette[i % palette.length],
                  }}
                />
              </div>
              {stage.conversionFromPrev !== null && stage.conversionFromPrev !== undefined && (
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Конверсия шага: {stage.conversionFromPrev}%
                </p>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface FunnelsAndRetentionTabProps {
  funnel?: FunnelResult;
  retention?: RetentionResult;
}

export function FunnelsAndRetentionTab({ funnel, retention }: FunnelsAndRetentionTabProps) {
  const activationStages = funnel?.activation?.stages ?? funnel?.stages ?? [];
  const acquisitionStages = funnel?.acquisition?.stages ?? [];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <FunnelCard
          title="Воронка гостя (Acquisition)"
          subtitle="Последовательный путь браузера до регистрации"
          stages={acquisitionStages}
          palette={["#0ea5e9", "#06b6d4", "#14b8a6", "#10b981"]}
        />
        <FunnelCard
          title="Активация после регистрации"
          subtitle="Последовательные шаги новых пользователей"
          stages={activationStages}
          palette={["#6366f1", "#8b5cf6", "#a855f7", "#c084fc"]}
        />
      </div>

      {retention && (
        <div className="rounded-xl border border-gray-800 bg-[#121212] p-5 space-y-6">
          <div>
            <h2 className="text-sm font-bold uppercase tracking-wider text-gray-300">
              Удержание (Retention по календарным дням МСК)
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Доля зарегистрированных пользователей, вернувшихся ровно на N-й день
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            {(
              [
                { label: "D1", desc: "на следующий день", rate: retention.d1, cohort: retention.cohorts?.d1 },
                { label: "D7", desc: "через неделю", rate: retention.d7, cohort: retention.cohorts?.d7 },
                { label: "D30", desc: "через месяц", rate: retention.d30, cohort: retention.cohorts?.d30 },
              ] as const
            ).map((item) => (
              <div key={item.label} className="rounded-lg border border-gray-800 bg-[#171717] p-4 text-center">
                <p className="text-xs uppercase tracking-wider text-gray-500 mb-2">{item.label}</p>
                <p className="text-4xl font-black">
                  {item.rate === null ? (
                    <span className="text-gray-500">—</span>
                  ) : (
                    <span className={rateColor(item.rate)}>{item.rate}%</span>
                  )}
                </p>
                <p className="text-xs text-gray-500 mt-1">{item.desc}</p>
                {item.cohort && (
                  <p className="text-[11px] text-gray-400 mt-1">
                    {item.cohort.retained} из {item.cohort.eligible} чел.
                  </p>
                )}
              </div>
            ))}
          </div>

          {retention.weeklyMatrix && retention.weeklyMatrix.length > 0 && (
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-gray-400 mb-3">
                Недельная когортная матрица
              </h3>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-gray-800 text-gray-400">
                      <th className="py-2 pr-4 text-left font-medium">Неделя</th>
                      <th className="py-2 px-3 text-right font-medium">Регистраций</th>
                      <th className="py-2 px-3 text-center font-medium">W0</th>
                      <th className="py-2 px-3 text-center font-medium">W1</th>
                      <th className="py-2 px-3 text-center font-medium">W2</th>
                      <th className="py-2 px-3 text-center font-medium">W3</th>
                      <th className="py-2 px-3 text-center font-medium">W4</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-800/70">
                    {retention.weeklyMatrix.map((row) => (
                      <tr key={row.weekStart}>
                        <td className="py-2 pr-4 text-gray-300 font-mono">{row.weekStart}</td>
                        <td className="py-2 px-3 text-right font-semibold text-[#f6f1e8] tabular-nums">
                          {row.cohortSize}
                        </td>
                        {row.retentionByWeek.map((val, idx) => (
                          <td key={idx} className="py-1.5 px-1.5 text-center">
                            <span className={`inline-block w-full rounded py-1 font-medium tabular-nums ${heatBg(val)}`}>
                              {val === null ? "—" : `${val}%`}
                            </span>
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
