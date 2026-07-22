import { useState } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query"
import {
  ArrowLeft,
  Search,
  Shield,
  ShieldCheck,
  Crown,
  Calendar,
  Mail,
  AlertTriangle,
  X,
  Ban,
  Users,
  UserX,
  Flag,
  Heart,
} from "lucide-react"
import { api } from "@/lib/api-client"
import { apiSetDonorStatus } from "@/lib/userApi"
import { useAuth } from "@/hooks/useAuthContext"
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock"
import { DonorBadge } from "@/components/DonorBadge/DonorBadge"
import { sileo } from "sileo"
import { apiGetFlags, apiResolveFlag } from "@/lib/moderationApi"
import type { AdminUser } from "@/types/auth"
import { formatRelativeTime, formatTotalMinutes } from "@/utils/timeFormat"

interface ViolatorAction {
  type: "chat_ban" | "suspension" | "warning"
  date: string
  until: string | null
  reason: string | null
  moderator: { id: number; username: string } | null
}

interface ViolatorUser {
  userId: number
  username: string | null
  email: string
  role: string
  warningsCount: number
  actions: ViolatorAction[]
}

type Tab = "users" | "violators" | "flags"

const ROLES = ["admin", "moderator", "user"] as const
type Role = (typeof ROLES)[number]

const ROLE_LABELS: Record<Role, string> = {
  admin: "Админ",
  moderator: "Модератор",
  user: "Пользователь",
}

const ACTION_LABELS: Record<ViolatorAction["type"], string> = {
  chat_ban: "Чат-бан",
  suspension: "Блокировка",
  warning: "Предупреждение",
}

const ACTION_COLORS: Record<ViolatorAction["type"], string> = {
  chat_ban: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  suspension: "bg-red-500/10 text-red-400 border-red-500/30",
  warning: "bg-amber-500/10 text-amber-400 border-amber-500/30",
}

export default function AdminUsersPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
  const [activeTab, setActiveTab] = useState<Tab>("users")
  const [searchQuery, setSearchQuery] = useState("")
  const [roleFilter, setRoleFilter] = useState<Role | "all">("all")
  const [changingUserId, setChangingUserId] = useState<number | null>(null)
  const [adminPassword, setAdminPassword] = useState("")
  const [confirmTarget, setConfirmTarget] = useState<{
    userId: number
    username: string
    currentRole: Role
    newRole: Role
  } | null>(null)

  useBodyScrollLock(!!confirmTarget)

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get<AdminUser[]>("/users/admin/all"),
    refetchInterval: 30_000,
  })

  const { data: violators = [], isLoading: violatorsLoading } = useQuery<ViolatorUser[]>({
    queryKey: ["admin-violators"],
    queryFn: () => api.get<ViolatorUser[]>("/users/admin/violators"),
  })

  const { data: flagsData, isLoading: flagsLoading, refetch: refetchFlags } = useQuery({
    queryKey: ["admin-flags"],
    queryFn: () => apiGetFlags({ status: "pending" }),
  })
  const flags = flagsData?.flags ?? []
  const pendingFlagsCount = flagsData?.total ?? 0

  const assignRole = useMutation({
    mutationFn: ({
      userId,
      role,
      password,
    }: {
      userId: number
      role: Role
      password: string
    }) => api.put(`/roles/user/${userId}`, { role, password }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] })
      sileo.success({ title: "Роль обновлена", duration: 3000 })
      setConfirmTarget(null)
      setAdminPassword("")
    },
    onError: (err: Error) => {
      sileo.error({
        title: "Ошибка",
        description: err.message || "Не удалось обновить роль",
        duration: 5000,
      })
    },
  })

  const handleRoleChange = async () => {
    if (!confirmTarget || changingUserId || !adminPassword) return
    setChangingUserId(confirmTarget.userId)
    try {
      await assignRole.mutateAsync({
        userId: confirmTarget.userId,
        role: confirmTarget.newRole,
        password: adminPassword,
      })
    } catch {
      // Ошибка уже обработана в onError мутации, просто снимаем блокировку
    } finally {
      setChangingUserId(null)
    }
  }

  const resolveFlagMut = useMutation({
    mutationFn: ({ id, action }: { id: number; action: "resolved" | "dismissed" }) =>
      apiResolveFlag(id, action),
    onSuccess: () => {
      refetchFlags()
      sileo.success({ title: "Жалоба обработана", duration: 3000 })
    },
    onError: (err: Error) => {
      sileo.error({ title: "Ошибка", description: err.message, duration: 5000 })
    },
  })

  const canChangeRole = currentUser?.role === "admin"

  const filteredUsers = users.filter((u) => {
    const matchesSearch =
      u.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      u.email.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesRole =
      roleFilter === "all" || u.role === roleFilter
    return matchesSearch && matchesRole
  })

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

  const formatDateTime = (dateStr: string) =>
    new Date(dateStr).toLocaleString("ru-RU", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    })

  const getDuration = (from: string, until: string) => {
    const diff = new Date(until).getTime() - new Date(from).getTime()
    if (diff <= 0) return "0 мин."
    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    if (days > 0) return `${days} дн.`
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours > 0) return `${hours} ч.`
    const mins = Math.floor(diff / (1000 * 60))
    return `${mins} мин.`
  }

  const actionIcon = (type: ViolatorAction["type"]) => {
    switch (type) {
      case "chat_ban": return <Ban size={10} />
      case "suspension": return <UserX size={10} />
      case "warning": return <AlertTriangle size={10} />
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-6 sm:py-10">
      <div className="max-w-6xl mx-auto px-4">
        <button
          onClick={() => navigate("/admin")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>Назад в админку</span>
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 sm:text-3xl">
            Управление пользователями
          </h1>
          <p className="text-gray-400">
            Просмотр и управление пользователями
          </p>
        </div>

        <div className="flex gap-2 mb-6">
          <button
            onClick={() => setActiveTab("users")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "users"
                ? "bg-white/10 text-white border border-white/20"
                : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
            }`}
          >
            <Users size={16} />
            Пользователи
          </button>
          <button
            onClick={() => setActiveTab("violators")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "violators"
                ? "bg-red-500/20 text-red-400 border border-red-500/30"
                : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
            }`}
          >
            <UserX size={16} />
            Нарушители
            {violators.length > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs leading-none rounded-full bg-red-500/20 text-red-400">
                {violators.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab("flags")}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
              activeTab === "flags"
                ? "bg-amber-500/20 text-amber-400 border border-amber-500/30"
                : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
            }`}
          >
            <Flag size={16} />
            Жалобы
            {pendingFlagsCount > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-xs leading-none rounded-full bg-amber-500/20 text-amber-400">
                {pendingFlagsCount}
              </span>
            )}
          </button>
        </div>

        {activeTab === "users" ? (
          <>
            <div className="flex flex-col sm:flex-row gap-4 mb-6 items-start sm:items-center justify-between">
              <div className="flex gap-2 flex-wrap">
                {(["all", "admin", "moderator", "user"] as const).map((role) => (
                  <button
                    key={role}
                    onClick={() => setRoleFilter(role)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                      roleFilter === role
                        ? role === "admin"
                          ? "bg-red-500/20 text-red-400 border border-red-500/30"
                          : role === "moderator"
                            ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                            : role === "user"
                              ? "bg-green-500/20 text-green-400 border border-green-500/30"
                              : "bg-white/10 text-white border border-white/20"
                        : "bg-white/5 text-gray-400 border border-transparent hover:bg-white/10"
                    }`}
                  >
                    {role === "all"
                      ? "Все"
                      : role === "admin"
                        ? "Админы"
                        : role === "moderator"
                          ? "Модераторы"
                          : "Пользователи"}
                  </button>
                ))}
              </div>

              <div className="relative w-full sm:w-64">
                <Search
                  size={16}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500"
                />
                <input
                  type="text"
                  placeholder="Поиск по имени или email..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-white/5 border border-gray-700 rounded-lg pl-9 pr-4 py-2 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-gray-500"
                />
              </div>
            </div>

            <div className="rounded-xl border border-gray-800 overflow-x-auto max-w-full">
              <table className="w-full min-w-160">
                <thead>
                  <tr className="bg-white/5 border-b border-gray-800">
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Пользователь
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Роль
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">
                      Статус
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden sm:table-cell">
                      Меценат
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">
                      Был(а) в сети
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden lg:table-cell">
                      На сайте
                    </th>
                    <th className="text-left px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden lg:table-cell">
                      Зарегистрирован
                    </th>
                    <th className="text-right px-4 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                      Действия
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {isLoading ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        Загрузка...
                      </td>
                    </tr>
                  ) : filteredUsers.length === 0 ? (
                    <tr>
                      <td
                        colSpan={8}
                        className="px-6 py-12 text-center text-sm text-gray-500"
                      >
                        Пользователи не найдены
                      </td>
                    </tr>
                  ) : (
                    filteredUsers.map((u) => (
                      <tr
                        key={u.userId}
                        className="hover:bg-white/2 transition-colors"
                      >
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold shrink-0">
                              {u.username?.[0]?.toUpperCase() || "?"}
                            </div>
                            <div className="min-w-0 max-w-45">
                              <Link
                                to={`/users/${u.userId}`}
                                className="text-sm font-medium text-white truncate block hover:text-orange-400 transition-colors"
                              >
                                {u.username || "—"}
                              </Link>
                              <div className="flex items-center gap-1 text-xs text-gray-500">
                                <Mail size={12} />
                                <span className="truncate">{u.email}</span>
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <span
                            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                              u.role === "admin"
                                ? "bg-red-500/10 text-red-400"
                                : u.role === "moderator"
                                  ? "bg-blue-500/10 text-blue-400"
                                  : "bg-green-500/10 text-green-400"
                            }`}
                          >
                            {u.role === "admin" ? (
                              <ShieldCheck size={12} />
                            ) : u.role === "moderator" ? (
                              <Shield size={12} />
                            ) : null}
                            {u.role === "admin"
                              ? "Админ"
                              : u.role === "moderator"
                                ? "Модератор"
                                : "Пользователь"}
                          </span>
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          {u.isPro ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                              <Crown size={12} />
                              Pro
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500">Free</span>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden sm:table-cell">
                          {u.isDonor ? (
                            <DonorBadge size="sm" />
                          ) : (
                            <span className="text-xs text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-400 hidden md:table-cell">
                          {formatRelativeTime(u.lastActivityAt)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-400 hidden lg:table-cell">
                          {formatTotalMinutes(u.totalActiveMinutes)}
                        </td>
                        <td className="px-4 py-4 text-sm text-gray-400 hidden lg:table-cell">
                          <span className="inline-flex items-center gap-1.5">
                            <Calendar size={12} />
                            {formatDate(u.createdAt)}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right whitespace-nowrap">
                          {canChangeRole && (
                            <button
                              onClick={async () => {
                                try {
                                  await apiSetDonorStatus(u.userId, !u.isDonor)
                                  queryClient.invalidateQueries({ queryKey: ["admin-users"] })
                                  sileo.success({
                                    title: u.isDonor ? "Статус мецената снят" : "Статус мецената присвоен",
                                    duration: 3000,
                                  })
                                } catch {
                                  sileo.error({ title: "Ошибка", duration: 3000 })
                                }
                              }}
                              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-xs font-medium border transition-colors cursor-pointer ${
                                u.isDonor
                                  ? "bg-amber-500/15 text-amber-400 border-amber-500/25 hover:bg-amber-500/25"
                                  : "bg-white/5 text-gray-400 border-gray-700 hover:bg-white/10"
                              }`}
                              type="button"
                              title={u.isDonor ? "Снять статус мецената" : "Присвоить статус мецената"}
                            >
                              <Heart size={12} />
                              {u.isDonor ? "Снять" : "Меценат"}
                            </button>
                          )}
                          {canChangeRole && u.userId !== currentUser?.userId ? (
                            <select
                              value={u.role}
                              onChange={(e) => {
                                const newRole = e.target.value as Role
                                if (newRole !== u.role) {
                                  setConfirmTarget({
                                    userId: u.userId,
                                    username: u.username || u.email,
                                    currentRole: u.role as Role,
                                    newRole,
                                  })
                                }
                              }}
                              disabled={changingUserId === u.userId}
                              className="ml-2 bg-white/10 border border-gray-700 rounded-lg px-2 py-1 text-sm text-white cursor-pointer focus:outline-none focus:border-gray-500 disabled:opacity-50"
                            >
                              {ROLES.map((r) => (
                                <option key={r} value={r} className="bg-[#1a1a2e]">
                                  {ROLE_LABELS[r]}
                                </option>
                              ))}
                            </select>
                          ) : canChangeRole &&
                            u.userId === currentUser?.userId ? (
                            <span className="ml-2 text-xs text-gray-500 italic">
                              Это вы
                            </span>
                          ) : (
                            <span className="text-xs text-gray-500 italic">
                              —
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-4 text-xs text-gray-500">
              Всего пользователей: {users.length} · Показано:{" "}
              {filteredUsers.length}
            </p>
          </>
        ) : activeTab === "violators" ? (
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-gray-800">
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Пользователь
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Роль
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Нарушения
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {violatorsLoading ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      Загрузка...
                    </td>
                  </tr>
                ) : violators.length === 0 ? (
                  <tr>
                    <td
                      colSpan={4}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      Нарушители не найдены
                    </td>
                  </tr>
                ) : (
                  violators.map((v) => (
                    <tr
                      key={v.userId}
                      className="hover:bg-white/2 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {v.username?.[0]?.toUpperCase() || "?"}
                          </div>
                          <div className="min-w-0">
                            <Link
                              to={`/users/${v.userId}`}
                              className="text-sm font-medium text-white truncate hover:text-orange-400 transition-colors"
                            >
                              {v.username || "—"}
                            </Link>
                            <div className="flex items-center gap-1 text-xs text-gray-500">
                              <Mail size={12} />
                              <span className="truncate">{v.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            v.role === "admin"
                              ? "bg-red-500/10 text-red-400"
                              : v.role === "moderator"
                                ? "bg-blue-500/10 text-blue-400"
                                : "bg-green-500/10 text-green-400"
                          }`}
                        >
                          {v.role === "admin" ? (
                            <ShieldCheck size={12} />
                          ) : v.role === "moderator" ? (
                            <Shield size={12} />
                          ) : null}
                          {ROLE_LABELS[v.role as Role] || "Пользователь"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-wrap gap-1.5">
                          {v.warningsCount > 0 && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400 border border-amber-500/30">
                              <AlertTriangle size={10} />
                              {v.warningsCount} пред.
                            </span>
                          )}
                          {v.actions.some((a) => a.type === "suspension") && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30">
                              <Ban size={10} />
                              Блокировка
                            </span>
                          )}
                          {v.actions.some((a) => a.type === "chat_ban") && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-400 border border-purple-500/30">
                              <UserX size={10} />
                              Чат-бан
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-2 max-w-sm">
                          {v.actions.map((a, i) => (
                            <div
                              key={i}
                              className="flex items-start gap-2 text-xs"
                            >
                              <span
                                className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded shrink-0 text-xs font-medium border ${ACTION_COLORS[a.type]}`}
                              >
                                {actionIcon(a.type)}
                                {ACTION_LABELS[a.type]}
                              </span>
                              <div className="min-w-0 text-gray-400 leading-tight">
                                <div>
                                  {formatDateTime(a.date)}
                                  {a.until
                                    ? ` — ${getDuration(a.date, a.until)}`
                                    : ""}
                                </div>
                                {a.reason && (
                                  <div
                                    className="text-gray-500 truncate max-w-50"
                                    title={a.reason}
                                  >
                                    {a.reason}
                                  </div>
                                )}
                                {a.moderator && (
                                  <div className="text-gray-500">
                                    Мод: {a.moderator.username}
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                          {v.actions.length === 0 && (
                            <span className="text-xs text-gray-500 italic">
                              Нет действий
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="rounded-xl border border-gray-800 overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5 border-b border-gray-800">
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Пользователь
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Изображение
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Тип
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">
                    NSFW
                  </th>
                  <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Дата
                  </th>
                  <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {flagsLoading ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      Загрузка...
                    </td>
                  </tr>
                ) : flags.length === 0 ? (
                  <tr>
                    <td
                      colSpan={6}
                      className="px-6 py-12 text-center text-sm text-gray-500"
                    >
                      Активных жалоб нет
                    </td>
                  </tr>
                ) : (
                  flags.map((f) => (
                    <tr
                      key={f.id}
                      className="hover:bg-white/2 transition-colors"
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold shrink-0">
                            {f.avatarUrl ? (
                              <img
                                src={f.avatarUrl}
                                alt=""
                                className="w-full h-full rounded-full object-cover"
                              />
                            ) : (
                              f.username?.[0]?.toUpperCase() || "?"
                            )}
                          </div>
                          <span className="text-sm font-medium text-white">
                            {f.username || "—"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="w-16 h-20 rounded-lg bg-white/5 overflow-hidden border border-gray-700">
                          <img
                            src={f.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                            loading="lazy"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                          {f.flagType === "avatar"
                            ? "Аватар"
                            : f.flagType === "tier_cover"
                              ? "Обложка"
                              : f.flagType === "book-cover"
                                ? "Обложка книги"
                                : f.flagType}
                        </span>
                      </td>
                      <td className="px-6 py-4 hidden md:table-cell">
                        {f.nsfwScore != null ? (
                          <span
                            className={`inline-flex items-center gap-1 text-xs font-medium ${
                              f.nsfwScore >= 0.8
                                ? "text-red-400"
                                : f.nsfwScore >= 0.5
                                  ? "text-amber-400"
                                  : "text-green-400"
                            }`}
                          >
                            {Math.round(f.nsfwScore * 100)}%
                          </span>
                        ) : (
                          <span className="text-xs text-gray-500">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-400">
                        {formatDate(f.createdAt)}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() =>
                              resolveFlagMut.mutate({
                                id: f.id,
                                action: "dismissed",
                              })
                            }
                            disabled={resolveFlagMut.isPending}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-white/5 text-gray-400 border border-gray-700 hover:bg-white/10 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Отклонить
                          </button>
                          <button
                            onClick={() =>
                              resolveFlagMut.mutate({
                                id: f.id,
                                action: "resolved",
                              })
                            }
                            disabled={resolveFlagMut.isPending}
                            className="px-3 py-1.5 text-xs font-medium rounded-lg bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Удалить
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {confirmTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={() => {
            setConfirmTarget(null)
            setAdminPassword("")
          }}
        >
          <div
            className="bg-[#1a1a2e] border border-gray-700 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-5">
              <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center shrink-0">
                <AlertTriangle size={20} className="text-amber-400" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">
                  Подтверждение смены роли
                </h3>
                <p className="text-sm text-gray-400">
                  Введите ваш пароль для подтверждения
                </p>
              </div>
              <button
                onClick={() => {
                  setConfirmTarget(null)
                  setAdminPassword("")
                }}
                className="ml-auto text-gray-500 hover:text-white transition-colors cursor-pointer"
              >
                <X size={20} />
              </button>
            </div>

            <div className="bg-white/5 rounded-lg p-4 mb-5 space-y-1">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Пользователь:</span>
                <span className="text-white font-medium">
                  {confirmTarget.username}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Текущая роль:</span>
                <span className="text-white font-medium">
                  {ROLE_LABELS[confirmTarget.currentRole]}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Новая роль:</span>
                <span
                  className={`font-medium ${
                    confirmTarget.newRole === "admin"
                      ? "text-red-400"
                      : confirmTarget.newRole === "moderator"
                        ? "text-blue-400"
                        : "text-green-400"
                  }`}
                >
                  {ROLE_LABELS[confirmTarget.newRole]}
                </span>
              </div>
            </div>

            <div className="mb-5">
              <label className="block text-sm text-gray-400 mb-1.5 font-medium">
                Секретный код
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Введите секретный код"
                className="w-full bg-white/10 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && adminPassword) {
                    handleRoleChange()
                  }
                }}
              />
              <p className="mt-1 text-xs text-gray-500">
                Код для смены ролей, заданный в настройках сервера
              </p>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setConfirmTarget(null)
                  setAdminPassword("")
                }}
                className="flex-1 px-4 py-2.5 rounded-lg border border-gray-700 text-sm text-gray-300 hover:text-white hover:border-gray-500 transition-colors cursor-pointer"
              >
                Отмена
              </button>
              <button
                onClick={handleRoleChange}
                disabled={
                  changingUserId === confirmTarget.userId || !adminPassword
                }
                className="flex-1 px-4 py-2.5 rounded-lg bg-amber-500/20 border border-amber-500/30 text-sm font-medium text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
              >
                {changingUserId === confirmTarget.userId
                  ? "Сохранение..."
                  : "Подтвердить"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
