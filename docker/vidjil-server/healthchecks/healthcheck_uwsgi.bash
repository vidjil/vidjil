# check uwsgi is launched at least 1
numprocesses=$(ps -aux | grep www | grep uwsgi.ini | wc -l)
if [ $numprocesses -lt  1 ]; then echo "No uwsgi processus"  && exit 1; fi

# check if directory is writable
for dir in "/mnt/backup/" "/mnt/data/" "/mnt/result/" "/mnt/upload/"
do
	# echo $dir
	if [ ! -w $dir ]; then echo "UNWRITABLE $dir" && exit 1; else  echo "WRITABLE $dir"; fi
done