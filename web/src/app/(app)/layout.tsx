import { AppState } from '@/components/providers/app-state';
import { AppShell } from '@/components/layout/app-shell';
import { ToastProvider } from '@/components/ui/toast';

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <AppState>
        <AppShell>{children}</AppShell>
      </AppState>
    </ToastProvider>
  );
}
