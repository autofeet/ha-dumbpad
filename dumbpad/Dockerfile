FROM dumbwareio/dumbpad@sha256:495a109141c28d990fedb9ed06e2d68db08a898b493479cdb12132d90f99d708
USER root
COPY compact-toolbar.css compact-toolbar.js /app/public/Assets/
COPY inject.cjs /tmp/ha-dumbpad-inject.cjs
COPY config.json /tmp/ha-dumbpad-config.json
RUN node /tmp/ha-dumbpad-inject.cjs /app/public/index.html "$(node -p 'require("/tmp/ha-dumbpad-config.json").version')" && rm /tmp/ha-dumbpad-inject.cjs /tmp/ha-dumbpad-config.json
USER node
