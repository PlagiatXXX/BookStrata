import { ArrowLeft } from "lucide-react";
import { DashboardLayout } from "@/layouts/DashboardLayout/DashboardLayout";
import { EditorConfirmModal } from "@/components/EditorModals/EditorConfirmModal";
import { useAuth } from "@/hooks/useAuthContext";
import { useAdminCollections } from "./hooks/useAdminCollections";
import { CollectionList } from "./components/CollectionList";
import { CollectionFormModal } from "./components/CollectionFormModal";
import "./AdminCollectionsPage.css";

export default function AdminCollectionsPage() {
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const h = useAdminCollections();

  return (
    <DashboardLayout showTemplatesNav={false} showSearch={false} activeItem="Коллекции">
      <div className="admin-collections-page">
        <button
          onClick={() => h.navigate("/admin")}
          className="flex items-center gap-2 text-gray-400 hover:text-white transition-colors mb-4 cursor-pointer"
        >
          <ArrowLeft size={18} />
          <span className="text-sm">Назад в админку</span>
        </button>

        <CollectionList
          collections={h.filteredCollections}
          loading={h.loading}
          typeFilter={h.typeFilter}
          isAdmin={isAdmin}
          onSetTypeFilter={h.setTypeFilter}
          onOpenCreate={h.handleOpenCreate}
          onOpenEdit={h.handleOpenEdit}
          onTogglePublish={h.handleTogglePublish}
          onDeleteConfirm={h.setDeleteConfirm}
        />

        {h.showModal && (
          <CollectionFormModal
            editingCollection={h.editingCollection}
            formData={h.formData}
            formLoading={h.formLoading}
            coverUploading={h.coverUploading}
            fileInputRef={h.fileInputRef}
            curatedTiers={h.curatedTiers}
            curatedBooks={h.curatedBooks}
            onChangeForm={h.setFormData}
            onChangeTiers={h.setCuratedTiers}
            onChangeBooks={h.setCuratedBooks}
            onTypeChange={h.handleTypeChange}
            onBookCoverChange={h.handleBookCoverChange}
            onCoverFileSelect={h.handleCoverFileSelect}
            onSubmit={h.handleSubmit}
            onClose={h.handleCloseModal}
          />
        )}

        <EditorConfirmModal
          isOpen={h.deleteConfirm !== null}
          onClose={() => h.setDeleteConfirm(null)}
          onConfirm={() => {
            if (h.deleteConfirm) {
              h.handleDelete(h.deleteConfirm.id, h.deleteConfirm.title);
            }
          }}
          title="Удалить коллекцию?"
          titleId="delete-collection-title"
          confirmLabel="Удалить"
          description={
            h.deleteConfirm ? (
              <p>
                Вы уверены, что хотите удалить коллекцию{" "}
                <span className="font-bold text-[#f6f1e8]">"{h.deleteConfirm.title}"</span>?
              </p>
            ) : null
          }
        />
      </div>
    </DashboardLayout>
  );
}
