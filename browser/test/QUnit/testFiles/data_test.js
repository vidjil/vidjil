json_data = {
  "vidjil_json_version": ["2014.09"], 
  "reads": {
    "segmented": [200,100,200,100], 
    "total": [200,100,200,100], 
    "germline": {
      "TRG": [100,50,100,50], 
      "IGH": [100,50,100,50]
    }
  }, 
  "samples": {
    "timestamp": ["2014-10-20 13:59:02", "2014-10-25 14:00:32", "2014-11-20 14:03:13", "2014-12-20 14:04:48"], 
    "commandline": [
      "./vidjil -c clones -g germline/ -r 1 -o ./out0 -z 200 -n 5 Leu+0_BCD.cut.fa ", 
      "./vidjil -c clones -g germline/ -r 1 -o ./out1 -z 200 -n 5 Leu+1_BCD.cut.fa ", 
      "./vidjil -c clones -g germline/ -r 1 -o ./out2 -z 200 -n 5 Leu+2_BCD.cut.fa ", 
      "./vidjil -c clones -g germline/ -r 1 -o ./out3 -z 200 -n 5 Leu+3_BCD.cut.fa "
    ], 
    "number": 4, 
    "original_names": [
      "Leu+0_BCD.cut.fa", 
      "Leu+1_BCD.cut.fa", 
      "Leu+2_BCD.cut.fa", 
      "Leu+3_BCD.cut.fa"
    ], 
    "log": [
      "  ==> segmented 362296 reads (38.7%)\n  ==> found 11526 40-windows in 335725 segments (35.8%) inside 937164 sequences\n ", 
      "  ==> segmented 407095 reads (56.5%)\n  ==> found 35801 40-windows in 396776 segments (55.1%) inside 720531 sequences\n ", 
      "  ==> segmented 419506 reads (46.2%)\n  ==> found 19567 40-windows in 400435 segments (44.1%) inside 908909 sequences\n ", 
      "  ==> segmented 448435 reads (48.2%)\n  ==> found 43444 40-windows in 418595 segments (45%) inside 929901 sequences\n " 
    ]
  }, 
  "clones": [
    { 
        "sequence" : "aaaaaaaaaaaaaaaaaaaaa",
        "name" : "test1",
        "id" : "riri",
        "reads" : [10,10,15,15] ,
        "top" : 1,
        "germline" : "TRG",
        "seg" : {
            "5" : "TRGV4*01",
            "3" : "TRGJ2*03",
            "3start" : 6,
            "5end" : 5
        }
    },
    { 
        "sequence" : "bbbbbbbbbbbbbbb",
        "name" : "test2",
        "id" : "fifi",
        "reads" : [20,20,10,10] ,
        "top" : 2,
        "germline" : "TRG",
        "seg" : {
            "5" : "TRGV5*01",
            "3" : "TRGJ2*04",
            "3start" : 15,
            "5end" : 5
        }
    },
    { 
        "sequence" : "cccccccccccccccccccc",
        "name" : "test3",
        "id" : "loulou",
        "reads" : [25,25,50,50] ,
        "top" : 3,
        "germline" : "IGH",
        "seg" : {
            "5" : "IGHV4*01",
            "4" : "IGHD2*03",
            "3" : "IGHJ8*01",
            "3start" : 15,
            "5end" : 5
        }
    }
  ]
}