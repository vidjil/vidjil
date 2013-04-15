#include <core/teestream.h>

int main(void) {
  std::ofstream log("hello-world.log");
  teestream tee(std::cout, log);
    tee << "Hello, world!\n";
    return 0;
}
