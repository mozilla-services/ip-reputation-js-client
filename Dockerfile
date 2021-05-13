FROM node:12-alpine

COPY ./package.json /app/
COPY ./package-lock.json /app/

WORKDIR /app

RUN npm ci
ADD . /app/

CMD ["npm", "test"]
