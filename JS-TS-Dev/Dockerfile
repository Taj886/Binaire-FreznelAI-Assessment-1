FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update && apt-get install -y curl ca-certificates && rm -rf /var/lib/apt/lists/*

RUN ARCH="$(dpkg --print-architecture)" && \
    if [ "$ARCH" = "amd64" ]; then TTYD_ARCH="x86_64"; \
    elif [ "$ARCH" = "arm64" ]; then TTYD_ARCH="aarch64"; \
    else echo "Unsupported architecture"; exit 1; fi && \
    curl -fsSL "https://github.com/tsl0922/ttyd/releases/latest/download/ttyd.${TTYD_ARCH}" \
    -o /usr/local/bin/ttyd && chmod +x /usr/local/bin/ttyd

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 10000

CMD ["sh", "-c", "test -n \"$TTYD_USER\" && test -n \"$TTYD_PASSWORD\" || { echo 'TTYD_USER and TTYD_PASSWORD are required'; exit 1; }; ttyd -W -i 0.0.0.0 -p ${PORT:-10000} -c \"$TTYD_USER:$TTYD_PASSWORD\" npm start"]