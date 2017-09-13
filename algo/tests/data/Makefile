DATA=Stanford_S22.fasta Stanford_S22_rc.fasta chimera-fake-VJ-trim.g

all: chimera-fake-VJ-trim.g
	sh get-sequences

chimera-fake-VJ-trim.g: chimera-fake-VJ.g
	sed '/"13s"/ s/$$/, "trim_sequences": 1/' $^ > $@

clean:
	$(RM) -f $(DATA)
