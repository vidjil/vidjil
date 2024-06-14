FROM python:latest
RUN pip install Flask
EXPOSE 5000

WORKDIR /app

COPY vidjil/main.py /app
COPY vidjil/tools/api_vidjil.py /app

RUN pip install requests==2.27.1 bs4 beautifulsoup4==4.11.1 tabulate==0.8.10 requests-toolbelt==0.9.1 urllib3==1.26.13

CMD python ./main.py

RUN echo 'if [ "$ENV" = "production" ]; then prompt_color="\e[91m"; else prompt_color="\e[34m"; fi' >> ~/.bashrc; echo 'export PS1="🐳 $prompt_color$SERVICE_NAME \e[32m[ \w ]# \e[0m"' >> ~/.bashrc
