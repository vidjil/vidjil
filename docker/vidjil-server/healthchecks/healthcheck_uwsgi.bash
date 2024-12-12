#/bin/bash

# check if directory is writable
for dir in "/mnt/backup/" "/mnt/data/" "/mnt/result/" "/mnt/upload/"
do
	# echo $dir
	if [ ! -w $dir ]
	then 
		echo "UNWRITABLE $dir"
		exit 1
	else 
		echo "WRITABLE $dir"
	fi
done

# check uwsgi is launched at least 2 (the main process and a thread)
num_processes=$(ps -aux | grep www | grep uwsgi.ini | wc -l)
if [ $num_processes -lt  2 ]
then 
	echo "No uwsgi thread started"
	exit 1
fi
