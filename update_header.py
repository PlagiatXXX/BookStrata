import sys

file_path = 'src/pages/TierListEditorPage/components/EditorHeader.tsx'

with open(file_path, 'r') as f:
    content = f.read()

import_code = "import { GitFork } from 'lucide-react';\nimport { useState } from 'react';\nimport { useNavigate } from 'react-router-dom';\nimport { forkTierList } from '@/lib/api';\nimport { sileo } from 'sileo';\n"
if "import { GitFork }" not in content:
    content = import_code + content

new_props = """  onFork?: () => void;
  isForking?: boolean;
}"""
content = content.replace("  isReadOnly?: boolean;\n}", new_props)

new_component_logic = """
export const EditorHeader = ({
  title,
  author,
  likesCount,
  likedIdsSet,
  tierListId,
  ownerUserId,
  currentUserId,
  autoSaveStatus,
  lastSaved,
  onSaveRetry,
  isReadOnly = false,
}: EditorHeaderProps) => {
  const navigate = useNavigate();
  const [isForking, setIsForking] = useState(false);

  const handleFork = async () => {
    if (!tierListId) return;
    try {
      setIsForking(true);
      const newTierList = await forkTierList(tierListId);
      sileo.success({
        title: 'Версия создана',
        description: 'Теперь вы можете редактировать этот список под себя',
      });
      navigate(`/tier-lists/${newTierList.id}`);
    } catch (error) {
      console.error(error);
      sileo.error({
        title: 'Ошибка копирования',
        description: 'Не удалось создать вашу версию списка',
      });
    } finally {
      setIsForking(false);
    }
  };

  return (
"""

# Replace the component definition
import re
component_pattern = r"export const EditorHeader = \(\{[\s\S]*?\}\: EditorHeaderProps\) => \{"
content = re.sub(component_pattern, new_component_logic, content)

# Add the Fork button
fork_button = """
          <div className="flex items-center gap-3">
            <button
              onClick={handleFork}
              disabled={isForking}
              className={`flex items-center gap-2 rounded-lg bg-[#2a162e] px-4 py-2 text-sm font-semibold text-cyan-400 border border-cyan-400/20 hover:bg-[#341b3a] transition-all ${
                isForking ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <GitFork size={18} />
              {isForking ? 'Копирую...' : 'Создать свою версию'}
            </button>
            <LikeButton
"""
content = content.replace("          <LikeButton", fork_button)

with open(file_path, 'w') as f:
    f.write(content)
print("EditorHeader.tsx updated")
