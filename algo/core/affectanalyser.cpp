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


ostream &operator<<(ostream &out, const affect_infos &a)
{
  out << "$ " ;
  out << "found " << a.max_found << ", " ;
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
                                               int maxOverlap) const {
  /* currentValue is the  { affectations[t] == before | t \in 1..i  } - | { affectations[i] == after | t \in 1..i }  */
  int currentValue;
  int span = kms.getS();
  int length = count();
  affect_infos results;

  if (maxOverlap > span)
    maxOverlap = span;

  /* Initialize results */
  results.max_found = false;
  results.max_value = 0;
  results.first_pos_max = results.last_pos_max = -1;
  results.nb_before_left = results.nb_before_right = results.nb_after_right = results.nb_after_left = 0;
  currentValue = 0;

  for (int i = 0; i < min(length,span - maxOverlap); i++) {
    if (affectations[i] == after) {
      currentValue--;
      results.nb_after_right++;
    }
  }

  for (int i = span - maxOverlap; i < length; i++) {
    /* i - span + maxOverlap, to avoir overlapping k-mers */


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
      if (currentValue > results.max_value)
        results.first_pos_max = i;
      results.max_value = currentValue;
      results.last_pos_max = i;

      /* What was at the right of the previous maximum is now at the left of the current maximum */
      results.nb_after_left += results.nb_after_right;
      results.nb_before_left += results.nb_before_right;
      results.nb_after_right = 0;
      results.nb_before_right = 0;
    }
  }
  for (int i = length - span + maxOverlap; i < length && i >= 0; i++) {
    if (affectations[i] == before)
      results.nb_before_right++;
  }

  /* Main test: 
     1) do we have enough affectations in good positions ('before' at the left and 'after' at the right) ?
     We tolerate some of them in bad positions, but there must be 'ratioMin' more in good positions
     2) there should be at least one 'before' and one 'after' (? CHECK ?)
  */

  if (results.nb_after_right >= results.nb_before_right*ratioMin
      && (results.nb_after_right > 0 || results.nb_before_right == 0)
      && currentValue < results.max_value
      && results.max_value > 0) {
    results.max_found = true;
    return results;
  }
  return results;
}


double KmerAffectAnalyser::getProbabilityAtLeastOrAbove(int at_least) const {
  return kms.getProbabilityAtLeastOrAbove(at_least, seq.size());
}

const string &KmerAffectAnalyser::getSequence() const{
  return seq;
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
  set<KmerAffect> affects = this->getDistinctAffectations();

  /* Initialize each key with a 0-integer array */
  for (set<KmerAffect>::iterator it = affects.begin(); 
       it != affects.end(); it++) {
    delete [] counts[*it];
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



pair <KmerAffect, KmerAffect> CountKmerAffectAnalyser::max12(const set<KmerAffect> forbidden) const {
  map<KmerAffect, int* >::const_iterator it = counts.begin();
  KmerAffect max1_affect = KmerAffect::getUnknown();
  KmerAffect max2_affect = KmerAffect::getUnknown();
  int max1_count = -1;
  int max2_count = -1;
  
  for (; it != counts.end(); it++) {
    if (forbidden.count(it->first) == 0) {
      int current_count = count(it->first);
      if (current_count > max1_count)
        {
          max2_affect = max1_affect ;
          max2_count = max1_count ;
          max1_affect = it->first ;
          max1_count = current_count ;
        }
      else if (current_count > max2_count) 
        {            
          max2_affect = it->first;
          max2_count = current_count;
        }      
    }
  }

  return make_pair(max1_affect, max2_affect);
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

