// ── HumanEntropyTracker ───────────────────────────────────────────────────
// Invisibly collects behavioral signals during signup to distinguish humans
// from bots. Works on both desktop (mouse) and mobile (touch).
// Attaches to the DOM during onboarding and detaches when done.
// No CAPTCHA, no puzzles — completely transparent to real users.

// ── Math helpers ──────────────────────────────────────────────────────────
const mean = (arr) => (arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0);
const variance = (arr) => {
  if (arr.length < 2) return 0;
  const m = mean(arr);
  return mean(arr.map((x) => Math.pow(x - m, 2)));
};

// ── Device detection ──────────────────────────────────────────────────────
function isTouchDevice() {
  return (
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    window.matchMedia?.('(pointer: coarse)')?.matches
  );
}

// ── Tracker class ─────────────────────────────────────────────────────────
export class HumanEntropyTracker {
  constructor() {
    this._mousePoints  = [];
    this._touchPoints  = [];   // mobile: touchmove coordinates + timestamps
    this._touchTaps    = [];   // mobile: touchstart timestamps (tap rhythm)
    this._keyEvents    = [];
    this._fieldEvents  = [];
    this._scrollEvents = [];   // scroll positions over time
    this._startTime    = Date.now();
    this._honeypotFilled = false;
    this._isTouch      = isTouchDevice();
    this._orientationChanges = 0;

    // Bind handlers so we can remove them later
    this._onMouse       = this._onMouse.bind(this);
    this._onTouchMove   = this._onTouchMove.bind(this);
    this._onTouchStart  = this._onTouchStart.bind(this);
    this._onKeyDown     = this._onKeyDown.bind(this);
    this._onFocus       = this._onFocus.bind(this);
    this._onBlur        = this._onBlur.bind(this);
    this._onPaste       = this._onPaste.bind(this);
    this._onWindowBlur  = this._onWindowBlur.bind(this);
    this._onScroll      = this._onScroll.bind(this);
    this._onOrientation = this._onOrientation.bind(this);
  }

  // ── Lifecycle ────────────────────────────────────────────────────────────
  attach() {
    // Desktop mouse signals
    document.addEventListener('mousemove',   this._onMouse,      { passive: true });

    // Mobile touch signals
    document.addEventListener('touchmove',   this._onTouchMove,  { passive: true });
    document.addEventListener('touchstart',  this._onTouchStart, { passive: true });

    // Shared signals (both platforms)
    document.addEventListener('keydown',     this._onKeyDown,    { passive: true });
    document.addEventListener('focusin',     this._onFocus,      { passive: true });
    document.addEventListener('focusout',    this._onBlur,       { passive: true });
    document.addEventListener('paste',       this._onPaste,      { passive: true });
    document.addEventListener('scroll',      this._onScroll,     { passive: true });
    window.addEventListener('blur',          this._onWindowBlur, { passive: true });
    window.addEventListener('orientationchange', this._onOrientation, { passive: true });

    return this;
  }

  detach() {
    document.removeEventListener('mousemove',       this._onMouse);
    document.removeEventListener('touchmove',       this._onTouchMove);
    document.removeEventListener('touchstart',      this._onTouchStart);
    document.removeEventListener('keydown',         this._onKeyDown);
    document.removeEventListener('focusin',         this._onFocus);
    document.removeEventListener('focusout',        this._onBlur);
    document.removeEventListener('paste',           this._onPaste);
    document.removeEventListener('scroll',          this._onScroll);
    window.removeEventListener('blur',              this._onWindowBlur);
    window.removeEventListener('orientationchange', this._onOrientation);
  }

  // Called by the honeypot field's onChange
  markHoneypotFilled() {
    this._honeypotFilled = true;
  }

  // ── Event handlers ───────────────────────────────────────────────────────

  // Desktop: mouse movement
  _onMouse(e) {
    this._mousePoints.push({ x: e.clientX, y: e.clientY, t: Date.now() });
    if (this._mousePoints.length > 300) this._mousePoints.shift();
  }

  // Mobile: finger movement path
  _onTouchMove(e) {
    const touch = e.touches[0];
    if (!touch) return;
    this._touchPoints.push({
      x: touch.clientX,
      y: touch.clientY,
      t: Date.now(),
    });
    if (this._touchPoints.length > 300) this._touchPoints.shift();
  }

  // Mobile: each tap = one interaction event (rhythm signal)
  _onTouchStart(e) {
    this._touchTaps.push({ t: Date.now(), count: e.touches.length });
    if (this._touchTaps.length > 200) this._touchTaps.shift();
  }

  _onKeyDown(e) {
    this._keyEvents.push({ key: e.key, t: Date.now() });
    if (this._keyEvents.length > 500) this._keyEvents.shift();
  }

  _onFocus(e) {
    if (e.target?.name || e.target?.id) {
      this._fieldEvents.push({
        action: 'focus',
        field: e.target.name || e.target.id,
        t: Date.now(),
      });
    }
  }

  _onBlur(e) {
    if (e.target?.name || e.target?.id) {
      this._fieldEvents.push({
        action: 'blur',
        field: e.target.name || e.target.id,
        t: Date.now(),
      });
    }
  }

  _onPaste(e) {
    this._fieldEvents.push({
      action: 'paste',
      field: e.target?.name || e.target?.id || 'unknown',
      t: Date.now(),
    });
  }

  _onWindowBlur() {
    this._fieldEvents.push({ action: 'windowBlur', t: Date.now() });
  }

  _onScroll() {
    this._scrollEvents.push({ y: window.scrollY, t: Date.now() });
    if (this._scrollEvents.length > 100) this._scrollEvents.shift();
  }

  _onOrientation() {
    this._orientationChanges++;
  }

  // ── Feature computation ───────────────────────────────────────────────────
  // Runs on the client just before submit. Produces a flat feature object
  // that the server scorer consumes.
  computeFeatures() {
    const keys   = this._keyEvents;
    const fields = this._fieldEvents;

    // ── Desktop mouse features ──────────────────────────────────────────
    let mouseVelocityVariance  = 0;
    let mouseCurvatureRatio    = 0;
    let mouseDirectionChanges  = 0;
    const pts = this._mousePoints;

    if (pts.length > 5) {
      const velocities = [];
      for (let i = 1; i < pts.length; i++) {
        const dx = pts[i].x - pts[i - 1].x;
        const dy = pts[i].y - pts[i - 1].y;
        const dt = pts[i].t - pts[i - 1].t || 1;
        velocities.push(Math.sqrt(dx * dx + dy * dy) / dt);
      }
      mouseVelocityVariance = variance(velocities);

      const pathLen = velocities.reduce((s, v, i) => {
        const dt = (pts[i + 1]?.t ?? pts[i].t) - pts[i].t || 1;
        return s + v * dt;
      }, 0);
      const dx = pts[pts.length - 1].x - pts[0].x;
      const dy = pts[pts.length - 1].y - pts[0].y;
      const straight = Math.sqrt(dx * dx + dy * dy) || 1;
      mouseCurvatureRatio = pathLen / straight;

      for (let i = 2; i < pts.length; i++) {
        const a1 = Math.atan2(pts[i - 1].y - pts[i - 2].y, pts[i - 1].x - pts[i - 2].x);
        const a2 = Math.atan2(pts[i].y - pts[i - 1].y, pts[i].x - pts[i - 1].x);
        if (Math.abs(a1 - a2) > 0.3) mouseDirectionChanges++;
      }
    }

    // ── Mobile touch features ───────────────────────────────────────────
    let touchVelocityVariance = 0;
    let touchDirectionChanges = 0;
    let touchCurvatureRatio   = 0;
    const tpts = this._touchPoints;

    if (tpts.length > 5) {
      const velocities = [];
      for (let i = 1; i < tpts.length; i++) {
        const dx = tpts[i].x - tpts[i - 1].x;
        const dy = tpts[i].y - tpts[i - 1].y;
        const dt = tpts[i].t - tpts[i - 1].t || 1;
        velocities.push(Math.sqrt(dx * dx + dy * dy) / dt);
      }
      touchVelocityVariance = variance(velocities);

      // Curvature of finger path
      const pathLen = velocities.reduce((s, v, i) => {
        const dt = (tpts[i + 1]?.t ?? tpts[i].t) - tpts[i].t || 1;
        return s + v * dt;
      }, 0);
      const dx = tpts[tpts.length - 1].x - tpts[0].x;
      const dy = tpts[tpts.length - 1].y - tpts[0].y;
      const straight = Math.sqrt(dx * dx + dy * dy) || 1;
      touchCurvatureRatio = pathLen / straight;

      // Direction changes in swipe paths
      for (let i = 2; i < tpts.length; i++) {
        const a1 = Math.atan2(tpts[i-1].y - tpts[i-2].y, tpts[i-1].x - tpts[i-2].x);
        const a2 = Math.atan2(tpts[i].y   - tpts[i-1].y, tpts[i].x   - tpts[i-1].x);
        if (Math.abs(a1 - a2) > 0.3) touchDirectionChanges++;
      }
    }

    // Tap interval rhythm (like keystroke timing but for taps)
    let tapIntervalVariance = 0;
    let tapIntervalMean     = 0;
    const taps = this._touchTaps;
    if (taps.length > 2) {
      const intervals = [];
      for (let i = 1; i < taps.length; i++) {
        intervals.push(taps[i].t - taps[i - 1].t);
      }
      tapIntervalMean     = mean(intervals);
      tapIntervalVariance = variance(intervals);
    }

    // ── Keyboard features ───────────────────────────────────────────────
    let keyIntervalMean     = 0;
    let keyIntervalVariance = 0;
    const backspaceCount    = keys.filter((k) => k.key === 'Backspace').length;
    const shiftCount        = keys.filter((k) => k.key === 'Shift').length;

    if (keys.length > 3) {
      const intervals = [];
      for (let i = 1; i < keys.length; i++) {
        intervals.push(keys[i].t - keys[i - 1].t);
      }
      keyIntervalMean     = mean(intervals);
      keyIntervalVariance = variance(intervals);
    }

    // ── Scroll features ─────────────────────────────────────────────────
    // Humans scroll while reading multi-step forms; bots don't
    const scrollCount = this._scrollEvents.length;
    let scrollVariance = 0;
    if (this._scrollEvents.length > 2) {
      const positions = this._scrollEvents.map((s) => s.y);
      scrollVariance = variance(positions);
    }

    // ── Field behavior ───────────────────────────────────────────────────
    const pasteUsed    = fields.some((f) => f.action === 'paste');
    const switchedTabs = fields.some((f) => f.action === 'windowBlur');
    const seen         = new Set();
    let fieldRevisits  = 0;
    const fieldFocusOrder = [];
    fields
      .filter((f) => f.action === 'focus')
      .forEach((f) => {
        fieldFocusOrder.push(f.field);
        if (seen.has(f.field)) fieldRevisits++;
        seen.add(f.field);
      });

    return {
      // Device type (lets scorer apply the right branch)
      isMobile: this._isTouch,

      // Desktop signals
      mouseVelocityVariance:  Math.round(mouseVelocityVariance  * 1000) / 1000,
      mouseCurvatureRatio:    Math.round(mouseCurvatureRatio    * 1000) / 1000,
      mouseDirectionChanges,
      mouseEvents: pts.length,

      // Mobile touch signals
      touchVelocityVariance:  Math.round(touchVelocityVariance  * 1000) / 1000,
      touchCurvatureRatio:    Math.round(touchCurvatureRatio    * 1000) / 1000,
      touchDirectionChanges,
      touchEvents:   tpts.length,
      tapCount:      taps.length,
      tapIntervalMean:     Math.round(tapIntervalMean),
      tapIntervalVariance: Math.round(tapIntervalVariance),

      // Shared keyboard signals
      keyIntervalMean:     Math.round(keyIntervalMean),
      keyIntervalVariance: Math.round(keyIntervalVariance),
      keyEvents:    keys.length,
      backspaceCount,
      shiftCount,

      // Scroll / orientation (mobile-rich signals)
      scrollCount,
      scrollVariance:      Math.round(scrollVariance),
      orientationChanges:  this._orientationChanges,

      // Form behavior
      pasteUsed,
      fieldRevisits,
      fieldFocusOrder,
      switchedTabs,

      totalTime:       Date.now() - this._startTime,
      honeypotFilled:  this._honeypotFilled,
    };
  }
}
