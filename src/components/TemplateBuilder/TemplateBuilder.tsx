import React from "react";
import type { CreateTemplateData, UpdateTemplateData } from "@/types/templates";
import TemplateEditorWizard from "@/components/TemplateEditor/TemplateEditorWizard";

interface TemplateBuilderProps {
  template?: CreateTemplateData | UpdateTemplateData;
  onSave: (data: CreateTemplateData | UpdateTemplateData) => Promise<void>;
  onCancel: () => void;
  isEditing?: boolean;
  templateId?: string;
}

const TemplateBuilder: React.FC<TemplateBuilderProps> = ({
  template,
  onSave,
  onCancel,
  isEditing = false,
  templateId,
}) => {
  return (
    <TemplateEditorWizard
      mode={isEditing ? "edit" : "create"}
      templateId={templateId}
      template={template}
      onSave={onSave}
      onCancel={onCancel}
    />
  );
};

export default TemplateBuilder;
