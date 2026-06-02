/**
 * Optional viewer defaults. URL query flags override these (see index.html viewerFlag()).
 * Leave empty to use built-in defaults: crewai, chat on, repo switcher on.
 */
window.ATELIER_VIEWER_CONFIG = {
  /** Public viewer origin for README embed links (no trailing slash). */
  publicViewerOrigin: 'https://app.atelier-inc.net',
  defaultRepo: 'cortex-ops-architecture',
  /** Local demo (:9891) needs chat on + `python3 -m codewiki.run_web_app --port 8001`. */
  chatEnabled: true,
  repoSwitcherEnabled: false,
};
