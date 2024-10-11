# Vidjil APIs

These APIs were first released in 2022, and continue to improve as of 2023.
Please [contact us](mailto:contact@vidjil.org) for additional details.

## Vidjil server API

This API and the Python Vidjil library allows to interact with a Vidjil server, notably:

- to automate parts of your workflows (patient/sample/run creation, data upload, analysis launch),
- and to perform batch analysis of data.

Code examples can be found in `tools/api_demo.py`, and first steps are below.

!!! warning
    When interacting with a production server (such as Vidjil public servers), please be very careful
    on requests you send, especially when updating or deleting data.
    Do not spam the Vidjil public servers.

### First steps

Install required libraries

```bash
pip install requests bs4 tabulate requests-toolbelt urllib3
```

Download SSL certificate of target Vidjil server.

```bash
SERVERNAME=localhost # adapt it to your need
echo -n | openssl s_client -connect $SERVERNAME:443 | sed -ne '/-BEGIN CERTIFICATE-/,/-END CERTIFICATE-/p' > ./cert_$SERVERNAME.pem

```

You can then use the API.

```python
from api_vidjil import Vidjil

ssl_pem="path/cert_SERVERNAME.pem"

vidjil = Vidjil(server_url, ssl=ssl_pem)
vidjil.login(user, password)
```

A confirmation is displayed with your user name.
You can now interact with the server to get some data, for example of the demo patient `Lil-l3`.

```python
sample_set_id = 25736  # Demo lil L3
config_id     = 25     # multi+inc+xxx

### Get a set from server by his id and set type
sets_demo = vidjil.getSetById(sample_set_id, vidjil.PATIENT)
vidjil.infoSets("Set %s" % sample_set_id, sets_demo, set_type=vidjil.PATIENT, verbose=True)
```

### Further use

The `api_demo.py` has more examples, especially in the `demoWriteRunOnServer`function.

## Vidjil-algo analyze API

This API runs `vidjil-algo` with the default parameters to compute V(D)J assignations on DNA sequences.
It takes a limited number of Fasta sequence (up to 10)
and returns a [.vidjil file](vidjil-format.md) with the analysis of these sequences, such as here:

```python
import requests
import json

# Subset of sequences from demo/Demo-X5.fa
sequences = '''>seq1
CCCAGGCTCCTCATCTATGATGCATCCACCAGGGCCACTAGCATCCCAGCCAGGTTCAGTGGCAGTGGGTCTGGGACAGACTTCACTCTCACCATCAGCAGCCTGCAGCCTGAAGATTTTGCAGTTTATTACTGTCAGCAGGATTATAACTTACCTCGTGGAGGCAGCCCAGGGCGACTCCTCATGAGTCTGCAGCTGCATTTTTGCCATATCCACTATTTGGAGTCTGACCTCCCTAGGAAGCCTCCCTGCTCCCTAGGACAACCTGCTCTGACCTCTGAGG
>seq2
AACGGTGTAGTGGATGATTCACAGTTGCCTAAGGATCGATTTTCTGCAGAGAGGCTCAAAGGAGTAGACTCCACTCTCAAGATCCAGCCTGCAAAGCTTGAGGACTCGGCCGTGTATCTCTGTGCCAGCAGCTTAGGTCCCTCGTACGAGCAGTACTTCGGGCCGGGCACCAGGCTC
>seq3
AGCGGGTGGTGATGGCAAAGTGCCAAGGAAAGGGAAAAAGGAAGAAGAGGGTTTTTATACTGATGTGTTTCATTGTGCCTTCCTATGGCAGTGCTACAAAACCTACAGAGACCTGTACAAAAACTGCAGGGGCAAAAGTGCCATTTCCCTGGGATATCCTCACCCTGGGTCCCATGCCTCAGGAGACAAACACAGCAAGCAGCTTCCCTC
'''

# POST url of the server
url_post = "https://db.vidjil.org/vidjil/segmenter"

r = requests.post(url_post, data={'sequences': sequences})
print(r.status_code) # Should be 200 if everything is Ok

vidjil = r.json() # Convert raw text data into json
print(f"Vidjil-algo found {len(vidjil['clones'])} clonotypes.")

for clone in vidjil["clones"]:
    print( f"\t{clone['germline']}; {clone['name']};")
```

To perform analyses on more data from the command line, please install and use [vidjil-algo](./vidjil-algo.md).
