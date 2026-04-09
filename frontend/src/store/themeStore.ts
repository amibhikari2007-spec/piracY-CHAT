import { create } from 'zustand';

type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  toggleTheme: () => void;
  setTheme: (t: Theme) => void;
}

const stored = (localStorage.getItem('wa-theme') as Theme) || 'light';

const applyTheme = (t: Theme) => {
  document.documentElement.classList.toggle('dark', t === 'dark');
  localStorage.setItem('wa-theme', t);
};

applyTheme(stored);

export const useThemeStore = create<ThemeState>((set) => ({
  theme: stored,
  setTheme: (t) => { applyTheme(t); set({ theme: t }); },
  toggleTheme: () =>
    set((state) => {
      const next = state.theme === 'light' ? 'dark' : 'light';
      applyTheme(next);
      return { theme: next };
    }),
}));
