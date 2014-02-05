align: core align.o 
	mkdir -p ../../interface/cgi
	g++ -o ../../interface/cgi/align.cgi align.o ../core.a

align.o: align.cpp
	g++ -c align.cpp

core:
	cd .. ; make


