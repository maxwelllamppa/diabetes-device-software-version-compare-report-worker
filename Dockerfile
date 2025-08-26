ARG BASE_VESION=0.3.1

# BUILD Dev Stage
FROM case.artifacts.medtronic.com/teneo-docker-dev-virtual/teneo-dev-base:${BASE_VESION} AS dev
COPY ./ /app/
WORKDIR /app
RUN npm config set nodedir /usr/local/include/node
COPY .npmrc .npmrc
RUN yarn install
RUN yarn dist

# BUILD Prod Stage
FROM case.artifacts.medtronic.com/teneo-docker-dev-virtual/teneo-dev-base:${BASE_VESION} AS prod
RUN mkdir -p /app
COPY ./package.json /app
WORKDIR /app
COPY .npmrc .npmrc
RUN yarn install --production
COPY --from=dev /app/dist /app/dist
WORKDIR /app/dist

# PACK Prod Stage
FROM case.artifacts.medtronic.com/teneo-docker-dev-virtual/teneo-prod-base:${BASE_VESION}
COPY --from=prod /app /app
WORKDIR /app/dist

