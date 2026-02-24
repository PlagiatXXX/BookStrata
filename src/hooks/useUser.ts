import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGetMe, apiGetUserStats, apiUpdateAvatar, type User, type UserStats } from '@/lib/userApi';
import { getAuthToken } from '@/lib/authApi';

const USER_QUERY_KEY = ['user', 'me'] as const;
const USER_STATS_QUERY_KEY = ['user', 'stats'] as const;

interface UseUserResult {
  user: User | undefined;
  stats: UserStats | undefined;
  isLoading: boolean;
  uploadAvatar: (avatarUrl: string) => Promise<User>;
  refreshUser: () => Promise<void>;
}

export function useUser(): UseUserResult {
  const queryClient = useQueryClient();
  const hasToken = Boolean(getAuthToken());

  const userQuery = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: apiGetMe,
    enabled: hasToken,
    retry: false,
  });

  const statsQuery = useQuery({
    queryKey: USER_STATS_QUERY_KEY,
    queryFn: apiGetUserStats,
    enabled: hasToken,
    retry: false,
  });

  const uploadAvatarMutation = useMutation({
    mutationFn: (avatarUrl: string) => apiUpdateAvatar(avatarUrl),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: USER_QUERY_KEY });
      queryClient.invalidateQueries({ queryKey: USER_STATS_QUERY_KEY });
    },
  });

  const refreshUser = async () => {
    await Promise.all([userQuery.refetch(), statsQuery.refetch()]);
  };

  return {
    user: userQuery.data,
    stats: statsQuery.data,
    isLoading: userQuery.isLoading || statsQuery.isLoading,
    uploadAvatar: uploadAvatarMutation.mutateAsync,
    refreshUser,
  };
}
