FROM node:22-alpine

RUN addgroup -S sandbox \
    && adduser -S sandbox -G sandbox

WORKDIR /workspace

USER sandbox

ENTRYPOINT ["node"]
