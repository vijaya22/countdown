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

// Analytics event names
const ANALYTICS_EVENTS = {
  EXTENSION_INSTALLED:      "extension_installed",
  EXTENSION_UPDATED:        "extension_updated",
  SETTINGS_OPENED:          "settings_opened",
  COUNTDOWN_SET:            "countdown_set",
  COUNTDOWN_COMPLETED:      "countdown_completed",
  SOUND_TOGGLED:            "sound_toggled",
  THEME_CHANGED:            "theme_changed",
  CLOCK_FONT_CHANGED:       "clock_font_changed",
  TEXT_FONT_CHANGED:        "text_font_changed",
  BACKGROUND_IMAGE_SET:     "background_image_set",
  BACKGROUND_IMAGE_REMOVED: "background_image_removed",
  UPGRADE_CLICKED:          "upgrade_clicked",
  LICENSE_ACTIVATED:        "license_activated",
  LICENSE_ACTIVATION_FAILED:"license_activation_failed",
  SHARE_LINK_CREATED:       "share_link_created",
  SHARE_LINK_COPIED:        "share_link_copied",
  POMODORO_STARTED:         "pomodoro_started",
  POMODORO_PAUSED:          "pomodoro_paused",
  POMODORO_RESET:           "pomodoro_reset",
  POMODORO_SKIPPED:         "pomodoro_skipped",
  POMODORO_STOPPED:         "pomodoro_stopped",
  POMODORO_CONFIGURED:      "pomodoro_configured",
  POMODORO_PHASE_COMPLETED: "pomodoro_phase_completed",
  POMODORO_RUN_COMPLETED:   "pomodoro_run_completed",
  COUNTDOWN_ADDED:          "countdown_added",
  COUNTDOWN_DELETED:        "countdown_deleted",
  COUNTDOWN_SET_MAIN:       "countdown_set_main",
  COUNTDOWN_CARD_SHARED:    "countdown_card_shared",
};

// Font presets
const FONT_PRESETS = {
  default: {
    id: "default",
    name: "System",
    premium: false,
    family: 'system-ui, -apple-system, "Segoe UI", Roboto, sans-serif'
  },
  serif: {
    id: "serif",
    name: "Classic Serif",
    premium: true,
    family: 'Georgia, "Times New Roman", serif'
  },
  mono: {
    id: "mono",
    name: "Monospace",
    premium: true,
    family: '"SFMono-Regular", Menlo, Consolas, "Liberation Mono", monospace'
  },
  rounded: {
    id: "rounded",
    name: "Rounded",
    premium: true,
    family: '"Trebuchet MS", "Segoe UI", Verdana, sans-serif'
  },
  elegant: {
    id: "elegant",
    name: "Elegant",
    premium: true,
    family: '"Palatino Linotype", Palatino, "Book Antiqua", serif'
  },
  tech: {
    id: "tech",
    name: "Tech",
    premium: true,
    family: '"Arial Narrow", "Avenir Next Condensed", "Roboto Condensed", sans-serif'
  },
  humanist: {
    id: "humanist",
    name: "Humanist",
    premium: true,
    family: '"Gill Sans", "Segoe UI", Tahoma, sans-serif'
  },
  newspaper: {
    id: "newspaper",
    name: "Newspaper",
    premium: true,
    family: '"Times New Roman", Times, Georgia, serif'
  },
  editorial: {
    id: "editorial",
    name: "Editorial",
    premium: true,
    family: '"Baskerville", "Palatino Linotype", Palatino, serif'
  },
  slab: {
    id: "slab",
    name: "Slab Serif",
    premium: true,
    family: '"Rockwell", "Courier New", Courier, serif'
  },
  condensed: {
    id: "condensed",
    name: "Condensed",
    premium: true,
    family: '"Franklin Gothic Medium", "Arial Narrow", Arial, sans-serif'
  },
  geo: {
    id: "geo",
    name: "Geometric",
    premium: true,
    family: '"Century Gothic", "Avenir Next", Futura, sans-serif'
  },
  terminal: {
    id: "terminal",
    name: "Terminal",
    premium: true,
    family: '"Courier New", "Lucida Console", Monaco, monospace'
  },
  clean: {
    id: "clean",
    name: "Clean Sans",
    premium: true,
    family: '"Helvetica Neue", Helvetica, Arial, sans-serif'
  },
  inscription: {
    id: "inscription",
    name: "Inscription",
    premium: true,
    family: '"Copperplate", "Palatino Linotype", serif'
  }
};
