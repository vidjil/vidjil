

json_data = {
  "vidjil_json_version": ["2014.09"], 
  "reads": {
    "segmented": [335725, 396776, 400435, 418595], 
    "total": [937164,  720531,  908909, 929901], 
    "germline": {
      "TRG": [362229, 407038, 419450, 448393], 
      "IGH": [67, 57, 56, 42]
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
  "clones": []
}

var myConsole = new Com("flash_container", "log_container", "popup-container", "data-container")
    
test("model : load", function() {
    var m = new Model();
    m.parseJsonData(json_data)
    
    equal(m.samples.number, 4, "timepoint : number==4");
    equal(m.samples.number, m.samples.original_names.length, "timepoint : check if array have the expected length");
});

test("model : time control", function() {
    var m = new Model();
    m.parseJsonData(json_data)
    
    equal(m.t, 0, "default timepoint = 0");                     // [0,1,2,3] => 0
    deepEqual(m.samples.order, [0,1,2,3], "default order = [0,1,2,3]")
    equal(m.nextTime(), 1, "next timepoint = 1");               // [0,1,2,3] => 1
    equal(m.changeTime(3) , 3, "changeTime to 3");              // [0,1,2,3] => 3
    equal(m.previousTime(), 2, "previous timepoint = 2");       // [0,1,2,3] => 2
    m.switchTimeOrder(0,3)                                      // [3,1,2,0] => 2
    deepEqual(m.samples.order, [3,1,2,0], "switch time order, exchange position of time 0 and 3 => [3,1,2,0]")
    equal(m.nextTime(), 0, "next timepoint = 0");               // [3,1,2,0] => 0
    equal(m.nextTime(), 3, "loop end to start");                // [3,1,2,0] => 3
    equal(m.previousTime(), 0, "loop start to end");            // [3,1,2,0] => 0
    m.changeTimeOrder([3,2,1])                                  // [3,2,1] => 0
    deepEqual(m.samples.order, [3,2,1], "change time order to [3,2,1]")
    
    equal(m.getStrTime(0, "sampling_date"), "2014-10-20", "get sampling date")
    equal(m.getStrTime(0, "name"), "Leu+0_BCD", "get time original name")
    equal(m.getStrTime(1, "delta_date"), "+5", "get day since diag")
    
});