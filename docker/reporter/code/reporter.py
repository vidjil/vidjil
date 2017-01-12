#!/usr/bin/python
from subprocess import Popen, PIPE, check_output
from crontab import CronTab
from collections import OrderedDict
import argparse
import os
from datetime import datetime
parser = argparse.ArgumentParser()

#-db DATABSE -u USERNAME -p PASSWORD -size 20
parser.add_argument("--init", help="Set following arguments as default and start cron", action="store_true")
parser.add_argument("--delete", help="Unset all cron jobs created by this script", action="store_true")
parser.add_argument("--set", help="Set values in config file without setting a cron", action="store_true")
parser.add_argument("--reset", help="Reset config file to default values", action="store_true")
parser.add_argument("--start", help="Launch Cron with current settings", action="store_true")
parser.add_argument("-tgt", "--host", help="Host name")
parser.add_argument("-c", "--cron", help="Cron expression")
parser.add_argument("-u", "--username", help="SSH Username")
parser.add_argument("-p", "--path", help="Path to Vidjil installation")
parser.add_argument("-py", "--python", help="Path to the python installation")
parser.add_argument("-m", "--monitor", help="host of the monitor that will receive the report")
parser.add_argument("-s", "--servername", help="ID of the server entry in the monitor database")
parser.add_argument("-k", "--key", help="Path to ssh key to use")
parser.add_argument("-l", "--local", help="Execute scripts on local machine")
parser.add_argument("--cron-user", help="user that will be executing the cron task on this machine")
parser.add_argument("--config", help="location of the config file that should be used")

CUR_DIR = os.path.dirname(os.path.realpath(__file__)) + '/'
SCRIPT_DIR = CUR_DIR + 'scripts/'
SCRIPT_MAP = CUR_DIR + 'script_map'
CONFIG_DIR = CUR_DIR + 'configs/'
CMD = os.path.realpath(__file__)

DEFAULT_CRON_USER = 'www-data'
DEFAULT_MONITOR_HOST = 'http://127.0.0.1:5000/monitor'
DEFAULT_SERVER_NAME = 'banana'
DEFAULT_HOST = '127.0.0.1'
DEFAULT_CRON = '* * * * * *'
DEFAULT_USERNAME = 'www-data'
DEFAULT_KEY = '/home/www-data/.ssh/id_rsa'
DEFAULT_PATH = '/home/www-data/vidjil'
DEFAULT_PYTHON = '/usr/bin/python'
DEFAULT_CONFIG = CONFIG_DIR + 'default.cfg'
DEFAULT_LOCAL = 'false'

def init(config, host=None, cron=None, username=None, local=None, key=None, path=None, python=None, monitor=None, servername=None, cron_user=None):
    params = set_args(config, host, cron, username, local, key, path, python, monitor, servername, cron_user)
    set_cron(params['python'] + ' ' + CMD + ' --config ' + config, params['cron_user'], params['cron'])

def start(config):
    params = load(config)
    set_cron(params['python'] + ' ' + CMD + ' --config ' + config, params['cron_user'], params['cron'])

def set_args(config, host=None, cron=None, username=None, local=None, key=None, path=None, python=None, monitor=None, servername=None, cron_user=None):
    params = load(DEFAULT_CONFIG)

    params['host'] = params['host'] if host is None else host
    params['cron'] = params['cron'] if cron is None else cron
    params['username'] = params['username'] if username is None else username
    params['local'] = params['local'] if local is None else local
    params['key'] = params['key'] if key is None else key
    params['path'] = params['path'] if path is None else path
    params['python'] =  params['python'] if python is None else python
    params['monitor'] = params['monitor'] if monitor is None else monitor
    params['servername'] = params['servername'] if servername is None else servername
    params['cron_user'] = params['cron_user'] if cron_user is None else cron_user
    print "Initialising monitor for host " + params['host'] + " with cron expression " + params['cron'] + " username " + params['username'] + " path " + params['path'] + " in config file " + config
    
    write_config(params, config)
    return params

def reset(config=None):
    p = {} 
    p['host'] = DEFAULT_HOST
    p['cron'] = DEFAULT_CRON
    p['username'] = DEFAULT_USERNAME
    p['local'] = DEFAULT_LOCAL
    p['key'] = DEFAULT_KEY
    p['path'] = DEFAULT_PATH
    p['python'] = DEFAULT_PYTHON
    p['monitor'] = DEFAULT_MONITOR_HOST
    p['servername'] = DEFAULT_SERVER_NAME
    p['cron_user'] = DEFAULT_CRON_USER

    write_config(p, config)

def write_config(params, cfg_file):
    config_file = open(cfg_file, 'w+')
    for key in params:
        config_file.write(key + ' ' + params[key] + '\n')

    
def delete(cmd, user):
    tab = CronTab(user=user)
    tab.remove_all(command=cmd) 
    tab.write()

def load(file):
    conf = open(file, 'r')
    params = OrderedDict()
    for line in conf.readlines():
        if (line[0] != '#' and not line.isspace()):
            l = line.split(' ')
            params[l[0]] = ' '.join(l[1:len(l)]).rstrip()
    print "Loaded params: " + str(params)
    return params

def set_cron(cmd, user, cron_exp):
    my_cron = CronTab(user=user)
    job = my_cron.new(command=cmd)
    cron_arr = cron_exp.split(' ')
    job.setall(cron_arr[0], cron_arr[1], cron_arr[2], cron_arr[3], cron_arr[4], cron_arr[5])
    my_cron.write()

def ping(host):
    p = Popen("ping -c 1 " + host, shell=True, stdout=PIPE)
    return p.stdout.read()

def tunnel(host, username, key, path, script):
    cat = Popen("cat " + SCRIPT_DIR + script, shell=True, close_fds=True, stdout=PIPE)
    cmd = "ssh -i " + key + " " + username + "@" + host + " \"cd " + path + " ; exec \$SHELL\""
    ssh = Popen(cmd, shell=True, stdin=cat.stdout, stdout=PIPE, stderr=PIPE)
    out, err = ssh.communicate()
    return out + err

def execute(path, script):
    cmd = "cd " + path + " ; exec " + SCRIPT_DIR + script
    proc = Popen(cmd, shell=True, stdin=PIPE, stdout=PIPE, stderr=PIPE)
    out, err = proc.communicate()
    return out + err

def run_scripts(params):
    scripts = load(SCRIPT_MAP)
    results = OrderedDict()
    for key in scripts:
        #remove file extensions
        new_key = key.split('.')[0]
        if params['local'] == 'False':
            results[new_key] = tunnel(params['host'], params['username'], params['key'], params['path'], scripts[key])
        else:
            results[new_key] = execute(params['path'], scripts[key])
    return results

def post_results(server_addr, servername, is_up, results):
    import requests
    session = requests.Session()
    payload = {}
    payload['up'] = is_up
    for key in results:
        payload[key] = results[key]
    addr = server_addr + '/' + servername

    print addr
    for key in payload:
        print "  %-15s %s" % (key, str(payload[key]).replace('\n', '\\n')[:80])

    session.post(addr, data=payload)

def main():
    args = parser.parse_args()
    config_file = ''
    if args.config is None:
        config_file = DEFAULT_CONFIG
    else:
        if args.config[0] != '/':
            config_file += CUR_DIR
        config_file += args.config
    if args.init:
        init(config_file, args.host, args.cron, args.username, args.key, args.path, args.python, args.monitor, args.servername, args.cron_user)
    elif args.set:
        set_args(config_file, args.host, args.cron, args.username, args.key, args.path, args.python, args.monitor, args.servername, args.cron_user)
    elif args.delete:
        params = load(config_file)
        delete(params['python'] + ' ' + CMD, params['cron_user'])
    elif args.reset:
        reset(config_file)
    elif args.start:
        start(config_file)
    else :
        params = load(config_file)
        results = ''
        response = os.system("ping -c 1 " + params['host'])
        up = 0
        if (response == 0):
            up = 1

            results = run_scripts(params)
            results['ping'] = ping(params['host'])

        post_results(params['monitor'], params['servername'], up, results)

if __name__ == "__main__":
    main()
