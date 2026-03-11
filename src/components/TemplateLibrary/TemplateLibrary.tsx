import React, { useEffect, useRef, useReducer } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { sileo } from 'sileo';

import { useUserTemplates, useDeleteTemplate } from '../../hooks/useTemplates';
import { useAuth } from '@/hooks/useAuthContext';
import { Button } from '@/ui/Button';
import { DeleteTemplateModal } from './DeleteTemplateModal';
import { Spinner } from '@/components/Spinner';
import { getPublicTierLists } from '@/lib/api';
import type { PaginatedTierListsResponse } from '@/lib/api';
import { apiGetLikedTierListIds } from '@/lib/likesApi';
import { Header } from '@/ui/Header';
import { Footer } from '@/ui/Footer';
import { EmptyState } from './components/EmptyState';
import {
  templateLibraryReducer,
  initialState,
  type SectionKey,
  type ViewMode,
} from './templateLibraryReducer';
import { useTemplateFilters } from './hooks/useTemplateFilters';
import { usePublicTierListsPagination } from './hooks/usePublicTierListsPagination';
import { TemplateLibraryHeader } from './components/TemplateLibraryHeader';
import { TemplateLibrarySidebar } from './components/TemplateLibrarySidebar';
import { TemplateLibraryToolbar } from './components/TemplateLibraryToolbar';
import { TemplateLibraryGrid } from './components/TemplateLibraryGrid';
import { PublicTierListsSection } from './components/PublicTierListsSection';
import { COVER_HEIGHTS, PUBLIC_PAGE_SIZE, PUBLIC_TIER_LISTS_STALE_TIME_MS, PUBLIC_TIER_LISTS_GC_TIME_MS } from './constants';
import type { Template } from '../../types/templates';

interface TemplateLibraryProps {
  searchQuery?: string;
  initialSection?: SectionKey;
}

const sortBy: 'updated_at' | 'likes' | 'created' = 'likes';

const TemplateLibrary: React.FC<TemplateLibraryProps> = ({
  searchQuery: initialSearchQuery = '',
  initialSection: initialSectionProp,
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  useAuth();

  const locationInitialSection = (location.state as { initialSection?: SectionKey } | null)?.initialSection;
  const defaultSection: SectionKey = locationInitialSection || initialSectionProp || 'private';

  const getInitialState = (): ReturnType<typeof templateLibraryReducer> => ({
    ...initialState,
    searchQuery: initialSearchQuery,
    activeSection: defaultSection,
  });

  const [state, dispatch] = useReducer(templateLibraryReducer, null, getInitialState);

  const {
    searchQuery,
    deleteModalOpen,
    templateToDelete,
    activeSection,
    activeCategory,
    viewMode,
    publicPage,
  } = state;

  const deleteIdRef = useRef<string | null>(null);

  // Обработчики навигации
  const handleGoBack = () => navigate('/');

  // Обработчики state
  const handleSearchChange = (query: string) => dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  const handleSectionChange = (section: SectionKey) => dispatch({ type: 'SET_ACTIVE_SECTION', payload: section });
  const handleCategoryChange = (category: string) => dispatch({ type: 'SET_ACTIVE_CATEGORY', payload: category });
  const handleViewModeChange = (mode: ViewMode) => dispatch({ type: 'SET_VIEW_MODE', payload: mode });
  const handlePageChange = (page: number) => dispatch({ type: 'SET_PUBLIC_PAGE', payload: page });

  const handleDeleteClick = (template: Template) => {
    dispatch({ type: 'OPEN_DELETE_MODAL', payload: template });
    deleteIdRef.current = template.id;
  };

  const handleDeleteModalClose = () => {
    dispatch({ type: 'CLOSE_DELETE_MODAL' });
    deleteIdRef.current = null;
  };

  const { data: templates, isLoading, isError, refetch: refetchTemplates } = useUserTemplates();
  const { mutate: deleteTemplate, isPending: isDeleting } = useDeleteTemplate();

  const {
    data: publicTierListsData,
    isLoading: isLoadingPublicTierLists,
    isFetching: isFetchingPublicTierLists,
    refetch,
  } = useQuery<PaginatedTierListsResponse, Error>({
    queryKey: ['publicTierListsSorted', sortBy, publicPage, PUBLIC_PAGE_SIZE],
    queryFn: async () => {
      const result = await getPublicTierLists(publicPage, PUBLIC_PAGE_SIZE, sortBy);
      return result;
    },
    staleTime: PUBLIC_TIER_LISTS_STALE_TIME_MS,
    gcTime: PUBLIC_TIER_LISTS_GC_TIME_MS,
  });

  useEffect(() => {
    if (publicPage > 1) {
      refetch();
    }
  }, [publicPage, refetch]);

  const { data: likedTierListIds } = useQuery({
    queryKey: ['likedTierListIds'],
    queryFn: () => apiGetLikedTierListIds(),
    refetchOnWindowFocus: true,
  });

  useEffect(() => {
    if (locationInitialSection) {
      window.history.replaceState({}, document.title);
    }
  }, []);

  // Хук фильтрации
  const { filteredTemplates, categories } = useTemplateFilters({
    templates,
    activeSection,
    activeCategory,
    searchQuery,
  });

  // Хук пагинации
  const { totalPages, hasNextPage, pageNumbers } = usePublicTierListsPagination({
    meta: publicTierListsData?.meta,
    currentPage: publicPage,
  });

  const likedIdsSet = new Set(likedTierListIds?.likedIds || []);
  const publicTierLists = publicTierListsData?.data || [];

  const handleDeleteConfirm = () => {
    const id = deleteIdRef.current;
    if (!id) return;

    deleteTemplate(id, {
      onSuccess: () => {
        sileo.success({ title: 'Шаблон успешно удален', duration: 3000 });
        handleDeleteModalClose();
      },
      onError: () => {
        sileo.error({
          title: 'Не удалось удалить шаблон',
          description: 'Попробуйте снова позже',
          duration: 3000,
        });
      },
    });
  };

  const handleEdit = (template: Template) => navigate(`/templates/${template.id}/edit`);

  const handleCreateClick = () => navigate('/templates/new');

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner size="lg" />
      </div>
    );
  }

  if (isError) {
    return (
      <div className="rounded-md border border-white/20 bg-black/35 py-8 text-center">
        <p className="mb-4 text-red-300">
          Ошибка загрузки шаблонов. Пожалуйста, попробуйте снова.
        </p>
        <Button onClick={() => refetchTemplates()} variant="primary">
          Повторить
        </Button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-dark">
      <Header
        onMyRatingsClick={handleGoBack}
        onSearch={handleSearchChange}
        searchValue={searchQuery}
        showTemplatesNav={true}
        showSearch={true}
        activeItem="Шаблоны"
      />
      <section className="relative min-h-screen pt-16">
        {/* Background gradients */}
        <div className="absolute inset-0 bg-[linear-gradient(165deg,rgba(4,25,38,0.95)_0%,rgba(7,31,43,0.92)_35%,rgba(2,19,32,0.95)_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_18%_14%,rgba(0,195,255,0.12),transparent_36%),radial-gradient(circle_at_84%_80%,rgba(31,124,158,0.1),transparent_38%)]" />

        <div className="relative px-4 pb-12 pt-8 lg:px-8">
          <div className="mx-auto max-w-7xl">
            {/* Header */}
            <TemplateLibraryHeader
              title="Библиотека шаблонов"
              description="Публичные тир-листы сообщества и ваши персональные шаблоны"
              onBackClick={handleGoBack}
            />

            {/* Main content */}
            <div className="grid gap-6 lg:grid-cols-[260px_1fr]">
              {/* Sidebar */}
              <TemplateLibrarySidebar
                activeSection={activeSection}
                activeCategory={activeCategory}
                categories={categories}
                onSectionChange={handleSectionChange}
                onCategoryChange={handleCategoryChange}
              />

              {/* Main content area */}
              <div className="w-full min-w-0">
                {/* Toolbar */}
                <TemplateLibraryToolbar
                  activeSection={activeSection}
                  viewMode={viewMode}
                  onViewModeChange={handleViewModeChange}
                  onCreateClick={handleCreateClick}
                />

                {/* Content */}
                {activeSection === 'public' ? (
                  <PublicTierListsSection
                    tierLists={publicTierLists}
                    likedIdsSet={likedIdsSet}
                    isLoading={isLoadingPublicTierLists}
                    isFetching={isFetchingPublicTierLists}
                    currentPage={publicPage}
                    totalPages={totalPages}
                    pageNumbers={pageNumbers}
                    hasNextPage={hasNextPage}
                    onPageChange={handlePageChange}
                  />
                ) : filteredTemplates.length > 0 ? (
                  <TemplateLibraryGrid
                    templates={filteredTemplates}
                    viewMode={viewMode}
                    onEdit={handleEdit}
                    onDelete={handleDeleteClick}
                    coverHeights={COVER_HEIGHTS}
                  />
                ) : (
                  <EmptyState
                    section={activeSection}
                    hasSearch={searchQuery.trim().length > 0}
                    searchQuery={searchQuery}
                  />
                )}
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      <DeleteTemplateModal
        isOpen={deleteModalOpen}
        onClose={handleDeleteModalClose}
        onConfirm={handleDeleteConfirm}
        templateTitle={templateToDelete?.title || ''}
        isDeleting={isDeleting}
      />
    </div>
  );
};

export default TemplateLibrary;
