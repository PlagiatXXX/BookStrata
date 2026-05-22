import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import type { AdminUser } from "@/types/auth";
import { sileo } from "sileo";
import { Users, Crown, Clock, Shield, ArrowLeft } from "lucide-react";

// Убираем дублирующий интерфейс — используем AdminUser из types/auth
interface SubscriptionStats {
  totalProUsers: number;
  activeSubscriptions: number;
  lifetimeSubscriptions: number;
  expiringSoon: number;
}

// Алиас для совместимости с остальным кодом
type UserSubscription = AdminUser;

// Типы для ответов API подписок
interface SetProStatusResponse {
  userId: number;
  isPro: boolean;
  proExpiresAt: string | null;
}

interface ActivateProResponse {
  userId: number;
  isPro: boolean;
  proExpiresAt: string;
}

export default function AdminSubscriptionsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [filter, setFilter] = useState<"all" | "pro" | "free">("all");
  const queryClient = useQueryClient();

  // Загрузка всех пользователей
  const { data: users = [], isLoading } = useQuery<AdminUser[]>({
    queryKey: ["admin-users"],
    queryFn: () => api.get<AdminUser[]>("/users/admin/all"),
  });

  // Загрузка статистики
  const { data: stats } = useQuery<SubscriptionStats>({
    queryKey: ["subscription-stats"],
    queryFn: () => api.get<SubscriptionStats>("/subscriptions/stats"),
  });

  // Мутация для установки Pro статуса
  const setProStatus = useMutation({
    mutationFn: ({
      userId,
      isPro,
      expiresAt,
    }: {
      userId: number;
      isPro: boolean;
      expiresAt?: string | null;
    }) =>
      api.post<SetProStatusResponse>("/subscriptions/set-status", {
        userId,
        isPro,
        expiresAt,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-stats"] });
      sileo.success({
        title: "Статус подписки обновлён",
        duration: 3000,
      });
    },
    onError: () => {
      sileo.error({
        title: "Ошибка при обновлении статуса",
        description: "Попробуйте обновить статус еще раз",
        duration: 3000,
      });
    },
  });

  // Мутация для активации Pro на период
  const activatePro = useMutation({
    mutationFn: ({
      userId,
      durationDays,
    }: {
      userId: number;
      durationDays: number;
    }) =>
      api.post<ActivateProResponse>("/subscriptions/activate", {
        userId,
        durationDays,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      queryClient.invalidateQueries({ queryKey: ["subscription-stats"] });
      sileo.success({
        title: "Pro подписка активирована",
        duration: 3000,
      });
    },
    onError: (error: Error) => {
      sileo.error({
        title: "Ошибка при активации",
        description: error.message || "Попробуйте еще раз",
        duration: 3000,
      });
    },
  });

  // Фильтрация пользователей
  const filteredUsers = users.filter((user) => {
    const matchesSearch =
      user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesFilter =
      filter === "all" ||
      (filter === "pro" && user.isPro) ||
      (filter === "free" && !user.isPro);
    return matchesSearch && matchesFilter;
  });

  const formatDate = (dateString: string | null) => {
    if (!dateString) return "—";
    return new Date(dateString).toLocaleDateString("ru-RU", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const getStatusBadge = (user: UserSubscription) => {
    if (!user.isPro) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
          <Shield className="h-3 w-3" />
          Free
        </span>
      );
    }

    const expiresAt = user.proExpiresAt ? new Date(user.proExpiresAt) : null;
    const now = new Date();
    const isExpired = expiresAt && expiresAt < now;
    const sevenDaysInMillis = 7 * 24 * 60 * 60 * 1000;
    const expiresSoon =
      expiresAt &&
      !isExpired &&
      expiresAt.getTime() - now.getTime() < sevenDaysInMillis;

    if (isExpired) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800">
          <Clock className="h-3 w-3" />
          Истёк
        </span>
      );
    }

    if (expiresSoon) {
      return (
        <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-medium text-amber-800">
          <Clock className="h-3 w-3" />
          Истекает
        </span>
      );
    }

    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-linear-to-r from-amber-400 to-orange-500 px-2.5 py-0.5 text-xs font-medium text-white shadow-sm">
        <Crown className="h-3 w-3" />
        Pro
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="mx-auto max-w-7xl">
        {/* Заголовок */}
        <div className="mb-8">
          <button
            onClick={() => navigate("/admin")}
            className="flex items-center gap-2 text-gray-500 hover:text-gray-900 transition-colors mb-4 cursor-pointer"
          >
            <ArrowLeft size={18} />
            <span className="text-sm">Назад в админку</span>
          </button>
          <h1 className="text-3xl font-bold text-gray-900">
            Управление подписками
          </h1>
          <p className="mt-2 text-sm text-gray-600">
            Админ-панель для управления Pro статусом пользователей
          </p>
        </div>

        {/* Статистика */}
        {stats && (
          <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Всего Pro</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats.totalProUsers}
                  </p>
                </div>
                <div className="rounded-full bg-amber-100 p-3">
                  <Crown className="h-6 w-6 text-amber-600" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Активные</p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats.activeSubscriptions}
                  </p>
                </div>
                <div className="rounded-full bg-green-100 p-3">
                  <Shield className="h-6 w-6 text-green-600" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Бессрочные
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats.lifetimeSubscriptions}
                  </p>
                </div>
                <div className="rounded-full bg-blue-100 p-3">
                  <Users className="h-6 w-6 text-blue-600" />
                </div>
              </div>
            </div>

            <div className="rounded-lg bg-white p-6 shadow-sm">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">
                    Истекают (7 дней)
                  </p>
                  <p className="mt-1 text-3xl font-semibold text-gray-900">
                    {stats.expiringSoon}
                  </p>
                </div>
                <div className="rounded-full bg-red-100 p-3">
                  <Clock className="h-6 w-6 text-red-600" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Фильтры и поиск */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilter("all")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                filter === "all"
                  ? "bg-gray-900 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Все
            </button>
            <button
              onClick={() => setFilter("pro")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                filter === "pro"
                  ? "bg-amber-500 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Pro
            </button>
            <button
              onClick={() => setFilter("free")}
              className={`rounded-md px-4 py-2 text-sm font-medium transition-colors ${
                filter === "free"
                  ? "bg-gray-200 text-gray-800"
                  : "bg-white text-gray-700 hover:bg-gray-100"
              }`}
            >
              Free
            </button>
          </div>

          <input
            type="text"
            placeholder="Поиск по имени или email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-gray-500 focus:outline-none sm:max-w-xs"
          />
        </div>

        {/* Таблица пользователей */}
        <div className="rounded-lg bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Пользователь
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Статус
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Истекает
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                    Роль
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium uppercase tracking-wider text-gray-500">
                    Действия
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 bg-white">
                {isLoading ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      Загрузка...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-6 py-8 text-center text-sm text-gray-500"
                    >
                      Пользователи не найдены
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => (
                    <tr key={user.userId} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="text-sm font-medium text-gray-900">
                            {user.username || "—"}
                          </div>
                          <div className="text-sm text-gray-500">
                            {user.email}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {getStatusBadge(user)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(user.proExpiresAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.role || "user"}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        {user.isPro ? (
                          <button
                            onClick={() => {
                              if (confirm("Деактивировать Pro подписку?")) {
                                setProStatus.mutate({
                                  userId: user.userId,
                                  isPro: false,
                                });
                              }
                            }}
                            className="text-red-600 hover:text-red-900"
                          >
                            Деактивировать
                          </button>
                        ) : (
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={() =>
                                activatePro.mutate({
                                  userId: user.userId,
                                  durationDays: 30,
                                })
                              }
                              className="text-amber-600 hover:text-amber-900"
                              title="Активировать на 30 дней"
                            >
                              30 дн
                            </button>
                            <button
                              onClick={() =>
                                activatePro.mutate({
                                  userId: user.userId,
                                  durationDays: 90,
                                })
                              }
                              className="text-amber-600 hover:text-amber-900"
                              title="Активировать на 90 дней"
                            >
                              90 дн
                            </button>
                            <button
                              onClick={() => {
                                setProStatus.mutate({
                                  userId: user.userId,
                                  isPro: true,
                                  expiresAt: null,
                                });
                              }}
                              className="text-green-600 hover:text-green-900"
                              title="Бессрочная подписка"
                            >
                              ∞
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
