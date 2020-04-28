FROM node:14.16-alpine

WORKDIR "/app"

COPY . /app
RUN yarn install

ENTRYPOINT ["node", "bin/joey-the-differ.js"]
