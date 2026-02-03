type Theme = 'light' | 'dark';

function setIcons(theme: Theme) {
  for (const root of document.querySelectorAll<HTMLElement>(
    'footer, details',
  )) {
    const sun = root.querySelector<HTMLElement>('.theme-icon-sun');
    const moon = root.querySelector<HTMLElement>('.theme-icon-moon');
    if (!sun || !moon) continue;
    if (theme === 'dark') {
      sun.classList.add('hidden');
      moon.classList.remove('hidden');
    } else {
      sun.classList.remove('hidden');
      moon.classList.add('hidden');
    }
  }
}

function applyTheme(theme: Theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('theme', theme);
  setIcons(theme);
}

function getInitialTheme(prefersDark: MediaQueryList): Theme {
  const saved = localStorage.getItem('theme');
  if (saved === 'dark' || saved === 'light') return saved;
  return prefersDark.matches ? 'dark' : 'light';
}

export function initThemeToggle() {
  const themeToggles = document.querySelectorAll<HTMLElement>(
    '[data-theme-toggle]',
  );
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)');

  applyTheme(getInitialTheme(prefersDark));

  themeToggles.forEach(btn => {
    btn.addEventListener('click', () => {
      const current: Theme =
        document.documentElement.getAttribute('data-theme') === 'dark' ?
          'dark'
        : 'light';
      applyTheme(current === 'dark' ? 'light' : 'dark');
    });
  });

  prefersDark.addEventListener('change', (e: MediaQueryListEvent) => {
    const saved = localStorage.getItem('theme');
    if (saved === 'dark' || saved === 'light') return;
    applyTheme(e.matches ? 'dark' : 'light');
  });
}

initThemeToggle();
