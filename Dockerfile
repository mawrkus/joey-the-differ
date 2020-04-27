FROM node:14

WORKDIR "/app"

RUN git clone https://github.com/mawrkus/docker .git . \
    && yarn install

ENTRYPOINT ["node", "bin/joey-the-differ.js"]
