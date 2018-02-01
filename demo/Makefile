
FILES=LIL-L4.fastq.gz Stanford_S22.tar.gz Stanford_S22.fasta Stanford_S22.rc.fasta

all: $(FILES)

$(FILES):
	sh get-sequences

clean:
	rm -f $(FILES)


.PHONY: all clean
