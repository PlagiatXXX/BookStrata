import { useEffect, memo, useCallback, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Search, Users, Swords, MessageSquare, MessageSquareText, Plus, Pin, Trash2 } from "lucide-react";
import { SEOHead } from "@/components/SEO/SEOHead";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { BattleList } from "./components/BattleList";
import { DiscussionSection } from "@/components/DiscussionSection/DiscussionSection";
import { CuratorApplyModal } from "@/components/CuratorApplyModal/CuratorApplyModal";
import { getForumStats } from "@/lib/battlesApi";
import { getTopics, createTopic, pinTopic, deleteTopic } from "@/lib/discussionApi";
import { UserSearchSection } from "./components/UserSearchSection";
import { useAuth } from "@/hooks/useAuthContext";
import { useBodyScrollLock } from "@/hooks/useBodyScrollLock";
import { Spinner } from "@/components/Spinner";
import type { DiscussionTopic } from "@/types/discussions";
import "./ForumPage.css";

const MemoizedBattleList = memo(BattleList);

export default function ForumPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { user, isAuthenticated } = useAuth();
  const [showCuratorModal, setShowCuratorModal] = useState(false);
  const activeTab = (searchParams.get("tab") as "battles" | "discussions" | "forum" | "users") || "battles";
  const [selectedTopic, setSelectedTopic] = useState<{ id: string } | null>(null);
  const [showCreateTopic, setShowCreateTopic] = useState(false);
  const [topicTitle, setTopicTitle] = useState("");
  const [creating, setCreating] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [pinning, setPinning] = useState<string | null>(null);
  useBodyScrollLock(!!deleteConfirm || showCreateTopic)

  const isMod = user?.role === "admin" || user?.role === "moderator";

  const { data: topics, isLoading: topicsLoading, refetch: refetchTopics } = useQuery({
    queryKey: ["discussionTopics"],
    queryFn: getTopics,
    enabled: activeTab === "discussions" || activeTab === "forum",
    staleTime: 30_000,
  });

  useEffect(() => {
    const elements = Array.from(
      document.querySelectorAll<HTMLElement>("[data-reveal]"),
    );
    if (elements.length === 0) return;

    // Если пользователь предпочитает уменьшенное движение — показываем сразу
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      elements.forEach((el) => el.classList.add('reveal--visible'));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("reveal--visible");
            observer.unobserve(entry.target);
          }
        });
      },
      { rootMargin: "0px 0px -10% 0px", threshold: 0.15 },
    );

    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  const { data: forumStats, isLoading: statsLoading } = useQuery({
    queryKey: ["forumStats"],
    queryFn: getForumStats,
    refetchOnWindowFocus: true,
    staleTime: 60_000,
  });

  const formatCount = (count: number): string => {
    if (count >= 1000) {
      return (count / 1000).toFixed(1).replace(/\.0$/, "") + "k";
    }
    return String(count);
  };

  const goToTab = useCallback((tab: string) => {
    setSearchParams({ tab }, { replace: true });
  }, [setSearchParams]);

  const handleCreateTopic = async () => {
    const text = topicTitle.trim();
    if (!text || creating) return;
    setCreating(true);
    try {
      const newTopic = await createTopic(text);
      setTopicTitle("");
      setShowCreateTopic(false);
      setSelectedTopic({ id: newTopic.id });
goToTab("forum");
      refetchTopics();
    } catch {
      // ignore
    } finally {
      setCreating(false);
    }
  };

  const handleSelectTopic = (topic: DiscussionTopic) => {
    window.scrollTo(0, 0);
    setSelectedTopic({ id: topic.id });
  };

  const handleBackFromTopic = () => {
    window.scrollTo(0, 0);
    setSelectedTopic(null);
    refetchTopics();
  };

  const handlePinTopic = async (e: React.MouseEvent, topicId: string) => {
    e.stopPropagation();
    setPinning(topicId);
    try {
      await pinTopic(topicId);
      refetchTopics();
    } catch {
      // ignore
    } finally {
      setPinning(null);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    setDeleteConfirm(null);
    try {
      await deleteTopic(topicId);
      refetchTopics();
    } catch {
      // ignore
    }
  };

  const formatDate = (iso: string) => {
    const d = new Date(iso);
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    if (d.toDateString() === today.toDateString()) {
      return d.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
    }
    if (d.toDateString() === yesterday.toDateString()) return "Вчера";
    return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
  };

  return (
    <DashboardLayout
      showTemplatesNav={true}
      showSearch={false}
      activeItem={undefined}
      bgVariant="dark"
    >
      <SEOHead
        title="Форум и битвы шаблонов"
        description="Участвуйте в битвах шаблонов тир-листов, обсуждайте книжные рейтинги и находите единомышленников в сообществе BookStrata."
        url="/forum"
      />
      <div className="forum-shell min-h-screen">
        <main className="max-w-7xl mx-auto px-6 py-14 pb-20 cursor-default text-(--ink-0)">
          {/* Forum Header / Hero */}
          <section className="mb-16 reveal" data-reveal>
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-4 text-[10px] font-bold uppercase tracking-[0.3em] text-(--accent-main)">
                  <Users size={14} />
                  BookStrata Community
                </div>
                <h1 className="community-heading text-3xl font-black leading-[0.9] tracking-tighter mb-6 uppercase italic sm:text-4xl md:text-6xl lg:text-7xl">
                  Центр{" "}
                  <span className="heading-word-wrap">
                    <span className={activeTab === "battles" ? "" : "text-(--accent-main)"}>активностей</span>
                    {activeTab === "battles" && (
                      <img src="/bookstrasz-character.webp" alt="" className="heading-character" />
                    )}
                    {activeTab === "discussions" && (
                      <img src="/chat.webp" alt="" className="heading-character" />
                    )}
                  </span>
                </h1>
                <p className="text-(--ink-1) max-w-xl text-base md:text-lg leading-relaxed font-medium">
                  Здесь кипит жизнь: участвуйте в битвах шаблонов, обсуждайте рейтинги
                  и находите единомышленников.
                </p>
              </div>

              <div className="flex gap-4 overflow-x-auto">
                <div className="forum-stat-card brutal-card brutal-border p-4 min-w-[120px]">
                  <div className="text-2xl font-black mb-1">
                    {statsLoading ? <Spinner size="sm" /> : formatCount(forumStats?.totalUsers ?? 0)}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1)">Участников</div>
                </div>
                <div className="forum-stat-card brutal-card brutal-border p-4 min-w-[120px]">
                  <div className="text-2xl font-black mb-1">
                    {statsLoading ? <Spinner size="sm" /> : forumStats?.activeBattles ?? 0}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-widest text-(--ink-1)">Активных битв</div>
                </div>
              </div>
            </div>
          </section>

          {/* Activity Tabs */}
          <div className="flex items-center gap-6 mb-12 border-b border-(--line-soft) overflow-x-auto no-scrollbar reveal" data-reveal>
             <button
                onClick={() => { goToTab("battles"); setSelectedTopic(null); }}
               className={`forum-tab flex items-center gap-2 py-4 px-2 text-xs font-bold uppercase tracking-widest border-b-4 transition-colors ${
                 activeTab === "battles"
                   ? "border-(--accent-main) text-(--ink-0)"
                   : "border-transparent text-(--ink-1) hover:text-(--ink-0)"
               }`}
             >
                <Swords size={16} />
               Битвы
             </button>
             <button
                 onClick={() => { goToTab("discussions"); setSelectedTopic(null); }}
                className={`forum-tab flex items-center gap-2 py-4 px-2 text-xs font-bold uppercase tracking-widest border-b-4 transition-colors ${
                  activeTab === "discussions"
                    ? "border-(--accent-main) text-(--ink-0)"
                    : "border-transparent text-(--ink-1) hover:text-(--ink-0)"
                }`}
             >
                <MessageSquare size={16} />
               Обсуждения
             </button>
             <button
                 onClick={() => { goToTab("users"); setSelectedTopic(null); }}
                className={`forum-tab flex items-center gap-2 py-4 px-2 text-xs font-bold uppercase tracking-widest border-b-4 transition-colors ${
                  activeTab === "users"
                    ? "border-(--accent-main) text-(--ink-0)"
                    : "border-transparent text-(--ink-1) hover:text-(--ink-0)"
                }`}
             >
                <Search size={16} />
               Пользователи
             </button>
             <button
                 onClick={() => { goToTab("forum"); setSelectedTopic(null); }}
               className={`forum-tab forum-tab--forum flex items-center gap-2 py-4 px-2 text-xs font-bold uppercase tracking-widest border-b-4 transition-colors ${
                 activeTab === "forum"
                   ? "border-(--accent-main) text-(--ink-0)"
                   : "border-transparent text-(--ink-1) hover:text-(--ink-0)"
               }`}
             >
                <MessageSquareText size={16} />
                Форум
             </button>
          </div>

          <div className="forum-tab-content">
          {activeTab === "battles" ? (
            <MemoizedBattleList />
          ) : activeTab === "forum" ? (
            /* Forum tab: topic list or topic chat */
            selectedTopic ? (
              <DiscussionSection variant="topic" discussionId={selectedTopic.id} onBack={handleBackFromTopic} />
            ) : (
              <div className="forum-topic-list-full">
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-lg font-bold uppercase tracking-wider text-(--ink-1)">Темы форума</h2>
                  {isAuthenticated && (
                    <button
                      onClick={() => setShowCreateTopic(true)}
                      className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-(--accent-main) text-white hover:opacity-85 transition-opacity"
                    >
                      <Plus size={14} />
                      Создать
                    </button>
                  )}
                </div>

                {topicsLoading ? (
                  <div className="flex justify-center py-12"><Spinner size="md" /></div>
                ) : topics && topics.length > 0 ? (
                  <div className="forum-topics-list">
                    {topics.map((topic) => (
                      <div key={topic.id} className="forum-topic-row">
                        <button onClick={() => handleSelectTopic(topic)} className="forum-topic-row-main">
                          <div className="forum-topic-icon">
                            {topic.pinned ? <Pin size={16} /> : <MessageSquare size={20} />}
                          </div>
                          <div className="forum-topic-info">
                            <span className="forum-topic-title">
                              {topic.title}
                              {topic.pinned && <span className="forum-topic-pinned-badge">Закреплено</span>}
                            </span>
                            <span className="forum-topic-meta">
                              {topic.author?.username && (
                                <span
                                  onClick={(e) => { e.stopPropagation(); navigate(`/users/${topic.author!.id}`) }}
                                  className="hover:text-(--accent-main) transition-colors cursor-pointer"
                                >
                                  {topic.author.username}
                                </span>
                              )}
                              {" · "}
                              {topic._count?.messages ?? 0} сообщ.
                              {topic.lastMessageAt && ` · ${formatDate(topic.lastMessageAt)}`}
                            </span>
                          </div>
                        </button>
                        {isMod && (
                          <div className="forum-topic-actions">
                            <button
                              onClick={(e) => handlePinTopic(e, topic.id)}
                              disabled={pinning === topic.id}
                              className={`forum-topic-action-btn ${topic.pinned ? "forum-topic-action-btn--pinned" : ""}`}
                              title={topic.pinned ? "Открепить" : "Закрепить"}
                            >
                              {pinning === topic.id ? <Spinner size="sm" /> : <Pin size={14} />}
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); setDeleteConfirm(topic.id) }}
                              className="forum-topic-action-btn forum-topic-action-btn--delete"
                              title="Удалить тему"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-(--ink-1) text-sm text-center py-8">Пока нет созданных тем</p>
                )}
              </div>
            )
          ) : activeTab === "users" ? (
            <UserSearchSection />
          ) : (
            /* Discussions tab: general chat (mobile) or two-column layout (desktop) */
            <div className="forum-discussions-grid">
              <div className="forum-leftpanel">
                <DiscussionSection
                  variant={selectedTopic ? "topic" : "general"}
                  discussionId={selectedTopic?.id}
                  onBack={selectedTopic ? handleBackFromTopic : undefined}
                />
              </div>
              <div className="forum-rightpanel forum-rightpanel--desktop">
                <div className="forum-topic-list">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-lg font-bold uppercase tracking-wider text-(--ink-1)">Темы</h2>
                    {isAuthenticated && (
                      <button
                        onClick={() => setShowCreateTopic(true)}
                        className="flex items-center gap-2 px-4 py-2 text-xs font-bold uppercase tracking-widest rounded-lg bg-(--accent-main) text-white hover:opacity-85 transition-opacity"
                      >
                        <Plus size={14} />
                        Создать
                      </button>
                    )}
                  </div>

                  {topicsLoading ? (
                    <div className="flex justify-center py-12"><Spinner size="md" /></div>
                  ) : topics && topics.length > 0 ? (
                    <div className="forum-topics-list">
                      {topics.map((topic) => (
                        <div key={topic.id} className={`forum-topic-row ${selectedTopic?.id === topic.id ? "forum-topic-row--active" : ""}`}>
                          <button onClick={() => handleSelectTopic(topic)} className="forum-topic-row-main">
                            <div className="forum-topic-icon">
                              {topic.pinned ? <Pin size={16} /> : <MessageSquare size={20} />}
                            </div>
                            <div className="forum-topic-info">
                              <span className="forum-topic-title">
                                {topic.title}
                                {topic.pinned && <span className="forum-topic-pinned-badge">Закреплено</span>}
                              </span>
                              <span className="forum-topic-meta">
                                {topic.author?.username && (
                                <span
                                  onClick={(e) => { e.stopPropagation(); navigate(`/users/${topic.author!.id}`) }}
                                  className="hover:text-(--accent-main) transition-colors cursor-pointer"
                                >
                                    {topic.author.username}
                                  </span>
                                )}
                                {" · "}
                                {topic._count?.messages ?? 0} сообщ.
                                {topic.lastMessageAt && ` · ${formatDate(topic.lastMessageAt)}`}
                              </span>
                            </div>
                          </button>
                          {isMod && (
                            <div className="forum-topic-actions">
                              <button
                                onClick={(e) => handlePinTopic(e, topic.id)}
                                disabled={pinning === topic.id}
                                className={`forum-topic-action-btn ${topic.pinned ? "forum-topic-action-btn--pinned" : ""}`}
                                title={topic.pinned ? "Открепить" : "Закрепить"}
                              >
                                {pinning === topic.id ? <Spinner size="sm" /> : <Pin size={14} />}
                              </button>
                              <button
                                onClick={(e) => { e.stopPropagation(); setDeleteConfirm(topic.id) }}
                                className="forum-topic-action-btn forum-topic-action-btn--delete"
                                title="Удалить тему"
                              >
                                <Trash2 size={14} />
                              </button>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-(--ink-1) text-sm text-center py-8">Пока нет созданных тем</p>
                  )}
                </div>
              </div>
            </div>
          )}
          </div>

          {/* Delete confirmation */}
          {deleteConfirm && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setDeleteConfirm(null)}>
              <div className="bg-(--bg-1) rounded-xl p-6 w-full max-w-sm mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-2">Удалить тему?</h3>
                <p className="text-sm text-(--ink-1) mb-6">Все сообщения в теме будут удалены. Это действие нельзя отменить.</p>
                <div className="flex justify-end gap-3">
                  <button onClick={() => setDeleteConfirm(null)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-(--ink-1) hover:text-(--ink-0) transition-colors">Отмена</button>
                  <button onClick={() => handleDeleteTopic(deleteConfirm)} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-red-600 text-white hover:opacity-85 transition-opacity">Удалить</button>
                </div>
              </div>
            </div>
          )}

          {/* Create Topic Modal */}
          {showCreateTopic && (
            <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={() => setShowCreateTopic(false)}>
              <div className="bg-(--bg-1) rounded-xl p-6 w-full max-w-md mx-4" onClick={(e) => e.stopPropagation()}>
                <h3 className="text-lg font-bold mb-4">Создать тему</h3>
                <input
                  autoFocus
                  value={topicTitle}
                  onChange={(e) => setTopicTitle(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleCreateTopic() }}
                  placeholder="Название темы..."
                  className="w-full bg-(--bg-2) border border-(--line-soft) rounded-lg px-4 py-2.5 text-sm text-(--ink-0) outline-none mb-4 focus:border-(--accent-main)"
                />
                <div className="flex justify-end gap-3">
                  <button onClick={() => { setShowCreateTopic(false); setTopicTitle(""); }} className="px-4 py-2 text-xs font-bold uppercase tracking-wider text-(--ink-1) hover:text-(--ink-0) transition-colors">Отмена</button>
                  <button onClick={handleCreateTopic} disabled={!topicTitle.trim() || creating} className="px-4 py-2 text-xs font-bold uppercase tracking-wider rounded-lg bg-(--accent-main) text-white hover:opacity-85 transition-opacity disabled:opacity-30">
                    {creating ? <Spinner size="sm" /> : "Создать"}
                  </button>
                </div>
              </div>
            </div>
          )}

           {/* Bottom Call to Action */}
          {activeTab === "battles" && (
          <section className="mt-24">
            <div className="brutal-card brutal-border bg-(--ink-0) text-(--bg-0) p-10 md:p-16 relative overflow-hidden">
               <div className="relative z-10 max-w-2xl">
                 <h2 className="community-heading text-2xl font-black mb-6 leading-tight uppercase sm:text-3xl md:text-5xl text-(--accent-main)">
                   Хотите запустить <br/> свою битву?
                 </h2>
                 <p className="text-white/70 mb-8 text-sm md:text-base font-medium leading-relaxed">
                   Организуйте соревнование по своему любимому шаблону.
                   Ведите дискуссии и узнавайте мнение других людей.
                   Победители противостояния и лучшие шаблоны будут получать особые отметки.
                 </p>
                   {isAuthenticated && (
                    <button
                      onClick={() => setShowCuratorModal(true)}
                      className="brutal-cta bg-(--bg-0) text-(--ink-0) px-10 py-4 font-bold uppercase tracking-widest text-xs hover:bg-(--accent-main)"
                    >
                      Подать заявку
                    </button>
                   )}
               </div>

               <div className="absolute top-1/2 right-[-5%] -translate-y-1/2 opacity-10 pointer-events-none hidden lg:block">
                 <Users size={400} />
              </div>
            </div>
          </section>
          )}

          {showCuratorModal && (
            <CuratorApplyModal
              onClose={() => setShowCuratorModal(false)}
              onSuccess={() => setShowCuratorModal(false)}
            />
          )}
        </main>
      </div>
    </DashboardLayout>
  );
}
