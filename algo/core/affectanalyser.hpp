#ifndef AFFECTANALYSER_HPP
#define AFFECTANALYSER_HPP

#include "affectanalyser.h"
#include <algorithm>
#include <unordered_map>
#include <sstream>

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


ostream &operator<<(ostream &out, const affect_infos &a)
{
  out << "$ " ;
  out << "found " << (a.max_found ? "y" : "n") << ", " ;
  out << "value " << a.max_value<< ", " ;
  out << "pos " << a.first_pos_max << "-" << a.last_pos_max << ", " ;
  out << "before " << a.nb_before_left << "/" << a.nb_before_right << ", " ;
  out << "after " << a.nb_after_left << "/" << a.nb_after_right ;
  out << endl ;

  return out ;
}


KmerAffectAnalyser::KmerAffectAnalyser(IKmerStore<KmerAffect> &kms,
                                       const string &seq)
  :kms(kms), seq(seq) {
  assert(seq.length() >=  (size_t)kms.getS());
  affectations = kms.getResults(seq, true);
}


KmerAffectAnalyser::KmerAffectAnalyser(IKmerStore<KmerAffect> &kms,
                                          const string &seq,
                                          vector <KmerAffect> a):
kms(kms), seq(seq), affectations(a){}


KmerAffectAnalyser::~KmerAffectAnalyser(){}


int KmerAffectAnalyser::count() const{
  return affectations.size();
}


int KmerAffectAnalyser::count(const KmerAffect &affect) const{
  int count = 0;
  for (vector<KmerAffect>::const_iterator it = affectations.begin(); 
       it < affectations.end(); it++) {
    if (*it == affect)
      count++;
  }
  return count;
}


int KmerAffectAnalyser::minimize(const KmerAffect &affect, int margin, int width) const {
  int i = margin ;
  int i_stop = MIN(affectations.size() - margin - kms.getS(), seq.length() - width);

  uint64_t val_max = 0 ;
  int i_max = NO_MINIMIZING_POSITION ;

  for (vector<KmerAffect>::const_iterator it = affectations.begin() + margin;
       i <= i_stop;
       it++, i++) {


    if (*it == affect)
      {
        uint64_t val = dna_to_hash(&seq[i], width) ;
        if (val > val_max) {
          val_max = val ;
          i_max = i ;
        }
      }
  }

  if (i_max == NO_MINIMIZING_POSITION)
    return i_max ;

  return i_max + kms.getS() / 2;
}


const KmerAffect&KmerAffectAnalyser::getAffectation(int i) const{
  assert(i >= 0 && i < count());
  return affectations[i];
}


vector<KmerAffect> KmerAffectAnalyser::getAllAffectations(affect_options_t options) const{
  if (options == AO_NONE)
    return affectations;
  vector<KmerAffect> result;
  KmerAffect previous = affectations[0];
  result.push_back(previous);
  for (size_t i = 1; i < affectations.size(); i++) {
    if (! (previous == affectations[i])) {
      result.push_back(affectations[i]);
      previous = affectations[i];
    }
  }
  return result;
}


set<KmerAffect> KmerAffectAnalyser::getDistinctAffectations() const{
  set<KmerAffect> result;
  for (size_t i = 0; i < affectations.size(); i++) {    
    result.insert(affectations[i]);
  }
  return result;
}

IKmerStore<KmerAffect> &KmerAffectAnalyser::getIndex() const{
  return kms;
}

affect_infos KmerAffectAnalyser::getMaximum(const KmerAffect &before,
                                               const KmerAffect &after, 
                                               float ratioMin,
                                               int maxOverlap) {
  /* currentValue is the  { affectations[t] == before | t \in 1..i  } - | { affectations[i] == after | t \in 1..i }  */
  int currentValue;
  int span = kms.getS();
  int length = count();

  if (maxOverlap > span)
    maxOverlap = span;

  /* Initialize results */
  affect_infos results;
  results.max_found = false;
  results.max_value = 0;
  results.first_pos_max = results.last_pos_max = 0;
  results.nb_before_left = results.nb_before_right = results.nb_after_right = results.nb_after_left = 0;
  currentValue = 0;
  int nb_during_max = 0;
  bool continue_max;

  for (int i = 0; i < min(length,span - maxOverlap); i++) {
    if (affectations[i] == after) {
      currentValue--;
      results.nb_after_right++;
    }
  }

  for (int i = span - maxOverlap; i < length; i++) {
    /* i - span + maxOverlap, to avoir overlapping k-mers */

    continue_max = false;
    
    /* Read the current affectations, and store them both in currentValue and at the right of the previous maximum.
       The affectation of 'before' is interpreted relatively to span and maxOverlap */

    if (affectations[i - span + maxOverlap] == before) {
      currentValue++;
      results.nb_before_right++;
    } 
    if (affectations[i] == after) {
      currentValue--;
      results.nb_after_right++;
    }

    /* Now currentValue = | { affectations[t - span + maxOverlap] == 'before' | t \in span-maxOverlap..i } | - | { affectations[i] == 'after' | t \in 0..i } | */

    /* If we raise above the max, or if we continue a previous maximum (even from a distant position), store in results */
    if (currentValue >= results.max_value) {
      if (currentValue > results.max_value) {
        results.first_pos_max = i;

        // We are above the previous max. We reaffect the ignored affectations
        // during the previous plateau.
        results.nb_after_left += nb_during_max;
        results.nb_before_left += nb_during_max;
        nb_during_max = 0;
      } else if (results.last_pos_max == i - 1) {
        if (affectations[i] == after) {
          // in such a case we also have affectations[i - span + maxOverlap] == before
          // because we are still on a maximum this means currentValue hasn't changed
          assert (affectations[i - span + maxOverlap] == before);
          nb_during_max++;
          continue_max = true;
        }
      }
      results.max_value = currentValue;
      results.last_pos_max = i;

      if (! continue_max) {
        /* What was at the right of the previous maximum is now at the left of
         * the current maximum.  But we only count them if we are not on a
         * plateau. If we later reach a higher maximum they will be counted
         * back (see above) */
        results.nb_after_left += results.nb_after_right;
        results.nb_before_left += results.nb_before_right;
      }
      results.nb_after_right = 0;
      results.nb_before_right = 0;
    }


#ifdef DEBUG_GET_MAXIMUM
    cout << setw(3) << i
         << "  " << affectations[i - span + maxOverlap] << ((affectations[i - span + maxOverlap] == before)?"!":" ")
         << "  " << affectations[i] << ((affectations[i] == after)?"!":" ")
         << " =" << setw(3) << currentValue
         << "  " << results ;
#endif
  }
  for (int i = length - span + maxOverlap; i < length && i >= 0; i++) {
    if (affectations[i] == before)
      results.nb_before_right++;
  }

  left_evalue = kms.getProbabilityAtLeastOrAbove(before,
                                                 results.nb_before_left,
                                                 1 + results.last_pos_max);
  right_evalue = kms.getProbabilityAtLeastOrAbove(after,
                                                  results.nb_after_right,
                                                  seq.size() - 1 - results.first_pos_max);

  /* Do we have enough affectations in good positions ('before' at the left and 'after' at the right) ?
     We tolerate some of them in bad positions, but there must be more than 'ratioMin' more in good positions.
     As the comparison is strict, passing this test implies that there is at least one 'before' kmer at the left
     and one 'after' kmer at the right.
   */

  if ((results.nb_after_right > results.nb_after_left*ratioMin)
      && (results.nb_before_left > results.nb_before_right*ratioMin)) {
    results.max_found = true;
  }

#ifdef DEBUG_GET_MAXIMUM
  cout << results ;
#endif

  return results;
}


double KmerAffectAnalyser::getProbabilityAtLeastOrAbove(const KmerAffect &kmer, int at_least) const {
  return kms.getProbabilityAtLeastOrAbove(kmer, at_least, seq.size());
}

pair <double, double> KmerAffectAnalyser::getLeftRightProbabilityAtLeastOrAbove() const {
  return make_pair(left_evalue, right_evalue);
}

const string &KmerAffectAnalyser::getSequence() const{
  return seq;
}


pair <KmerAffect, KmerAffect> KmerAffectAnalyser::sortLeftRight(const pair <KmerAffect, KmerAffect> ka12) const {

  KmerAffect ka1 = ka12.first;
  KmerAffect ka2 = ka12.second;

  int ka1_count = 0; int ka1_pos = 0;
  int ka2_count = 0; int ka2_pos = 0;

  for (size_t i = 0; i < affectations.size(); i++) {

    if (affectations[i] == ka1)
      {
        ka1_count++ ; ka1_pos += i ;
      }
    else if (affectations[i] == ka2)
      {
        ka2_count++ ; ka2_pos += i ;
      }
  }

  // Is ka1 'more on the left' than ka2 ?
  // We check for (k1_pos / ka1_count > ka2_pos / ka2_count), but without floats
  if (ka1_pos * ka2_count < ka2_pos * ka1_count)
    return make_pair(ka1, ka2);
  else
    return make_pair(ka2, ka1);
}


int KmerAffectAnalyser::first(const KmerAffect &affect) const{
  for (size_t i = 0; i < affectations.size(); i++) 
    if (affect == affectations[i])
      return i;
  return (int) string::npos;
}


int KmerAffectAnalyser::last(const KmerAffect &affect) const{
  for (size_t i = affectations.size(); i > 0;  i--) 
    if (affect == affectations[i-1])
      return i-1;
  return (int) string::npos;
}


pair <KmerAffect, KmerAffect> KmerAffectAnalyser::max12(const set<KmerAffect> forbidden) const {
  pair<KmerAffect, int> max_counts[2] = {make_pair(KmerAffect::getUnknown(), -1),
                                         make_pair(KmerAffect::getUnknown(), -1)};
  float proba_max[2] = {1, 1};  // Probabilities associated with the max_counts
  std::unordered_map<KmerAffect, int> counts;
  size_t length = affectations.size();

  for (KmerAffect affect: affectations) {
    if (forbidden.count(affect) == 0) {
      if (counts.count(affect) > 0)
        counts[affect]++;
      else
        counts[affect] = 1;
    }
  }

  for (auto it: counts) {
    float proba = kms.getProbabilityAtLeastOrAbove(it.first, it.second, length);
    if (proba < proba_max[1]) {
      if (proba < proba_max[0]) {
        // We found a better proba than the best yet
        max_counts[1] = max_counts[0];
        max_counts[0] = it;
        proba_max[1] = proba_max[0];
        proba_max[0] = proba;
      } else {
        max_counts[1] = it;
        proba_max[1] = proba;
      }
    }
  }
  return make_pair(max_counts[0].first, max_counts[1].first);
}

string KmerAffectAnalyser::toString() const{
  string kmer;
  for (size_t i = 0; i < affectations.size(); i++) {
    kmer += affectations[i].toString();
#ifdef DEBUG_KMERS
    kmer += ": "+spaced(seq.substr(i,kms.getS()), kms.getSeed())+"\n";
#endif
  }
  return kmer;
}

string KmerAffectAnalyser::toStringValues() const{
  string kmer;
  for (size_t i = 0; i < affectations.size(); i++) {
    kmer += affectations[i].toStringValues();
  }
  return kmer;
}

string KmerAffectAnalyser::toStringSigns() const{
  string kmer;
  for (size_t i = 0; i < affectations.size(); i++) {
    kmer += affectations[i].toStringSigns();
  }
  return kmer;
}

/* CountKmerAffectAnalyser */


CountKmerAffectAnalyser::CountKmerAffectAnalyser(IKmerStore<KmerAffect> &kms, const string &seq): KmerAffectAnalyser(kms, seq) {
  buildCounts();
  overlap=0;
}


CountKmerAffectAnalyser::~CountKmerAffectAnalyser() {
  for (auto it : counts) {
    delete [] it.second;
  }  
}


int CountKmerAffectAnalyser::count() const {
  return KmerAffectAnalyser::count();
}


int CountKmerAffectAnalyser::count(const KmerAffect &affect) const {
  if (counts.count(affect) == 0)
    return 0;

  return counts.find(affect)->second[KmerAffectAnalyser::count() - 1];
}


KmerAffect CountKmerAffectAnalyser::max(const set<KmerAffect> forbidden) const {
  map<KmerAffect, int* >::const_iterator it = counts.begin();
  KmerAffect max_affect = KmerAffect::getUnknown();
  int max_count = -1;

  for (; it != counts.end(); it++) {
    if (forbidden.count(it->first) == 0) {
      int current_count = count(it->first);
      if (current_count > max_count) {
        max_affect = it->first;
        max_count = current_count;
      }
    }
  }

  return max_affect;
}

int CountKmerAffectAnalyser::countBefore(const KmerAffect&affect, int pos) const {
  if (pos == 0 || counts.count(affect) == 0)
    return 0;
  return counts.find(affect)->second[pos-1];
}


int CountKmerAffectAnalyser::countAfter(const KmerAffect&affect, int pos) const {
  if (counts.count(affect) == 0)
    return 0;
  int length = KmerAffectAnalyser::count();
  map<KmerAffect, int*>::const_iterator it = counts.find(affect);
  return it->second[length-1] - it->second[pos];
}  


int CountKmerAffectAnalyser::firstMax(const KmerAffect&before, const KmerAffect&after,
                                         int start, int min) const {
  return searchMax(before, after, start, KmerAffectAnalyser::count()-1,1, min);
}


int CountKmerAffectAnalyser::lastMax(const KmerAffect&before, const KmerAffect&after,
                                        int end, int min) const {
  if (end == -1)
    end = KmerAffectAnalyser::count()-1;
  return searchMax(before, after, end, 0, -1, min);
}


int CountKmerAffectAnalyser::getAllowedOverlap() {
  return overlap;
}


void CountKmerAffectAnalyser::setAllowedOverlap(int overlap) {
  this->overlap = overlap;
}


int CountKmerAffectAnalyser::searchMax(const KmerAffect&before, const KmerAffect& after,
                                          int start, int end, int iter, int min) const {
  if (count(before) == 0 || count(after) == 0)
    return -1;
  int first_pos_max = -1;
  int max_value = min;
  int shift = KmerAffectAnalyser::kms.getS() - overlap - 1;
  int shiftedStart = start, shiftedEnd = end;
  if (iter == 1)
    shiftedStart += shift;
  else
    shiftedEnd += shift;
  for (int i = shiftedStart; (i)*iter <= iter*shiftedEnd; i+=iter) {
    int valueBefore = countBefore(before, i - shift);
    int valueAfter = countAfter(after, i);
    if (valueAfter + valueBefore > max_value 
        && valueAfter > 0 && valueBefore > 0) {
      max_value = valueAfter + valueBefore;
      first_pos_max = i;
    }
  }
  return first_pos_max;
}


void CountKmerAffectAnalyser::buildCounts() {
  int length = KmerAffectAnalyser::count();
  set<KmerAffect> affects = this->getDistinctAffectations();

  for (set<KmerAffect>::iterator it = affects.begin(); 
       it != affects.end(); it++) {
    int *array = new int[length];
    /* Initialize each key with a 0-integer array */
    array[0] = (this->getAffectation(0) == *it) ? 1 : 0;

    /* Fill the array with actual values */
    for (int i = 1; i < length; i++) {
      KmerAffect current = this->getAffectation(i);
      int value = (current == *it) ? 1 : 0;

      array[i] = array[i-1]+value;
    }
    counts[*it] = array;
  }

}


MultipleAffectAnalyser::MultipleAffectAnalyser(IKmerStore<KmerAffect> &kms, const string &seq, bool include_unexpected)
  :kms(kms), seq(seq),  affectations(kms.getAllResults(seq, true)), include_unexpected(include_unexpected)
 {
  assert(seq.length() >=  (size_t)kms.getS());
 }

int MultipleAffectAnalyser::countUnique() const {
  return affectations.size();
}

int MultipleAffectAnalyser::count(const KmerAffect &affect) const{
  auto it = affectations.find(affect);
  if (it == affectations.end())
    return 0;
  return it->second.count();
}

set<KmerAffect> MultipleAffectAnalyser::getAffectations() const {
  set<KmerAffect> affects;
  for (auto it = affectations.begin(); it != affectations.end(); it++)
    affects.insert(it->first);
  return affects;
}

double MultipleAffectAnalyser::getProbabilityAtLeastOrAbove(const KmerAffect &kmer, int at_least) const {
  // TODO: Same as KmerAffectAnalyser's → Factorization
  return kms.getProbabilityAtLeastOrAbove(kmer, at_least, seq.size());
}

pair <double, double> MultipleAffectAnalyser::getLeftRightProbabilityAtLeastOrAbove() const {
  // TODO: Same as KmerAffectAnalyser's → Factorization
  return make_pair(left_evalue, right_evalue);
}

const string &MultipleAffectAnalyser::getSequence() const{
  // TODO: Same as KmerAffectAnalyser's → Factorization
  return seq;
}

pair <set<KmerAffect>, set<KmerAffect>> MultipleAffectAnalyser::sortLeftRight(const set<KmerAffect> &ka1_set, const set<KmerAffect> & ka2_set) const {

  // We assume that even with several affectations, the affectations will be positioned similarly
  KmerAffect ka1 = *(ka1_set.begin());
  KmerAffect ka2 = *(ka2_set.begin());

  int ka1_count = 0; int ka1_pos = 0;
  int ka2_count = 0; int ka2_pos = 0;

  const BitSet &b1 = affectations.find(ka1)->second;
  for (size_t i = 0; i < b1.size(); i++) {
    if (b1.get(i))
      {
        ka1_count++ ; ka1_pos += i ;
      }
  }
  const BitSet &b2 = affectations.find(ka2)->second;
  for (size_t i = 0; i < b2.size(); i++) {
    if (b2.get(i))
      {
        ka2_count++ ; ka2_pos += i ;
      }
  }

  // Is ka1 'more on the left' than ka2 ?
  // We check for the average position in both cases,
  // ie for (k1_pos / ka1_count > ka2_pos / ka2_count), but without floats
  if (ka1_pos * ka2_count < ka2_pos * ka1_count)
    return make_pair(ka1_set, ka2_set);
  else
    return make_pair(ka2_set, ka1_set);
}

std::tuple <set<KmerAffect>, set<KmerAffect>, double, double> MultipleAffectAnalyser::max12(const set<KmerAffect> forbidden, MultiGermline<KmerAffect> *germlines) const {
  assert(affectations.size() >= 2);
  set<KmerAffect> best_affect;
  double best_proba = 2;
  int exp1, exp2;

  // Get the best affect first (with lowest proba)
  for (KmerAffect affect: getAffectations()) {
    if (forbidden.count(affect) == 0) {
      uint64_t count = this->count(affect);
      double proba = getProbabilityAtLeastOrAbove(affect, count);
#ifdef DEBUG
      cerr << "affect/proba: " << affect << " " << proba << endl;
#endif
      frexp(max(proba, best_proba), &exp1);
      frexp(min(proba, best_proba), &exp2);
      if (exp1*1./exp2 >= 0.9) { // The exponent are in base2 but the ratio is identical in base 10
                                 // as the exponents are just at a constant factor of log10(2)
#ifdef DEBUG
        cerr << "proba = " << proba << ", best_proba = " << best_proba << ", fabs = " << fabs(proba - best_proba)
             << ", threshold = " << (proba+best_proba)/1e10 << endl;
#endif
        // Test if values are (almost) equal
        best_proba = min(proba, best_proba);
        best_affect.insert(affect);
      } else if (proba < best_proba) {
        best_proba = proba;
        best_affect.clear();
        best_affect.insert(affect);
      }
    }
  }

#ifdef DEBUG
  PRINT_VAR(best_proba);
  for (auto best: best_affect)
    PRINT_VAR(best);
#endif

  // Now get the second best proba but removes positions that are common with the best (we can only take the first one
  // as all should have the same bitset).
  double second_best_proba = 2;
  set<KmerAffect> second_best_affect;
  if (best_proba == 2) {
    best_affect.insert(KmerAffect::getAmbiguous());
    second_best_affect.insert(KmerAffect::getAmbiguous());
    return std::tuple<std::set<KmerAffect>, std::set<KmerAffect>, double, double>(best_affect, second_best_affect, best_proba, second_best_proba);
  }

  BitSet best_bitset = (affectations.find(*(best_affect.begin()))->second);
  uint64_t best_bitset_count = best_bitset.count();
  for (auto it = best_affect.begin(); it != best_affect.end(); ) {
    uint64_t count = (best_bitset & affectations.find(*it)->second).count();
    if (llabs(count - best_bitset_count) > .1 * best_bitset_count)
      it = best_affect.erase(it);
    else
      it++;
  }
#ifdef DEBUG
  PRINT_VAR(best_bitset);
  PRINT_VAR(best_bitset.size());
#endif
  best_bitset.flip();           // We will compute not(A) AND B to cancel all positions that were set with A
#ifdef DEBUG
  PRINT_VAR(best_bitset);
#endif
  for (KmerAffect affect: getAffectations()) {
    if (forbidden.count(affect) == 0) {
      if (best_affect.find(affect) == best_affect.end()) {
        bool unexpected_germline = true;
        Tshortcut c = germlines->getRepository()->getShortcut(affect);
        for (auto b: best_affect) {
          Tshortcut c2 = germlines->getRepository()->getShortcut(b);
          std::set<Tshortcut> shortcuts = {c, c2};
          if (germlines->getGermline(shortcuts) != nullptr) {
            unexpected_germline = false;
            break;
          }
        }
        KmerAffect tmp_affect = affect;
        if (unexpected_germline) {
          if (! include_unexpected)
            continue;
          else {
            tmp_affect = KmerAffect::getAmbiguous();
          }
        }
        uint64_t count = (best_bitset & affectations.find(affect)->second).count();
        double proba = getProbabilityAtLeastOrAbove(tmp_affect, count);
#ifdef DEBUG
        cerr << affect << "\t" << proba << "\t" << (best_bitset & affectations.find(affect)->second) << endl;
#endif
        frexp(max(proba, second_best_proba), &exp1);
        frexp(min(proba, second_best_proba), &exp2);
        if (exp1*1./exp2 >= 0.9) {
          // Test if values are (almost) equal
          second_best_proba = min(proba, second_best_proba);
          second_best_affect.insert(affect);
        } else if (proba < second_best_proba) {
          second_best_proba = proba;
          second_best_affect.clear();
          second_best_affect.insert(affect);
        }
      }
    }
  }
#ifdef DEBUG
  PRINT_VAR(second_best_proba);
  for (auto second_best: second_best_affect)
    PRINT_VAR(second_best);
#endif
  if (best_proba == 2 || second_best_proba == 2) {
    if (best_proba == 2) {
      best_affect.clear();
      best_affect.insert(KmerAffect::getAmbiguous());
    }
    second_best_affect.clear();
    second_best_affect.insert(KmerAffect::getAmbiguous());
  }
  return std::tuple<std::set<KmerAffect>, std::set<KmerAffect>, double, double>(best_affect, second_best_affect, best_proba, second_best_proba);
}

affect_infos MultipleAffectAnalyser::getMaximum(const KmerAffect &before,
                                                const KmerAffect &after,
                                                MultiGermline<KmerAffect> *germlines,
                                                float ratioMin,
                                                int maxOverlap) {
  // TODO: Duplicated code from KmerAffectAnalyser -> factorize?
  
  /* currentValue is the  { affectations[t] == before | t \in 1..i  } - | { affectations[i] == after | t \in 1..i }  */
  int currentValue;
  int span = before.getLength();
  int length = seq.size();

  if (maxOverlap > span)
    maxOverlap = span;

  /* Initialize results */
  affect_infos results;
  results.max_found = false;
  results.max_value = 0;
  results.first_pos_max = results.last_pos_max = 0;
  results.nb_before_left = results.nb_before_right = results.nb_after_right = results.nb_after_left = 0;
  currentValue = 0;
  int nb_during_max = 0;
  bool continue_max;

  BitSet bs_before = affectations.find(before)->second;
  BitSet not_bs_before = affectations.find(before)->second;
  not_bs_before.flip();
  BitSet bs_after = affectations.find(after)->second;
  BitSet not_bs_after = affectations.find(after)->second;
  not_bs_after.flip();

  bs_before &= not_bs_after;
  bs_after &= not_bs_before;
  
  for (int i = 0; i < min(length,span - maxOverlap); i++) {
    if (bs_after.get(i)) {
      currentValue--;
      results.nb_after_right++;
    }
  }
  for (int i = span - maxOverlap; i < length; i++) {
    /* i - span + maxOverlap, to avoid overlapping k-mers */
    
    continue_max = false;
    
    /* Read the current affectations, and store them both in currentValue and at the right of the previous maximum.
       The affectation of 'before' is interpreted relatively to span and maxOverlap */

    if (bs_before.get(i - span + maxOverlap)) {
      currentValue++;
      results.nb_before_right++;
    } 
    if (bs_after.get(i)) {
      currentValue--;
      results.nb_after_right++;
    }

    /* Now currentValue = | { affectations[t - span + maxOverlap] == 'before' | t \in span-maxOverlap..i } | - | { affectations[i] == 'after' | t \in 0..i } | */

    /* If we raise above the max, or if we continue a previous maximum (even from a distant position), store in results */
    if (currentValue >= results.max_value) {
      if (currentValue > results.max_value) {
        results.first_pos_max = i;

        // We are above the previous max. We reaffect the ignored affectations
        // during the previous plateau.
        results.nb_after_left += nb_during_max;
        results.nb_before_left += nb_during_max;
        nb_during_max = 0;
      } else if (results.last_pos_max == i - 1) {
        if (bs_after.get(i)) {
          // because we are still on a maximum this means currentValue hasn't changed
          assert(bs_before.get(i - span + maxOverlap));
          nb_during_max++;
          continue_max = true;
        }
      }
      results.max_value = currentValue;
      results.last_pos_max = i;

      if (! continue_max) {
        /* What was at the right of the previous maximum is now at the left of
         * the current maximum.  But we only count them if we are not on a
         * plateau. If we later reach a higher maximum they will be counted
         * back (see above) */
        results.nb_after_left += results.nb_after_right;
        results.nb_before_left += results.nb_before_right;
      }
      results.nb_after_right = 0;
      results.nb_before_right = 0;
    }


  }

  for (int i = length - span + maxOverlap; i < length && i >= 0; i++) {
    if (bs_before.get(i))
      results.nb_before_right++;
  }

  KmerAffect b = before, a = after;
  if (! germlines->isCompatible({before, after}))
    a = b = KmerAffect::getAmbiguous();


  left_evalue = kms.getProbabilityAtLeastOrAbove(b,
                                                 results.nb_before_left,
                                                 1 + results.last_pos_max);
  right_evalue = kms.getProbabilityAtLeastOrAbove(a,
                                                  results.nb_after_right,
                                                  seq.size() - 1 - results.first_pos_max);

  /* Do we have enough affectations in good positions ('before' at the left and 'after' at the right) ?
     We tolerate some of them in bad positions, but there must be more than 'ratioMin' more in good positions.
     As the comparison is strict, passing this test implies that there is at least one 'before' kmer at the left
     and one 'after' kmer at the right.
   */

  if ((results.nb_after_right > results.nb_after_left*ratioMin)
      && (results.nb_before_left > results.nb_before_right*ratioMin)) {
    results.max_found = true;
  }

  return results;
}

string MultipleAffectAnalyser::toString() const {
  return toStringValues();
}

string MultipleAffectAnalyser::toStringValues() const {
  std::stringstream result;
  for (KmerAffect affect: getAffectations()) {
    result << setw(6) << affect.toString();
    result << setw(4) << right << count(affect);
    result << setw(12) << getProbabilityAtLeastOrAbove(affect, count(affect)) << " ";
    result << affectations.find(affect)->second;
    result << std::endl;
  }
  return result.str();
}

string MultipleAffectAnalyser::toStringSigns() const {
  // TODO
  return "";
}

#endif
