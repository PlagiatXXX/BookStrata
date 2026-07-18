import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { Newspaper, BookOpen, Users, Crown, Sword, Heart, MessageCircle, BarChart3, ArrowLeft, ShieldAlert, MailQuestion } from 'lucide-react'
import { apiClient } from '@/lib/api-client'
import { useAuth } from '@/hooks/useAuthContext'
import type { AdminDashboardStats } from '@/../shared/types'

interface AdminSection {
  title: string
  description: string
  icon: typeof Newspaper
  path: string
  color: string
  borderColor: string
  textColor: string
  roles: string[]
  disabled?: boolean
}

const ALL_SECTIONS: AdminSection[] = [
  {
    title: 'Новости',
    description: 'Управление новостями и статьями',
    icon: Newspaper,
    path: '/admin/news',
    color: 'from-blue-500/20 to-blue-500/5',
    borderColor: 'border-blue-500/30',
    textColor: 'text-blue-500',
    roles: ['admin', 'moderator'],
  },
  {
    title: 'Коллекции',
    description: 'Управление коллекциями книг',
    icon: BookOpen,
    path: '/admin/collections',
    color: 'from-green-500/20 to-green-500/5',
    borderColor: 'border-green-500/30',
    textColor: 'text-green-500',
    roles: ['admin', 'moderator'],
  },
  {
    title: 'Знаменитости',
    description: 'Управление профилями знаменитостей',
    icon: Crown,
    path: '/admin/celebrities',
    color: 'from-yellow-500/20 to-yellow-500/5',
    borderColor: 'border-yellow-500/30',
    textColor: 'text-yellow-500',
    roles: ['admin', 'moderator'],
  },
  {
    title: 'Битвы',
    description: 'Управление битвами и заявками',
    icon: Sword,
    path: '/admin/battles',
    color: 'from-red-500/20 to-red-500/5',
    borderColor: 'border-red-500/30',
    textColor: 'text-red-500',
    roles: ['admin', 'moderator'],
  },
  {
    title: 'Пользователи',
    description: 'Управление ролями и пользователями',
    icon: Users,
    path: '/admin/users',
    color: 'from-purple-500/20 to-purple-500/5',
    borderColor: 'border-purple-500/30',
    textColor: 'text-purple-500',
    roles: ['admin'],
  },
  {
    title: 'Подписки',
    description: 'Управление Pro подписками',
    icon: Crown,
    path: '/admin/subscriptions',
    color: 'from-amber-500/20 to-amber-500/5',
    borderColor: 'border-amber-500/30',
    textColor: 'text-amber-500',
    roles: ['admin'],
    disabled: true,
  },
  {
    title: 'Донатеры',
    description: 'Управление бегущей строкой в футере',
    icon: Heart,
    path: '/admin/donors',
    color: 'from-pink-500/20 to-pink-500/5',
    borderColor: 'border-pink-500/30',
    textColor: 'text-pink-500',
    roles: ['admin'],
  },
  {
    title: 'Обратная связь',
    description: 'Сообщения и баги от пользователей',
    icon: MessageCircle,
    path: '/admin/feedback',
    color: 'from-violet-500/20 to-violet-500/5',
    borderColor: 'border-violet-500/30',
    textColor: 'text-violet-500',
    roles: ['admin'],
  },
  {
    title: 'Аналитика',
    description: 'События и действия пользователей',
    icon: BarChart3,
    path: '/admin/analytics',
    color: 'from-emerald-500/20 to-emerald-500/5',
    borderColor: 'border-emerald-500/30',
    textColor: 'text-emerald-500',
    roles: ['admin'],
  },
]

export default function AdminDashboard() {
  const navigate = useNavigate()
  const { user } = useAuth()

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['admin', 'stats'],
    queryFn: () => apiClient.get<AdminDashboardStats>('/admin/stats'),
    staleTime: 5 * 60 * 1000,
    retry: 2,
    enabled: user?.role === 'admin',
  })

  const visibleSections = ALL_SECTIONS.filter(
    (s) => user?.role && s.roles.includes(user.role),
  )

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-6 dark:bg-[#0f0f1a] light:bg-gray-100 sm:py-10">
      <div className="max-w-4xl mx-auto px-4">
        {/* Back to Home */}
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>На главную</span>
        </button>

        {/* Header */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 sm:text-3xl">Админ-панель</h1>
          <p className="text-gray-400">
            Управление контентом и пользователями
          </p>
        </div>

        {/* Admin Sections Grid */}
        <div className="grid gap-4 sm:grid-cols-2">
          {visibleSections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                key={section.path}
                onClick={() => !section.disabled && navigate(section.path)}
                className={`group flex flex-col items-start gap-4 p-6 rounded-xl bg-linear-to-br ${section.color} 
                  ${section.borderColor} border ${section.disabled ? 'opacity-50 cursor-not-allowed' : 'hover:border-opacity-60 transition-all cursor-pointer hover:scale-[1.02]'}
                  text-left w-full`}
              >
                <div className={`p-3 rounded-full bg-white/10 group-hover:bg-white/20 transition-colors`}>
                  <Icon size={24} className={section.textColor} />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className={`text-lg font-semibold ${section.textColor}`}>
                      {section.title}
                    </h3>

                  </div>
                  <p className="text-sm text-gray-400 mt-1">
                    {section.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Quick Stats (только для админа) */}
        {user?.role === 'admin' && (
          <div className="mt-8 p-6 rounded-xl bg-gray-800/50 border border-gray-700">
            <h2 className="text-lg font-semibold text-white mb-4">
              Быстрая статистика
            </h2>
            <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
              <div>
                <p className="text-gray-400">Всего пользователей</p>
                <p className="text-2xl font-bold text-white mt-1">
                    {isLoading ? '…' : error ? '—' : stats?.totalUsers}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Pro пользователей</p>
                <p className="text-2xl font-bold text-amber-500 mt-1">
                  {isLoading ? '…' : error ? '—' : stats?.proUsers}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Активных новостей</p>
                <p className="text-2xl font-bold text-blue-500 mt-1">
                  {isLoading ? '…' : error ? '—' : stats?.activeNews}
                </p>
              </div>
              <div>
                <p className="text-gray-400">Коллекций</p>
                <p className="text-2xl font-bold text-green-500 mt-1">
                  {isLoading ? '…' : error ? '—' : stats?.tierLists}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <ShieldAlert size={14} className="text-red-400" />
                  <p className="text-gray-400 text-sm">Нарушители</p>
                </div>
                <p className="text-2xl font-bold text-red-500 mt-1">
                  {isLoading ? '…' : error ? '—' : stats?.violators}
                </p>
              </div>
              <div>
                <div className="flex items-center gap-1.5">
                  <MailQuestion size={14} className="text-violet-400" />
                  <p className="text-gray-400 text-sm">Обращения</p>
                </div>
                <p className="text-2xl font-bold text-violet-500 mt-1">
                  {isLoading ? '…' : error ? '—' : stats?.feedbackCount}
                </p>
              </div>
            </div>
            {error && (
              <p className="text-xs text-red-400 mt-4">Ошибка загрузки: {error.message}</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
