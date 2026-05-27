import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { ArrowLeft, Plus, Trash2, Heart } from 'lucide-react'
import { apiClient } from '@/lib/api-client'

interface DonorItem {
  id: number
  name: string
}

export function AdminDonorsPage() {
  const navigate = useNavigate()
  const [donors, setDonors] = useState<DonorItem[]>([])
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  const fetchDonors = async () => {
    try {
      const data = await apiClient.get<DonorItem[]>('/donors')
      setDonors(data)
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDonors()
  }, [])

  const handleAdd = async () => {
    const name = newName.trim()
    if (!name) return
    try {
      await apiClient.post('/donors', { name })
      setNewName('')
      await fetchDonors()
    } catch {
      // ignore
    }
  }

  const handleDelete = async (id: number) => {
    try {
      await apiClient.delete(`/donors/${id}`)
      setDonors((prev) => prev.filter((d) => d.id !== id))
    } catch {
      // ignore
    }
  }

  return (
    <div className="min-h-screen bg-[#0f0f1a] py-6 sm:py-10">
      <div className="max-w-2xl mx-auto px-4">
        <button
          onClick={() => navigate('/admin')}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-6 cursor-pointer"
        >
          <ArrowLeft size={20} />
          <span>Назад в админку</span>
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold text-white mb-2 sm:text-3xl">Донатеры</h1>
          <p className="text-gray-400">
            Имена отображаются в бегущей строке в футере сайта
          </p>
        </div>

        {/* Add form */}
        <div className="flex gap-3 mb-8">
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAdd()
            }}
            placeholder="Имя донатера..."
            className="flex-1 rounded-xl border border-gray-700 bg-gray-800/50 px-4 py-2.5 text-sm text-white placeholder:text-gray-500 outline-none focus:border-amber-500/50 transition-colors"
          />
          <button
            onClick={handleAdd}
            disabled={!newName.trim()}
            className="flex cursor-pointer items-center gap-2 rounded-xl bg-amber-500 px-5 py-2.5 text-sm font-bold text-black transition-colors hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus size={16} />
            Добавить
          </button>
        </div>

        {/* List */}
        {loading ? (
          <p className="text-gray-500 text-sm">Загрузка...</p>
        ) : donors.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-500">
            <Heart size={40} className="mb-4 opacity-30" />
            <p className="text-sm">Пока нет ни одного донатера</p>
          </div>
        ) : (
          <div className="space-y-2">
            {donors.map((donor) => (
              <div
                key={donor.id}
                className="flex items-center justify-between rounded-xl border border-gray-800 bg-gray-800/30 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  <Heart size={14} className="text-amber-500 shrink-0" />
                  <span className="text-sm font-medium text-gray-200">
                    {donor.name}
                  </span>
                </div>
                <button
                  onClick={() => handleDelete(donor.id)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs text-gray-500 transition-colors hover:bg-red-500/10 hover:text-red-400"
                >
                  <Trash2 size={13} />
                  Удалить
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
