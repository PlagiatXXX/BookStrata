import { ArrowLeft, Plus, Eye, EyeOff, Trash2 } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { EditorConfirmModal } from "@/components/EditorModals/EditorConfirmModal";
import { useAdminCelebrities } from "./hooks/useAdminCelebrities";
import { CelebrityFormModal } from "./components/CelebrityFormModal";
import { CELEBRITY_CATEGORIES } from "@/lib/celebritiesApi";
import "@/pages/AdminCollectionsPage/AdminCollectionsPage.css";
import "./AdminCelebritiesPage.css";

export default function AdminCelebritiesPage() {
  const h = useAdminCelebrities();

  return (
    <DashboardLayout showTemplatesNav={false} showSearch={false} activeItem="Знаменитости">
      <div className="admin-celebrities-page">
        <button
          onClick={() => h.navigate("/admin")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Назад в админку</span>
        </button>

        {/* Header */}
        <div className="admin-celebrities-header">
          <div>
            <h1 className="admin-celebrities-title">Знаменитости</h1>
            <p className="admin-celebrities-subtitle">
              Что читают знаменитости — управление профилями и тир-листами
            </p>
          </div>
          <button
            onClick={h.handleOpenCreate}
            className="admin-celebrities-create-btn"
          >
            <Plus size={16} />
            Создать
          </button>
        </div>

        {/* Loading */}
        {h.loading && (
          <div className="admin-celebrities-loading">Загрузка...</div>
        )}

        {/* List */}
        {!h.loading && (
          <div className="admin-celebrities-list">
            {h.celebrities.length === 0 && (
              <div className="admin-celebrities-empty">
                Нет знаменитостей. Создайте первую!
              </div>
            )}

            {h.celebrities.map((celebrity) => (
              <div key={celebrity.id} className="admin-celebrities-item">
                <div className="admin-celebrities-item-photo">
                  {celebrity.photoUrl ? (
                    <img
                      src={celebrity.photoUrl}
                      alt={celebrity.name}
                      className="admin-celebrities-photo-img"
                    />
                  ) : (
                    <div className="admin-celebrities-photo-placeholder">
                      {celebrity.name.charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="admin-celebrities-item-info">
                  <span className="admin-celebrities-item-name">
                    {celebrity.name}
                  </span>
                  <span className="admin-celebrities-item-category">
                    {CELEBRITY_CATEGORIES[celebrity.category] || celebrity.category}
                  </span>
                </div>

                <div className="admin-celebrities-item-status">
                  {celebrity.isPublished ? (
                    <span className="admin-celebrities-status-badge published">
                      <Eye size={12} />
                      Опубликовано
                    </span>
                  ) : (
                    <span className="admin-celebrities-status-badge draft">
                      <EyeOff size={12} />
                      Черновик
                    </span>
                  )}
                </div>

                <div className="admin-celebrities-item-books">
                  {celebrity.books ? Object.keys(celebrity.books).length : 0} книг
                </div>

                <div className="admin-celebrities-item-actions">
                  <button
                    onClick={() => h.handleOpenEdit(celebrity)}
                    className="admin-celebrities-action-btn edit"
                    title="Редактировать"
                  >
                    Редактировать
                  </button>
                  <button
                    onClick={() => h.handleTogglePublish(celebrity.id, celebrity.isPublished, celebrity.name)}
                    className="admin-celebrities-action-btn toggle"
                    title={celebrity.isPublished ? "Снять с публикации" : "Опубликовать"}
                  >
                    {celebrity.isPublished ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button
                    onClick={() => h.setDeleteConfirm({ id: celebrity.id, name: celebrity.name })}
                    className="admin-celebrities-action-btn delete"
                    title="Удалить"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Form Modal */}
        {h.showModal && (
          <CelebrityFormModal
            editingCelebrity={h.editingCelebrity}
            formData={h.formData}
            formLoading={h.formLoading}
            photoUploading={h.photoUploading}
            fileInputRef={h.fileInputRef}
            curatedTiers={h.curatedTiers}
            curatedBooks={h.curatedBooks}
            onChangeForm={h.setFormData}
            onChangeTiers={h.setCuratedTiers}
            onChangeBooks={h.setCuratedBooks}
            onPhotoFileSelect={h.handlePhotoFileSelect}
            onSubmit={h.handleSubmit}
            onClose={h.handleCloseModal}
          />
        )}

        {/* Delete Confirm */}
        <EditorConfirmModal
          isOpen={h.deleteConfirm !== null}
          onClose={() => h.setDeleteConfirm(null)}
          onConfirm={() => {
            if (h.deleteConfirm) {
              h.handleDelete(h.deleteConfirm.id, h.deleteConfirm.name);
            }
          }}
          title="Удалить знаменитость?"
          titleId="delete-celebrity-title"
          confirmLabel="Удалить"
          description={
            h.deleteConfirm ? (
              <p>
                Вы уверены, что хотите удалить знаменитость{" "}
                <span className="font-bold text-[#f6f1e8]">"{h.deleteConfirm.name}"</span>?
              </p>
            ) : null
          }
        />
      </div>
    </DashboardLayout>
  );
}
