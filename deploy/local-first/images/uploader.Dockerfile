# final production image
FROM node:20.8-bullseye-slim
EXPOSE 8080
WORKDIR /usr/src
RUN printf '%s\n' \
    'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/20260418T120000Z bullseye main' \
    'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian/20260418T120000Z bullseye-updates main' \
    'deb [check-valid-until=no] http://snapshot.debian.org/archive/debian-security/20260418T120000Z bullseye-security main' \
    > /etc/apt/sources.list
RUN apt-get update && apt-get install -y git
COPY package.json package-lock.json ./
COPY uploader/package.json uploader/package.json
ENV NODE_ENV=production
RUN npm ci --omit=dev --workspace workadventureuploader
COPY uploader uploader

WORKDIR /usr/src/uploader
USER node
CMD ["npm", "run", "start"]
