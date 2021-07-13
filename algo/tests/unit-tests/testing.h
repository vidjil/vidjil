#ifndef TESTING_H
#define TESTING_H

#include <iostream>
#include <fstream>
#include <cstdlib>
using namespace std;


extern int *test_results;
extern int *test_nb_executions;
extern string *test_messages;

#define TAP_DECLARATIONS int *test_results;     \
  int *test_nb_executions;                      \
  string *test_messages;

#define TAP_MAX_FAILED 20

#define TAP_ADDITIONAL_INFOS ""
#define TAP_START(nb_test) test_results = (int *)calloc(nb_test, sizeof(int)); \
  test_nb_executions = (int *) calloc(nb_test, sizeof(int));\
  test_messages = new string[nb_test];

#define RECORD_TAP_TEST(id, msg) test_messages[id] = msg;

#define TAP_TEST(test, id, msg) { test_nb_executions[id]++;     \
if (test_results[id] <= TAP_MAX_FAILED) { \
    if (! (test)) {                                                     \
      test_results[id]++;                                               \
      cerr << "Test " << #test << " failed (" << __FILE__ << ":"        \
           << __LINE__ << "): " << msg << endl;                         \
      cerr << TAP_ADDITIONAL_INFOS << endl;   \
    }}}

#define TAP_TEST_EQUAL(test, expected, id, msg) { test_nb_executions[id]++; \
    if (test_results[id] <= TAP_MAX_FAILED) {                           \
      if (! ((test) == expected)) {                                     \
        test_results[id]++;                                             \
        cerr << "Test " << #test << " failed (" << __FILE__ << ":" << __LINE__ << "): " \
             << " expected " << expected << ", got " << (test)          \
             << " " << msg << endl;                                     \
        cerr << TAP_ADDITIONAL_INFOS << endl; \
      }}}


#define TAP_TEST_APPROX(test, expected, approx, id, msg) { test_nb_executions[id]++; \
      if (test_results[id] <= TAP_MAX_FAILED) {                           \
        if ((fabs((test) - expected)) > approx) {                                     \
          test_results[id]++;                                             \
          cerr << "Test " << #test << " failed (" << __FILE__ << ":" << __LINE__ << "): " \
               << " expected " << expected << " +/- " << approx << ", got " << (test)  \
               << " " << msg << endl;                                     \
          cerr << TAP_ADDITIONAL_INFOS << endl; \
      }}}



#define TAP_END_TEST tap_end_test(__FILE__)

inline bool tap_end_test(const char *filename) {
  bool ok = true;
  ofstream tap_file;
  string tap_filename(filename);
  tap_filename.append(".tap");
  tap_file.open(tap_filename.c_str(), ios_base::out);
  tap_file << "1.." << NB_TESTS << endl;            
  for (int i = 0; i < NB_TESTS; i++) {          
    if (test_results[i] == 0 && test_nb_executions[i] > 0) 
      tap_file << "ok " << i+1;
    else {
      ok = false;
      tap_file << "not ok " << i+1;
    }
    if (! test_messages[i].empty()) {
      tap_file << " - " << test_messages[i] << " (executed " << test_nb_executions[i] << " times)";
    }
    tap_file << endl;
  }
  tap_file.close();
  free(test_results);
  free(test_nb_executions);
  delete [] test_messages;
  return ok;
}
  
#define TAP_END_TEST_EXIT if(tap_end_test(__FILE__)) {  \
    exit(0);                                            \
  } else {                                              \
    exit(1);                                            \
  }

#endif
