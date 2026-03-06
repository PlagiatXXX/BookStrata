import { EditorLoadingScreen, EditorErrorScreen } from '@/components/EditorScreens';

interface EditorScreensProps {
  isLoading: boolean;
  isError: boolean;
  error: Error | unknown | null;
  onMyRatingsClick: () => void;
  children: React.ReactNode;
}

export const EditorScreens = ({
  isLoading,
  isError,
  error,
  onMyRatingsClick,
  children,
}: EditorScreensProps) => {
  if (isLoading) {
    return <EditorLoadingScreen onMyRatingsClick={onMyRatingsClick} />;
  }

  if (isError) {
    return <EditorErrorScreen error={error} onMyRatingsClick={onMyRatingsClick} />;
  }

  return <>{children}</>;
};
