// Frontend constants for the Chrome extension

// API endpoint
const WORKER_URL = "https://countdown.everysecondcounts.workers.dev";

// License validation interval (7 days)
const LICENSE_REVALIDATION_MS = 7 * 24 * 60 * 60 * 1000;

// Theme presets
const THEME_PRESETS = {
  light: {
    id: 'light',
    name: 'Light',
    premium: false,
    colors: {
      bg: '#f5f5f3',
      text: '#1a1a1a',
      muted: '#888888',
      border: '#e0e0e0',
      inputBg: '#ffffff'
    }
  },
  dark: {
    id: 'dark',
    name: 'Dark',
    premium: false,
    colors: {
      bg: '#1a1a1a',
      text: '#f5f5f3',
      muted: '#888888',
      border: '#333333',
      inputBg: '#2a2a2a'
    }
  },
  ocean: {
    id: 'ocean',
    name: 'Ocean',
    premium: true,
    colors: {
      bg: '#0f1419',
      text: '#e7e9ea',
      muted: '#71767b',
      border: '#2f3336',
      inputBg: '#1d2125'
    }
  },
  sunset: {
    id: 'sunset',
    name: 'Sunset',
    premium: true,
    colors: {
      bg: '#1a1418',
      text: '#f5e6d3',
      muted: '#9a8478',
      border: '#3d2f2a',
      inputBg: '#2a2020'
    }
  },
  forest: {
    id: 'forest',
    name: 'Forest',
    premium: true,
    colors: {
      bg: '#0d1a0d',
      text: '#e0f0e0',
      muted: '#6b8f6b',
      border: '#1f3d1f',
      inputBg: '#152015'
    }
  },
  custom: {
    id: 'custom',
    name: 'Custom',
    premium: true,
    colors: null  // Uses customTheme from storage
  }
};
