// ── Human Entropy Scorer ──────────────────────────────────────────────────
// Invisible bot-detection: scores signup behavior based on human-like chaos.
// Handles both desktop (mouse) and mobile (touch) separately — a mobile user
// with zero mouse events is NOT penalized; touch signals carry the verdict.
//
// Input:  feature object from the client HumanEntropyTracker
// Output: { score, flags, verdict }  — verdict: HUMAN | UNCERTAIN | BOT
//
// ACCURACY TUNING:
//   All thresholds and point values live in the THRESHOLDS object below.
//   After collecting real signup data via the admin /entropy endpoints,
//   plot the distributions of each feature for confirmed humans vs confirmed
//   bots and update the min/max boundaries here to match the actual data.
//   The verdictThresholds control the HUMAN / UNCERTAIN / BOT cutoffs.

// ── Tunable threshold config ──────────────────────────────────────────────
// Change values here to tune accuracy. Never scatter magic numbers in code.
export const THRESHOLDS = {

  // ── Time (ms) ────────────────────────────────────────────────────────────
  time: {
    instant:    4_000,   // below this → strong bot signal  (-60)
    fast:      10_000,   // below this → weak bot signal    (-15)
    maxStale: 1_800_000, // above this → stale tab, ignore  (0)
    // points awarded when time is in the normal human range
    normalPoints: 20,
  },

  // ── Desktop mouse ─────────────────────────────────────────────────────────
  mouse: {
    minEvents: 5,                 // ignore if fewer points than this
    velocityVariance: {
      humanMin:   10,             // above → human  (+25)
      botMax:      2,             // below → bot    (-30)
    },
    curvatureRatio: {
      humanMin:  1.3,             // above → human  (+20)
    },
    directionChanges: {
      humanMin:    8,             // above → human  (+15)
      botMax:      0,             // exactly 0 → bot (-25)
    },
  },

  // ── Mobile touch path ─────────────────────────────────────────────────────
  touch: {
    minEvents: 5,
    velocityVariance: {
      humanMin:   10,             // (+25)
      botMax:      2,             // (-25)
    },
    curvatureRatio: {
      humanMin:  1.2,             // (+20)
    },
    directionChanges: {
      humanMin:    5,             // (+15)
    },
  },

  // ── Mobile tap rhythm ─────────────────────────────────────────────────────
  tap: {
    minCount: 3,
    intervalVariance: {
      humanMin:   500,            // irregular → human  (+25)
      botMax:      50,            // too uniform → bot  (-35)
    },
    intervalMean: {
      humanMin:   200,            // ms — realistic tap pace (+15)
      humanMax:  3000,
    },
  },

  // ── Keyboard (desktop + mobile virtual keyboard) ──────────────────────────
  keyboard: {
    minEvents: 3,
    intervalVariance: {
      humanMin:   500,            // (+25)
      botMax:      50,            // combined with mean check → (-40)
    },
    intervalMean: {
      botMax:     100,            // used with botVarianceMax for ROBOTIC_TYPING
      humanMin:    80,            // realistic range  (+15)
      humanMax:   800,            // mobile keyboards are slower → wider range
    },
    backspacePoints:    20,       // humans make typos
    shiftPoints:         5,
  },

  // ── Form behavior ─────────────────────────────────────────────────────────
  form: {
    fieldRevisitPoints:  15,      // went back to fix something
    switchedTabPoints:   10,      // checked password manager
    pastePenalty:        -5,      // slight penalty — legit users paste too
    scrollMinCount:       2,      // mobile: scroll events before awarding points
    scrollPoints:        10,
    orientationPoints:   10,
  },

  // ── Verdict cutoffs ───────────────────────────────────────────────────────
  // Tune these after reviewing labelled data in the admin panel.
  // Raise humanMin to be more aggressive (more UNCERTAINs, fewer false passes).
  // Lower humanMin to be more permissive (fewer false positives).
  verdict: {
    humanMin:     30,   // score >= this → HUMAN
    uncertainMin:  0,   // score >= this → UNCERTAIN  (else BOT)
  },
};

// ── Validate and normalize client feature payload ─────────────────────────
// Never trust the client blindly: coerce all types.
export function normalizeFeatures(raw) {
  return {
    isMobile: Boolean(raw.isMobile),

    // Desktop
    mouseVelocityVariance:  Number(raw.mouseVelocityVariance)  || 0,
    mouseCurvatureRatio:    Number(raw.mouseCurvatureRatio)    || 0,
    mouseDirectionChanges:  Number(raw.mouseDirectionChanges)  || 0,
    mouseEvents:            Number(raw.mouseEvents)            || 0,

    // Mobile touch
    touchVelocityVariance:  Number(raw.touchVelocityVariance)  || 0,
    touchCurvatureRatio:    Number(raw.touchCurvatureRatio)    || 0,
    touchDirectionChanges:  Number(raw.touchDirectionChanges)  || 0,
    touchEvents:            Number(raw.touchEvents)            || 0,
    tapCount:               Number(raw.tapCount)               || 0,
    tapIntervalMean:        Number(raw.tapIntervalMean)        || 0,
    tapIntervalVariance:    Number(raw.tapIntervalVariance)    || 0,

    // Keyboard (shared)
    keyIntervalMean:        Number(raw.keyIntervalMean)        || 0,
    keyIntervalVariance:    Number(raw.keyIntervalVariance)    || 0,
    keyEvents:              Number(raw.keyEvents)              || 0,
    backspaceCount:         Number(raw.backspaceCount)         || 0,
    shiftCount:             Number(raw.shiftCount)             || 0,

    // Scroll / orientation
    scrollCount:            Number(raw.scrollCount)            || 0,
    scrollVariance:         Number(raw.scrollVariance)         || 0,
    orientationChanges:     Number(raw.orientationChanges)     || 0,

    // Form behavior
    pasteUsed:        Boolean(raw.pasteUsed),
    fieldRevisits:    Number(raw.fieldRevisits)  || 0,
    switchedTabs:     Boolean(raw.switchedTabs),
    fieldFocusOrder:  Array.isArray(raw.fieldFocusOrder)
                        ? raw.fieldFocusOrder.slice(0, 20).map(String)
                        : [],
    totalTime:        Number(raw.totalTime)      || 0,
    honeypotFilled:   Boolean(raw.honeypotFilled),
  };
}

// ── Core scoring algorithm ─────────────────────────────────────────────────
export function scoreHumanEntropy(features, thresholds = THRESHOLDS) {
  const T = thresholds;
  let score = 0;
  const flags = [];

  // ── HONEYPOT: instant hard block ─────────────────────────────────────────
  if (features.honeypotFilled) {
    flags.push('HONEYPOT');
    return { score: -200, flags, verdict: 'BOT' };
  }

  // ── TIME CHECKS ───────────────────────────────────────────────────────────
  if (features.totalTime < T.time.instant) {
    score -= 60; flags.push('TOO_FAST');
  } else if (features.totalTime < T.time.fast) {
    score -= 15; flags.push('FAST');
  } else if (features.totalTime <= T.time.maxStale) {
    score += T.time.normalPoints;
  }

  // ── DEVICE BRANCH ─────────────────────────────────────────────────────────
  if (features.isMobile) {

    if (features.touchEvents === 0 && features.tapCount === 0) {
      score -= 40; flags.push('NO_TOUCH_ON_MOBILE');
    } else {
      // Touch path
      if (features.touchEvents > T.touch.minEvents) {
        if (features.touchVelocityVariance > T.touch.velocityVariance.humanMin) {
          score += 25;
        } else if (features.touchVelocityVariance < T.touch.velocityVariance.botMax) {
          score -= 25; flags.push('LINEAR_TOUCH');
        }
        if (features.touchCurvatureRatio > T.touch.curvatureRatio.humanMin) {
          score += 20;
        }
        if (features.touchDirectionChanges > T.touch.directionChanges.humanMin) {
          score += 15;
        }
      }

      // Tap rhythm
      if (features.tapCount > T.tap.minCount) {
        if (features.tapIntervalVariance > T.tap.intervalVariance.humanMin) {
          score += 25;
        } else if (
          features.tapIntervalVariance < T.tap.intervalVariance.botMax &&
          features.tapIntervalMean     < T.tap.intervalMean.humanMin
        ) {
          score -= 35; flags.push('ROBOTIC_TAPS');
        }
        if (
          features.tapIntervalMean > T.tap.intervalMean.humanMin &&
          features.tapIntervalMean < T.tap.intervalMean.humanMax
        ) {
          score += 15;
        }
      }
    }

    if (features.scrollCount > T.form.scrollMinCount) {
      score += T.form.scrollPoints;
    }
    if (features.orientationChanges > 0) {
      score += T.form.orientationPoints;
      flags.push('ORIENTATION_CHANGE');
    }

  } else {
    // Desktop mouse
    if (features.mouseEvents === 0) {
      score -= 30; flags.push('NO_MOUSE_ON_DESKTOP');
    } else if (features.mouseEvents > T.mouse.minEvents) {
      if (features.mouseVelocityVariance > T.mouse.velocityVariance.humanMin) {
        score += 25;
      } else if (features.mouseVelocityVariance < T.mouse.velocityVariance.botMax) {
        score -= 30; flags.push('LINEAR_MOUSE');
      }
      if (features.mouseCurvatureRatio > T.mouse.curvatureRatio.humanMin) {
        score += 20;
      }
      if (features.mouseDirectionChanges > T.mouse.directionChanges.humanMin) {
        score += 15;
      } else if (features.mouseDirectionChanges === T.mouse.directionChanges.botMax) {
        score -= 25; flags.push('NO_MOUSE_CORRECTIONS');
      }
    }
  }

  // ── KEYBOARD (universal) ──────────────────────────────────────────────────
  if (features.keyEvents > T.keyboard.minEvents) {
    if (features.keyIntervalVariance > T.keyboard.intervalVariance.humanMin) {
      score += 25;
    } else if (
      features.keyIntervalVariance < T.keyboard.intervalVariance.botMax &&
      features.keyIntervalMean     < T.keyboard.intervalMean.botMax
    ) {
      score -= 40; flags.push('ROBOTIC_TYPING');
    }
    if (
      features.keyIntervalMean > T.keyboard.intervalMean.humanMin &&
      features.keyIntervalMean < T.keyboard.intervalMean.humanMax
    ) {
      score += 15;
    }
    if (features.backspaceCount > 0) score += T.keyboard.backspacePoints;
    if (features.shiftCount     > 0) score += T.keyboard.shiftPoints;
  } else if (features.keyEvents === 0 && features.tapCount === 0) {
    score -= 50; flags.push('NO_KEYSTROKES');
  }

  // ── FORM BEHAVIOR ─────────────────────────────────────────────────────────
  if (features.fieldRevisits > 0) score += T.form.fieldRevisitPoints;
  if (features.switchedTabs)       score += T.form.switchedTabPoints;
  if (features.pasteUsed)          score += T.form.pastePenalty; // negative value

  // ── VERDICT ───────────────────────────────────────────────────────────────
  let verdict;
  if (score >= T.verdict.humanMin)     verdict = 'HUMAN';
  else if (score >= T.verdict.uncertainMin) verdict = 'UNCERTAIN';
  else                                 verdict = 'BOT';

  return { score, flags, verdict };
}

// ── Convenience: normalize + score in one call ─────────────────────────────
export function evaluateSignupBehavior(raw, thresholds = THRESHOLDS) {
  const features = normalizeFeatures(raw);
  const result   = scoreHumanEntropy(features, thresholds);
  return { features, ...result };
}
