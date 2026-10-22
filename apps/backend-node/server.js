// =============================================================================
// api-backend — Servidor HTTP mínimo (sem dependências) para a Oficina K8s
// -----------------------------------------------------------------------------
// Cada requisição responde com a "identidade" do Pod que a atendeu:
//   - hostname  -> no Kubernetes, é o NOME DO POD
//   - ip        -> IP interno do Pod na rede do cluster
//   - uri       -> caminho requisitado
//   - time      -> horário da resposta
// =============================================================================
const http = require('http');
const os = require('os');

const PORT = Number(process.env.PORT) || 8080;
const HOSTNAME = process.env.POD_NAME || os.hostname();
const STARTED_AT = new Date().toISOString();
let requestCount = 0;

function getPodIP() {
  if (process.env.POD_IP) return process.env.POD_IP;
  for (const ifaces of Object.values(os.networkInterfaces())) {
    for (const iface of ifaces || []) {
      if (iface.family === 'IPv4' && !iface.internal) return iface.address;
    }
  }
  return '127.0.0.1';
}
const POD_IP = getPodIP();

const server = http.createServer((req, res) => {
  // Endpoint usado pela readinessProbe/livenessProbe do Kubernetes
  if (req.url === '/healthz') {
    res.writeHead(200, { 'Content-Type': 'text/plain' });
    return res.end('ok\n');
  }

  requestCount++;
  const body = {
    message: 'Olá do api-backend! 👋',
    hostname: HOSTNAME,
    ip: POD_IP,
    uri: req.url,
    method: req.method,
    time: new Date().toISOString(),
    startedAt: STARTED_AT,
    requestsServed: requestCount,
    calledBy: req.headers['x-frontend-pod'] || req.socket.remoteAddress,
  };

  console.log(`[${body.time}] ${req.method} ${req.url} <- ${body.calledBy} (#${requestCount})`);
  res.writeHead(200, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
  });
  res.end(JSON.stringify(body, null, 2) + '\n');
});

server.listen(PORT, () => {
  console.log(`api-backend ouvindo na porta ${PORT} | pod=${HOSTNAME} ip=${POD_IP}`);
});

// Encerramento gracioso: o Kubernetes envia SIGTERM ao apagar um Pod
function shutdown(signal) {
  console.log(`${signal} recebido, encerrando...`);
  server.close(() => process.exit(0));
  setTimeout(() => process.exit(0), 3000).unref();
}
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
