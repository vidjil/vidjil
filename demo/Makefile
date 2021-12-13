
FILES=LIL-L4.fastq.gz Stanford_S22.tar.gz Stanford_S22.fasta Stanford_S22.rc.fasta ../browser/test/data/demo_lil_l3_tutorial.vidjil

all: $(FILES)

$(FILES):
	sh get-sequences

clean:
	rm -f $(FILES)


.PHONY: all clean
