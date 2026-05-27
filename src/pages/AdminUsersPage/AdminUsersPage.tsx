import { useState } from "react"
import { useNavigate } from "react-router-dom"
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
} from "lucide-react"
import { api } from "@/lib/api-client"
import { useAuth } from "@/hooks/useAuthContext"
import { sileo } from "sileo"
import type { AdminUser } from "@/types/auth"

const ROLES = ["admin", "moderator", "user"] as const
type Role = (typeof ROLES)[number]

const ROLE_LABELS: Record<Role, string> = {
  admin: "Админ",
  moderator: "Модератор",
  user: "Пользователь",
}

export function AdminUsersPage() {
  const navigate = useNavigate()
  const { user: currentUser } = useAuth()
  const queryClient = useQueryClient()
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

  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get<AdminUser[]>("/users/admin/all"),
  })

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
            Просмотр и управление ролями пользователей
          </p>
        </div>

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
                  Статус
                </th>
                <th className="text-left px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400 hidden md:table-cell">
                  Зарегистрирован
                </th>
                <th className="text-right px-6 py-4 text-xs font-semibold uppercase tracking-wider text-gray-400">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {isLoading ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Загрузка...
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td
                    colSpan={5}
                    className="px-6 py-12 text-center text-sm text-gray-500"
                  >
                    Пользователи не найдены
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr
                    key={u.userId}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-white text-sm font-bold shrink-0">
                          {u.username?.[0]?.toUpperCase() || "?"}
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-white truncate">
                            {u.username || "—"}
                          </div>
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <Mail size={12} />
                            <span className="truncate">{u.email}</span>
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
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
                    <td className="px-6 py-4">
                      {u.isPro ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium bg-amber-500/10 text-amber-400">
                          <Crown size={12} />
                          Pro
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500">Free</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-400 hidden md:table-cell">
                      <span className="inline-flex items-center gap-1.5">
                        <Calendar size={12} />
                        {formatDate(u.createdAt)}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
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
                          className="bg-white/10 border border-gray-700 rounded-lg px-3 py-1.5 text-sm text-white cursor-pointer focus:outline-none focus:border-gray-500 disabled:opacity-50"
                        >
                          {ROLES.map((r) => (
                            <option key={r} value={r} className="bg-[#1a1a2e]">
                              {ROLE_LABELS[r]}
                            </option>
                          ))}
                        </select>
                      ) : canChangeRole &&
                        u.userId === currentUser?.userId ? (
                        <span className="text-xs text-gray-500 italic">
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
                Ваш пароль
              </label>
              <input
                type="password"
                value={adminPassword}
                onChange={(e) => setAdminPassword(e.target.value)}
                placeholder="Введите пароль"
                className="w-full bg-white/10 border border-gray-700 rounded-lg px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-amber-500/50"
                autoFocus
                onKeyDown={(e) => {
                  if (e.key === "Enter" && adminPassword) {
                    handleRoleChange()
                  }
                }}
              />
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
