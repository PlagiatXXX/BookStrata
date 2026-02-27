import React from 'react';
import { ArrowLeft, ArrowRight, Save } from 'lucide-react';
import { Button } from '@/ui/Button';
import { Modal } from '@/ui/Modal';
import type { CreateTemplateData, UpdateTemplateData } from '@/types/templates';
import { useTemplateEditorState } from '@/hooks/useTemplateEditorState';
import { StepsHeader } from './components/StepsHeader';
import { BasicInfoStep } from './components/BasicInfoStep';
import { TiersStep } from './components/TiersStep';
import { ReviewStep } from './components/ReviewStep';

interface TemplateEditorWizardProps {
  mode: 'create' | 'edit';
  templateId?: string;
  template?: CreateTemplateData | UpdateTemplateData;
  onSave: (data: CreateTemplateData | UpdateTemplateData) => Promise<void>;
  onCancel: () => void;
}

const TemplateEditorWizard: React.FC<TemplateEditorWizardProps> = ({
  mode,
  templateId,
  template,
  onSave,
  onCancel,
}) => {
  const editor = useTemplateEditorState({
    mode,
    templateId,
    initialTemplate: template,
    onSubmit: onSave,
  });

  const handleSave = async () => {
    await editor.save();
  };

  return (
    <>
      <div className="rounded-md border border-white/20 bg-black/45 backdrop-blur-[2px] shadow-xl overflow-hidden">
        <StepsHeader
          mode={mode}
          currentStep={editor.currentStep}
          draftStatus={editor.draftStatus}
          draftLastSaved={editor.draftLastSaved}
          isSubmitting={editor.isSubmitting}
          isValid={editor.validation.isValid}
          onStepClick={editor.setCurrentStep}
          onCancel={onCancel}
          onSave={handleSave}
        />

        <div className="space-y-6 p-4 lg:p-6">
          {editor.currentStep === 0 && (
            <BasicInfoStep
              title={editor.formState.title}
              description={editor.formState.description}
              titleError={editor.validation.titleError}
              descriptionError={editor.validation.descriptionError}
              onTitleChange={(value) => editor.updateField('title', value)}
              onDescriptionChange={(value) => editor.updateField('description', value)}
            />
          )}

          {editor.currentStep === 1 && (
            <TiersStep
              tiers={editor.formState.tiers}
              tierNameErrors={editor.validation.tierNameErrors}
              tierColorErrors={editor.validation.tierColorErrors}
              tiersError={editor.validation.tiersError}
              onAddTier={editor.addTier}
              onResetToPreset={editor.resetToPreset}
              onUpdateTier={editor.updateTier}
              onDuplicateTier={editor.duplicateTier}
              onRemoveTier={editor.removeTier}
              onMoveTier={editor.moveTier}
            />
          )}

          {editor.currentStep === 2 && (
            <ReviewStep
              mode={mode}
              title={editor.formState.title}
              description={editor.formState.description}
              tiers={editor.formState.tiers}
              isDirty={editor.isDirty}
              warnings={editor.validation.warnings}
            />
          )}
        </div>

        <div className="sticky bottom-0 border-t border-white/20 bg-black/60 backdrop-blur-[2px] p-4">
          <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={editor.prevStep}
              disabled={editor.currentStep === 0}
              className="w-full sm:w-auto"
            >
              <ArrowLeft size={16} />
              Назад
            </Button>
            {editor.currentStep < 2 ? (
              <Button
                type="button"
                variant="primary"
                onClick={editor.nextStep}
                disabled={!editor.stepIsValid(editor.currentStep)}
                className="w-full sm:w-auto"
              >
                Далее
                <ArrowRight size={16} />
              </Button>
            ) : (
              <Button
                type="button"
                variant="success"
                onClick={handleSave}
                disabled={!editor.validation.isValid || editor.isSubmitting}
                className="w-full sm:w-auto"
              >
                <Save size={16} />
                {editor.isSubmitting ? 'Сохраняем...' : mode === 'create' ? 'Создать шаблон' : 'Обновить шаблон'}
              </Button>
            )}
          </div>
        </div>
      </div>

      <Modal isOpen={editor.showRestorePrompt} onClose={editor.discardDraft} maxWidth="md" titleId="restore-draft-title">
        <div className="p-6">
          <h3 id="restore-draft-title" className="font-display text-lg font-semibold text-[#f3efe6]">Найден черновик</h3>
          <p className="text-sm text-[#b8b1a3] mt-2">
            Обнаружен несохраненный черновик. Восстановить его или начать с текущей версии?
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={editor.discardDraft} className="w-full sm:w-auto">
              Сбросить черновик
            </Button>
            <Button type="button" variant="primary" onClick={editor.restoreDraft} className="w-full sm:w-auto">
              Восстановить
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={editor.showLeavePrompt} onClose={editor.stayOnPage} maxWidth="md" titleId="leave-page-title">
        <div className="p-6">
          <h3 id="leave-page-title" className="font-display text-lg font-semibold text-[#f3efe6]">Несохраненные изменения</h3>
          <p className="text-sm text-[#b8b1a3] mt-2">
            Вы действительно хотите уйти со страницы? Изменения будут потеряны.
          </p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={editor.stayOnPage} className="w-full sm:w-auto">
              Остаться
            </Button>
            <Button type="button" variant="destructive" onClick={editor.confirmLeave} className="w-full sm:w-auto">
              Уйти без сохранения
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default TemplateEditorWizard;
