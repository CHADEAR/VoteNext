#ifndef UI_TYPES_H
#define UI_TYPES_H

#include <stdint.h>

// UI Screen states
enum UiScreen {
  SCR_SPLASH = 0,
  SCR_STATUS,
  SCR_POLL,
  SCR_VOTE,
  SCR_RESULT
};

// UI Rectangle helper
struct UIRect {
  int16_t x, y, w, h;
};

// Helper function to reset rectangle
inline void rectReset(UIRect& r) {
  r = {0, 0, 0, 0};
}

// Helper function to check if point is inside rectangle
inline bool hit(const UIRect& r, uint16_t x, uint16_t y) {
  return (x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h);
}

// Text datum constants (compatible with TFT_eSPI)
#define TL_DATUM 0
#define TC_DATUM 1
#define TR_DATUM 2
#define ML_DATUM 3
#define MC_DATUM 4
#define MR_DATUM 5
#define BL_DATUM 6
#define BC_DATUM 7
#define BR_DATUM 8

#endif
