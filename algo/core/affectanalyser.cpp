#include "affectanalyser.h"

bool operator==(const affect_infos &ai1, const affect_infos &ai2) {
  return ai1.first_pos_max == ai2.first_pos_max
  && ai1.last_pos_max == ai2.last_pos_max
  && ai1.max_value == ai2.max_value
  && ai1.nb_before_right == ai2.nb_before_right
  && ai1.nb_after_right == ai2.nb_after_right
  && ai1.nb_before_left == ai2.nb_before_left
  && ai1.nb_after_left == ai2.nb_after_left
  && ai1.max_found == ai2.max_found;
}
