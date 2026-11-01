// Sprite atlas index.
// Each entry is [x, y, width, height] in pixels within assets/atlas.webp.
// Regenerate this table only alongside the atlas image itself — the two must match.

const ATLAS_SRC = 'assets/atlas.webp';

const ATLAS_RECTS = {
  // squirrel
  sq_idle:      [249, 193, 127, 145],
  sq_jump:      [89, 347, 124, 119],
  sq_land:      [215, 347, 103, 112],
  sq_hurt:      [442, 347, 111, 111],
  sq_run:       [185, 469, 139, 100],

  // skunks
  skunk_spray:  [2, 2, 188, 189],
  skunk_walk:   [192, 2, 139, 175],
  skunk_green:  [333, 2, 139, 175],
  skunk_blue:   [474, 2, 139, 175],
  hat_green:    [2, 572, 52, 47],
  hat_blue:     [56, 572, 52, 47],

  // pickups
  acorn_gold:   [2, 347, 85, 120],
  acorn:        [712, 469, 69, 84],

  // terrain
  island_wide:  [378, 193, 346, 141],
  island_med:   [555, 347, 159, 108],
  island_vine:  [320, 347, 120, 112],
  log_plat:     [716, 347, 140, 104],
  stone:        [326, 469, 152, 95],
  bridge:       [2, 469, 181, 101],
  crate:        [783, 469, 84, 82],

  // scenery
  pano:         [2, 193, 245, 152],
  water:        [726, 193, 212, 132],
  pines:        [752, 2, 143, 163],
  oak:          [615, 2, 135, 175],
  rocks:        [480, 469, 160, 94],
  mushroom:     [869, 469, 76, 73],
  flowers:      [947, 469, 64, 56],
  sign:         [642, 469, 68, 92],
};
