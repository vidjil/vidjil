# Vidjil APIs


## Vidjil server API
To facilitate usage of vidjil server with a lot of data, we have created an API that allow to highly interact with a vidjil server.

This API allow to retrieve your data easily for batch analysis, to create multiple patient at once and automatise the upload and analysis launch.

Code snippet and example can be found in tools directory inside both files `api_vidjil.py` and `api_demo.py`.

!!! warning
    Please be warned of danger of what you do on a production server.  
    Don't spam our production server with excecive data and be attentive if you modifiy or delete your data.

If you want to use it and need help, don't hesitate to contact us if needed at [support@vidjil.org](mailto:support@vidjil.org).

### Installation

API is build as a python script. 

Some library is needed. A prompt line will be show at first launch to propose you to install them for you if you want.  
If you prefer install them by yourself, you can launch the floowing code:

```bash
pip install requests bs4 tabulate requests-toolbelt urllib3
```

### Get started

First step is to download SSL certificate of target vidjil server in PEM format. This can be done as follow:

```bash
SERVERNAME=localhost # adapt it to your need
echo -n | openssl s_client -connect $SERVERNAME:443 | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > ./cert_$SERVERNAME.pem
```

Once is it done, you can start to use the API.

```python
from api_vidjil import Vidjil

ssl_pem="path/cert_SERVERNAME.pem"

vidjil = Vidjil(server_url, ssl=ssl_pem)
vidjil.login(user, password)
```

A message that confirm that you have been connected and the user name is show.  
You can now interact with the server to get some data, for example of the demo patient `Lil-l3`.

```python
sample_set_id = 25736  # Demo lil L3
config_id     = 25     # multi+inc+xxx

### Get a set from server by his id and set type
sets_demo = vidjil.getSetById(sample_set_id, vidjil.PATIENT)
vidjil.infoSets("Set %s" % sample_set_id, sets_demo, set_type=vidjil.PATIENT, verbose=True)
```

You can found more example on the set creation and sample upload inside api_demo.py file and more pricesly inside `demoWriteRunOnServer`function.


## Vidjil analyze API

If you want to get some results on your web page based on vidjil ablity to make V(D)J assignation, you can use our small API to return information on a dna sequence.

This API take a limited number of fasta sequence (up to 10) and return a [.vidjil file](vidjil-format.md) of analysis. This analysis is done with default parameter. 

Under the "mood", vidjil file is a json like data that can be easily explored by any other software or script.  
A small example is presented here:

```python
import requests
import json

# Subset of sequences from demo-x5.fasta file
sequences = ">IGKV3-7*04 1/GTGGA/11 KDE\n\
+CCCAGGCTCCTCATCTATGATGCATCCACCAGGGCCACTAGCATCCCAGCCAGGTTCAGTGGCAGTGGGTCTGGGACAGACTTCACTCTCACCATCAGCAGCCTGCAGCCTGAAGATTTTGCAGTTTATTACTGTCAGCAGGATTATAACTTACCTCGTGGAGGCAGCCCAGGGCGACTCCTCATGAGTCTGCAGCTGCATTTTTGCCATATCCACTATTTGGAGTCTGACCTCCCTAGGAAGCCTCCCTGCTCCCTAGGACAACCTGCTCTGACCTCTGAGG\n\
+>TRBV11-2*01 1/GTCC/0 TRBJ2-7*01\n\
+AACGGTGTAGTGGATGATTCACAGTTGCCTAAGGATCGATTTTCTGCAGAGAGGCTCAAAGGAGTAGACTCCACTCTCAAGATCCAGCCTGCAAAGCTTGAGGACTCGGCCGTGTATCTCTGTGCCAGCAGCTTAGGTCCCTCGTACGAGCAGTACTTCGGGCCGGGCACCAGGCTC\n\
+>TRDD2*01 1/TGG/15 TRDD3*01\n\
+AGCGGGTGGTGATGGCAAAGTGCCAAGGAAAGGGAAAAAGGAAGAAGAGGGTTTTTATACTGATGTGTTTCATTGTGCCTTCCTATGGCAGTGCTACAAAACCTACAGAGACCTGTACAAAAACTGCAGGGGCAAAAGTGCCATTTCCCTGGGATATCCTCACCCTGGGTCCCATGCCTCAGGAGACAAACACAGCAAGCAGCTTCCCTC\n"

# POST url of the server
url_post = "https://db.vidjil.org/vidjil/segmenter"

r = requests.post(url_post, data={'sequences': sequences})
print(r.status_code) # Should be 200 if everything is Ok


vidjil = r.json() # Convert raw text data into json
print( f"Vidjil analyse found {len(vidjil['clones'])} clonotypes." )

for clone in vidjil["clones"]:
    print( f"\t{clone['germline']}; {clone['name']};")

```