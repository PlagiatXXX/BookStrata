# Avatar Feature Specification

## Overview
User avatar system with AI generation, presets, and custom upload for TierMaker Pro.

## Database Schema Changes

```prisma
// backend/prisma/schema.prisma

model User {
  id            Int        @id @default(autoincrement())
  email         String     @unique
  username      String?    @unique
  avatar_url    String?    // NEW: Avatar URL (Cloudinary/S3)
  password_hash String
  tier_lists    TierList[]
  templates     Template[]
  created_at    DateTime   @default(now())
}
```

## API Endpoints

### 1. Upload Avatar
```
POST /api/users/avatar/upload
Headers: Authorization: Bearer <token>
Content-Type: multipart/form-data
Body: { avatar: File }

Response: { avatar_url: string }
```

### 2. Generate AI Avatar
```
POST /api/users/avatar/generate
Headers: Authorization: Bearer <token>
Body: { prompt: string, style: "realistic" | "cartoon" | "minimal" | "3d" }

Response: { avatar_url: string }
```

### 3. Get Presets
```
GET /api/avatars/presets

Response: {
  presets: [
    { id: string, thumbnail_url: string, full_url: string, style: string },
    ...
  ]
}
```

### 4. Select Preset
```
POST /api/users/avatar/preset
Headers: Authorization: Bearer <token>
Body: { preset_id: string }

Response: { avatar_url: string }
```

### 5. Delete Avatar
```
DELETE /api/users/avatar
Headers: Authorization: Bearer <token>

Response: { success: true }
```

## AI Provider Integration

### OpenAI DALL-E 3 (Recommended)
```typescript
// backend/src/modules/avatar/aiproviders/openai.ts
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function generateAvatar(prompt: string, style: string): Promise<string> {
  const stylePrefix = {
    realistic: 'Photorealistic portrait of a person',
    cartoon: 'Cartoon illustration of a person',
    minimal: 'Minimalist avatar of a person',
    '3d': '3D render avatar of a person'
  };

  const response = await openai.images.generate({
    model: 'dall-e-3',
    prompt: `${stylePrefix[style]}, ${prompt}. Square format, centered face, high quality`,
    n: 1,
    size: '1024x1024',
  });

  return response.data[0].url!;
}
```

### Stability AI (Alternative)
```typescript
// backend/src/modules/avatar/aiproviders/stability.ts
// Stable Diffusion API for more control
```

## Preset System

### Preset Categories
1. **Minimal** - Simple geometric avatars
2. **Illustrations** - Hand-drawn style
3. **3D** - 3D rendered characters
4. **Abstract** - Artistic patterns

### Preset Storage
- Store in Cloudinary with transformations
- Serve multiple sizes: 32x32, 64x64, 128x128, 256x256

## Frontend Components

### Avatar Component
```tsx
// src/components/Avatar/Avatar.tsx
interface AvatarProps {
  url?: string | null;
  username?: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
}

export const Avatar = ({ url, username, size = 'md', className }: AvatarProps) => {
  const initials = username?.slice(0, 2).toUpperCase() || '?';
  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-sm',
    md: 'w-10 h-10 text-base',
    lg: 'w-16 h-16 text-xl',
    xl: 'w-32 h-32 text-3xl'
  };

  if (!url) {
    return (
      <div className={`${sizeClasses[size]} rounded-full bg-linear-to-br from-primary/30 to-secondary/30 flex items-center justify-center font-bold ${className}`}>
        {initials}
      </div>
    );
  }

  return (
    <img 
      src={url} 
      alt={`${username}'s avatar`}
      className={`${sizeClasses[size]} rounded-full object-cover ring-2 ring-surface-border ${className}`}
    />
  );
};
```

### Avatar Selector Modal
```tsx
// src/components/Avatar/AvatarSelector.tsx
import { useState } from 'react';
import { Upload, Wand2, Image } from 'lucide-react';
import { Avatar } from './Avatar';

type Tab = 'upload' | 'ai' | 'presets';

interface AvatarSelectorProps {
  currentAvatar?: string;
  onSelect: (url: string) => void;
  onClose: () => void;
}

export const AvatarSelector = ({ currentAvatar, onSelect, onClose }: AvatarSelectorProps) => {
  const [activeTab, setActiveTab] = useState<Tab>('presets');
  const [aiPrompt, setAiPrompt] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);

  const tabs = [
    { id: 'presets' as const, label: 'Пресеты', icon: Image },
    { id: 'ai' as const, label: 'AI Генерация', icon: Wand2 },
    { id: 'upload' as const, label: 'Загрузить', icon: Upload },
  ];

  return (
    <Modal title="Выберите аватар">
      <div className="flex gap-2 mb-6">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg transition-colors ${
              activeTab === tab.id 
                ? 'bg-primary text-white' 
                : 'bg-surface-light dark:bg-[#200f24] light:bg-gray-100 hover:bg-primary/20'
            }`}
          >
            <tab.icon size={16} />
            {tab.label}
          </button>
        ))}
      </div>

      {activeTab === 'presets' && (
        <PresetGrid onSelect={onSelect} />
      )}

      {activeTab === 'ai' && (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Опишите ваш аватар
            </label>
            <textarea
              value={aiPrompt}
              onChange={(e) => setAiPrompt(e.target.value)}
              placeholder="Например: Мужчина с бородой в очках, синий фон"
              className="w-full h-24 bg-surface-light dark:bg-[#200f24] light:bg-gray-100 rounded-lg p-3 resize-none"
            />
          </div>
          
          <div className="flex gap-2">
            {['realistic', 'cartoon', 'minimal', '3d'].map(style => (
              <button
                key={style}
                className="px-3 py-1 rounded-full bg-surface-light dark:bg-[#200f24] light:bg-gray-100 text-sm capitalize"
              >
                {style}
              </button>
            ))}
          </div>

          <button
            onClick={() => generateAvatar(aiPrompt, style)}
            disabled={isGenerating || !aiPrompt.trim()}
            className="w-full py-3 bg-linear-to-r from-primary to-secondary rounded-lg font-medium disabled:opacity-50"
          >
            {isGenerating ? 'Генерация...' : 'Сгенерировать'}
          </button>
        </div>
      )}

      {activeTab === 'upload' && (
        <Dropzone onDrop={(files) => handleUpload(files[0])}>
          <div className="border-2 border-dashed border-surface-border rounded-lg p-8 text-center">
            <Upload size={32} className="mx-auto mb-4 text-gray-400" />
            <p className="text-sm text-gray-400">
              Перетащите изображение или нажмите для выбора
            </p>
            <p className="text-xs text-gray-500 mt-2">
              JPG, PNG, WebP. Максимум 5MB.
            </p>
          </div>
        </Dropzone>
      )}
    </Modal>
  );
};
```

## Fallback System

```typescript
// src/lib/avatar.ts
export function getAvatarUrl(user: { avatar_url?: string | null; username?: string | null }): string {
  // 1. Custom avatar
  if (user.avatar_url) return user.avatar_url;
  
  // 2. Gravatar
  const email = user.username; // или email из профиля
  if (email) {
    const hash = md5(email.toLowerCase());
    return `https://www.gravatar.com/avatar/${hash}?d=404`;
  }
  
  // 3. Initials (generated by Avatar component)
  return '';
}

export function getInitials(username?: string | null): string {
  if (!username) return '?';
  return username.slice(0, 2).toUpperCase();
}
```

## Environment Variables

```env
# Backend (.env)
OPENAI_API_KEY=sk-...
CLOUDINARY_CLOUD_NAME=...
CLOUDINARY_API_KEY=...
CLOUDINARY_API_SECRET=...
```

## Implementation Priority

1. **Week 1**: Upload + Gravatar + Initials fallback
2. **Week 2**: Presets system (minimal, illustrations)
3. **Week 3**: AI Generation (DALL-E 3 integration)
4. **Week 4**: Polish & optimization

## UI/UX Guidelines

1. **Loading States**: Show skeleton or shimmer while avatar loads
2. **Error Handling**: Graceful fallback to initials on error
3. **Cropping**: Allow users to crop uploaded images
4. **Preview**: Show avatar at actual size before saving
5. **Undo**: Allow reverting to previous avatar
