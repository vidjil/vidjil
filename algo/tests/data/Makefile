DATA=Stanford_S22.fasta Stanford_S22.rc.fasta chimera-fake-VJ-trim.g

all: $(DATA)

Stanford_S22.fasta:
	$(MAKE) -C ../../../demo
	rm -f Stanford_S22*.fasta
	ln -sv ../../../demo/Stanford_S22*.fasta .

Stanford_S22.rc.fasta: Stanford_S22.fasta

chimera-fake-VJ-trim.g: chimera-fake-VJ.g
	sed '/"13s"/ s/$$/, "trim_sequences": 1/' $^ > $@

clean:
	$(RM) -f $(DATA)
