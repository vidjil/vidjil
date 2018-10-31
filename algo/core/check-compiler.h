

// Check compiler

#if defined(__clang__)
    #if (__clang_major__ * 10000 + __clang_minor__ * 100 + __clang_patchlevel__) < 30300
        #warning "Vidjil needs a C++11 compiler such as clang >= 3.3 - see http://vidjil.org/doc/vidjil-algo"
    #endif
#elif defined(__GNUC__)
    #if (__GNUC__ * 10000 + __GNUC_MINOR__ * 100 + __GNUC_PATCHLEVEL__) < 40800
        #warning "Vidjil needs a C++11 compiler such as gcc >= 4.8 - see http://vidjil.org/doc/vidjil-algo"
    #endif
#endif
