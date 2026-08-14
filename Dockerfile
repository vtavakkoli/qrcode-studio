FROM node:22-alpine
WORKDIR /app
COPY --chown=node:node index.html /app/index.html
COPY --chown=node:node scripts/serve.mjs /app/scripts/serve.mjs
USER node
ENV PORT=8080
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 CMD node -e "fetch('http://127.0.0.1:8080').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "scripts/serve.mjs"]
