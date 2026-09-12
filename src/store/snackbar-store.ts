import { create } from 'zustand';

export const OFFLINE_SNACKBAR_MESSAGE = 'Offline - cannot perform action';

interface SnackbarState {
  visible: boolean;
  message: string;
  epoch: number;
  show: (message: string) => void;
  showOffline: () => void;
  hide: () => void;
}

export const useSnackbarStore = create<SnackbarState>((set) => ({
  visible: false,
  message: '',
  epoch: 0,
  show: (message) => set({ visible: true, message, epoch: Date.now() }),
  showOffline: () => set({ visible: true, message: OFFLINE_SNACKBAR_MESSAGE, epoch: Date.now() }),
  hide: () => set({ visible: false }),
}));
