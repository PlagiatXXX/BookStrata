/* eslint-disable @typescript-eslint/no-explicit-any */
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { sileo } from 'sileo';
import { api } from '@/lib/api-client';
import { transformApiTemplateToState, transformStateTemplateToApi } from '../lib/templateTransformer';
import type { Template, CreateTemplateData, UpdateTemplateData } from '../types/templates';
import type { 
  CreateTemplateRequest, 
  UpdateTemplateRequest 
} from '../types/api';

const TEMPLATES_QUERY_KEY = 'templates';

export const useTemplates = () => {
  return useQuery<Template[]>({
    queryKey: [TEMPLATES_QUERY_KEY, 'all'],
    queryFn: async () => {
      const response: any = await api.get('/templates/all');
      // Бэкенд возвращает массив напрямую
      const templates = Array.isArray(response) ? response : (response.data || response);
      return templates.map(transformApiTemplateToState);
    },
    staleTime: 5 * 60 * 1000, // 5 минут кэширования
  });
};

export const useUserTemplates = () => {
  return useQuery<Template[]>({
    queryKey: [TEMPLATES_QUERY_KEY, 'user'],
    queryFn: async () => {
      const response: any = await api.get('/templates');
      // Бэкенд возвращает массив напрямую
      const templates = Array.isArray(response) ? response : (response.data || response);
      return templates.map(transformApiTemplateToState);
    },
    staleTime: 5 * 60 * 1000, // 5 минут кэширования
  });
};

export const useTemplate = (id: string) => {
  return useQuery<Template>({
    queryKey: [TEMPLATES_QUERY_KEY, id],
    queryFn: async () => {
      const response: any = await api.get(`/templates/${id}`);
      // Бэкенд возвращает шаблон напрямую, без обёртки { data: ... }
      const template = response.data || response;
      return transformApiTemplateToState(template);
    },
  });
};

export const useCreateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: CreateTemplateData) => {
      console.log("[useCreateTemplate] Получены данные:", data);
      
      const stateTemplate: Template = {
        id: '', // временный ID, будет установлен сервером
        title: data.title,
        description: data.description,
        tiers: data.tiers,
        defaultBooks: data.defaultBooks?.filter(book => book.id && !book.id.startsWith?.('book-')),
        isPublic: data.isPublic ?? false,
        authorId: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const apiTemplate = transformStateTemplateToApi(stateTemplate);
      console.log("[useCreateTemplate] API шаблон после трансформации:", apiTemplate);
      
      const requestData: CreateTemplateRequest = {
        title: apiTemplate.title,
        description: apiTemplate.description,
        tiers: apiTemplate.tiers,
        defaultBooks: apiTemplate.defaultBooks,
        isPublic: apiTemplate.isPublic
      };

      console.log("[useCreateTemplate] Отправка запроса на /templates:", requestData);

      const response: any = await api.post('/templates', requestData);
      console.log("[useCreateTemplate] Ответ от сервера:", response);
      
      // Бэкенд возвращает шаблон напрямую, без обёртки { data: ... }
      const template = response.data || response;
      return transformApiTemplateToState(template);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, 'user'] });
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, 'all'] });
    }
  });
};

export const useUpdateTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, data }: { id: string; data: UpdateTemplateData }) => {
      const stateTemplate: Template = {
        id: id,
        title: data.title || '',
        description: data.description,
        tiers: data.tiers || [],
        defaultBooks: data.defaultBooks?.filter(book => book.id && !book.id.startsWith?.('book-')),
        isPublic: data.isPublic ?? false,
        authorId: undefined,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      const apiTemplate = transformStateTemplateToApi(stateTemplate);
      const requestData: UpdateTemplateRequest = {
        title: apiTemplate.title,
        description: apiTemplate.description,
        tiers: apiTemplate.tiers,
        defaultBooks: apiTemplate.defaultBooks,
        isPublic: apiTemplate.isPublic
      };
      
      const response: any = await api.put(`/templates/${id}`, requestData);
      // Бэкенд возвращает шаблон напрямую, без обёртки { data: ... }
      const template = response.data || response;
      return transformApiTemplateToState(template);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, variables.id] });
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, 'user'] });
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, 'all'] });
    },
    onError: (error: any) => {
      sileo.error({ 
        title: 'Не удалось обновить шаблон', 
        description: error?.message || 'Попробуйте снова позже',
        duration: 3000 
      });
    }
  });
};

export const useDeleteTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      await api.delete(`/templates/${id}`);
      return id;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, 'user'] });
      queryClient.invalidateQueries({ queryKey: [TEMPLATES_QUERY_KEY, 'all'] });
    },
    onError: (error: any) => {
      sileo.error({ 
        title: 'Не удалось удалить шаблон', 
        description: error?.message || 'Попробуйте снова позже',
        duration: 3000 
      });
    }
  });
};

export const useApplyTemplate = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, newListTitle }: { id: string; newListTitle?: string }) => {
      const response: any = await api.post(`/templates/${id}/use`, { newListTitle });
      // Бэкенд возвращает новый тир-лист напрямую, без обёртки { data: ... }
      const tierList = response.data || response;
      return tierList;
    },
    onSuccess: () => {
      // После применения шаблона обновляем список тир-листов
      queryClient.invalidateQueries({ queryKey: ['tier-lists'] });
    },
    onError: (error: any) => {
      sileo.error({ 
        title: 'Не удалось применить шаблон', 
        description: error?.message || 'Попробуйте снова позже',
        duration: 3000 
      });
    }
  });
};