import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { DashboardLayout } from '@/layouts/DashboardLayout/DashboardLayout';
import { useAuth } from '@/hooks/useAuthContext';
import { getUserTierLists, type TierListShort } from '@/lib/api';
import { useDashboardState } from './hooks/useDashboardState';
import { useTierListActions } from './hooks/useTierListActions';
import { useTierListsPagination } from './hooks/useTierListsPagination';
import { DashboardHeader } from './components/DashboardHeader';
import { TierListGrid } from './components/TierListGrid';
import { Pagination } from './components/Pagination';
import { EmptyStates } from './components/EmptyStates';
import { CreateTierListModal } from './components/CreateTierListModal';
import { RenameTierListModal } from './components/RenameTierListModal';
import { DeleteTierListModal } from './components/DeleteTierListModal';
import { PAGE_SIZE } from './constants';
import './DashboardPage.css';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // State management через reducer
  const {
    state,
    setCurrentPage,
    setSearchQuery,
    openCreateModal,
    openRenameModal,
    openDeleteModal,
    closeModal,
    setRenameTitle,
    setCreateTitle,
  } = useDashboardState();

  const { currentPage, searchQuery, activeModal, tierListToRename, tierListToDelete, renameTitle, createTitle } = state;

  // Data fetching
  const {
    data: paginatedResponse = {
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 0,
        currentPage: 1,
      },
    },
    isLoading,
    error,
    refetch,
    isFetching,
  } = useQuery({
    queryKey: ['userTierLists', currentPage],
    queryFn: () => getUserTierLists(currentPage, PAGE_SIZE),
  });

  // CRUD операции
  const { createNewTierList, renameTierList, removeTierList, isCreating, isRenaming, isDeleting } =
    useTierListActions({
      onSuccess: () => {
        closeModal();
      },
      onRefetch: () => {
        refetch();
      },
    });

  // Фильтрация и пагинация
  const { displayedTierLists } = useTierListsPagination({
    allTierLists: paginatedResponse.data,
    searchQuery,
  });

  const pagination = paginatedResponse.meta;

  // Обработчики
  const handleMyRatingsClick = () => {
    setCurrentPage(1);
    setSearchQuery('');
  };

  const handleLogout = () => {
    logout();
    navigate('/auth', { replace: true });
  };

  const handleOpenTierList = (id: number) => {
    navigate(`/tier-lists/${id}`);
  };

  const handleCreateTierList = (title: string) => {
    createNewTierList(title);
  };

  const handleRename = () => {
    if (!renameTitle.trim() || !tierListToRename) return;
    renameTierList(tierListToRename.id, renameTitle);
  };

  const handleDelete = () => {
    if (!tierListToDelete) return;
    removeTierList(tierListToDelete.id);
  };

  const hasSearchQuery = searchQuery.trim().length > 0;
  const isEmpty = displayedTierLists.length === 0;
  const hasError = !!error;

  return (
    <DashboardLayout
      onMyRatingsClick={handleMyRatingsClick}
      onSearch={setSearchQuery}
      searchValue={searchQuery}
    >
      <section className="dashboard-home">
        <div className="dashboard-home__container">
          {/* Header */}
          <DashboardHeader
            username={user?.username || ''}
            onCreateClick={openCreateModal}
            onCommunityClick={() => navigate('/community')}
            onLogoutClick={handleLogout}
          />

          {/* Main content */}
          <EmptyStates
            isLoading={isLoading}
            hasError={hasError}
            hasSearchQuery={hasSearchQuery}
            isEmpty={isEmpty && !isLoading}
            onRetry={() => refetch()}
            onCreateClick={openCreateModal}
            onClearSearch={() => setSearchQuery('')}
            error={error}
          />

          {!isLoading && !hasError && !isEmpty && (
            <>
              <TierListGrid
                tierLists={displayedTierLists}
                onOpen={handleOpenTierList}
                onRename={openRenameModal}
                onDelete={openDeleteModal}
              />

              <Pagination
                currentPage={currentPage}
                totalPages={pagination.totalPages}
                onPageChange={setCurrentPage}
              />
            </>
          )}
        </div>
      </section>

      {/* Modals */}
      <CreateTierListModal
        isOpen={activeModal === 'create'}
        onClose={closeModal}
        onCreate={handleCreateTierList}
        createTitle={createTitle}
        onTitleChange={setCreateTitle}
        isPending={isCreating}
      />

      <RenameTierListModal
        isOpen={activeModal === 'rename'}
        onClose={closeModal}
        onRename={handleRename}
        renameTitle={renameTitle}
        onTitleChange={setRenameTitle}
        isPending={isRenaming}
        tierListTitle={tierListToRename?.title}
      />

      <DeleteTierListModal
        isOpen={activeModal === 'delete'}
        onClose={closeModal}
        onDelete={handleDelete}
        tierListTitle={tierListToDelete?.title}
        isPending={isDeleting}
      />
    </DashboardLayout>
  );
}
