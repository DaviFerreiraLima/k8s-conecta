# =============================================================================
# (Bônus) Imagem do api-backend
# -----------------------------------------------------------------------------
# Build e carga da imagem direto no cluster kind (sem registry):
#   docker build -t api-backend:1.0 apps/backend-node
#   kind load docker-image api-backend:1.0 --name oficina
#
# Depois, em k8s/backend.yaml, troque a imagem "node:20-alpine" por
# "api-backend:1.0" (com imagePullPolicy: IfNotPresent) e remova o volume
# do ConfigMap e o "command" customizado.
# =============================================================================
FROM node:20-alpine

WORKDIR /app
COPY server.js .

ENV PORT=8080
EXPOSE 8080

# Boa prática: não rodar como root
USER node

CMD ["node", "server.js"]
