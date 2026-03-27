/** Terminal height constraints */
export const TERMINAL_HEIGHT = {
  DEFAULT: 206,
  MIN: 30,
  /** Maximum is 70% of viewport, enforced dynamically */
  MAX_PERCENTAGE: 0.7,
} as const

/** Toolbar triggers section height constraints */
export const TOOLBAR_TRIGGERS_HEIGHT = {
  DEFAULT: 300,
  MIN: 30,
  MAX: 800,
} as const

/** Editor connections section height constraints */
export const EDITOR_CONNECTIONS_HEIGHT = {
  DEFAULT: 172,
  MIN: 30,
  MAX: 300,
} as const

/** Output panel (terminal execution results) width constraints */
export const OUTPUT_PANEL_WIDTH = {
  DEFAULT: 560,
  MIN: 280,
} as const

/** Terminal block column width - minimum width for the logs column */
export const TERMINAL_BLOCK_COLUMN_WIDTH = 240 as const
