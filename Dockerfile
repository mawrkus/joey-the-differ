FROM node:12.16-alpine

WORKDIR "/app"

COPY . /app
RUN yarn install

ENTRYPOINT ["node", "bin/joey-the-differ.js"]
