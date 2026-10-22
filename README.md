# 🚀 Oficina Prática: Orquestração de Contêineres com Kubernetes

Bem-vindo(a) ao repositório oficial da nossa oficina! Neste laboratório guiado de **80 minutos**, vamos criar um cluster Kubernetes local usando o **kind** e provisionar duas aplicações que conversam internamente via **HTTP** e **DNS** utilizando `Pods`, `Deployments` e `Services`.

---

## 📂 Estrutura do Repositório

```text
oficina-kubernetes/
├── README.md                 # Este guia passo a passo da oficina
├── k8s/
│   ├── kind-config.yaml      # Configuração opcional do cluster kind
│   ├── backend.yaml          # Deployment (3 réplicas) + Service (api-service)
│   └── frontend.yaml         # Painel Visual Web + Proxy DNS + Service (frontend-svc)
└── apps/                     # (Bônus) Código-fonte e Dockerfile para estudo de Build
    └── backend-node/
        ├── server.js
        └── Dockerfile
```

---

## 🎯 Arquitetura que Vamos Construir

Vamos provisionar duas aplicações dentro do cluster Kubernetes:

1. **Aplicação B — Backend (`api-backend`)**:
   - Um `Deployment` com **3 Pods (réplicas)** rodando simultaneamente.
   - Exposto internamente na rede do cluster por um `Service` do tipo `ClusterIP` chamado **`api-service`** na porta `8080`.
   - Cada Pod responde com seu **Hostname (Nome do Pod)**, **Endereço IP interno**, **URI** e **Horário**.

2. **Aplicação A — Frontend Visual (`web-frontend`)**:
   - Uma aplicação web interativa com um dashboard em tempo real.
   - Quando você clica em **"Disparar Requisição HTTP"** no navegador, o Pod do Frontend faz uma chamada HTTP interna para `http://api-service:8080` (resolvida pelo **CoreDNS** do Kubernetes) e exibe visualmente qual dos 3 Pods do Backend atendeu à requisição!

```text
[ Seu Navegador: http://localhost:8080 ]
                 │
                 │ (kubectl port-forward)
                 ▼
┌─────────────────────────────────────────────────────────────────┐
│ Cluster Kubernetes (kind-oficina)                               │
│                                                                 │
│  ┌──────────────────────────┐                                   │
│  │ Pod: web-frontend        │                                   │
│  │ (Interface + Proxy HTTP) │                                   │
│  └─────────────┬────────────┘                                   │
│                │                                                │
│                │ 1. Consulta DNS: "Quem é api-service?"         │
│                │ 2. Chamada HTTP: GET http://api-service:8080   │
│                ▼                                                │
│  ┌──────────────────────────┐                                   │
│  │ Service: api-service     │  (IP Fixo Virtual / Balanceador)  │
│  └─────────────┬────────────┘                                   │
│       ┌────────┴────────┬────────────────────┐                  │
│       ▼                 ▼                    ▼                  │
│  ┌──────────┐      ┌──────────┐         ┌──────────┐            │
│  │ Pod #1   │      │ Pod #2   │         │ Pod #3   │            │
│  │ Backend  │      │ Backend  │         │ Backend  │            │
│  └──────────┘      └──────────┘         └──────────┘            │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Pré-requisitos

No seu terminal, valide se as ferramentas estão instaladas e respondendo:

```bash
docker --version
kind --version
kubectl version --client
```

---

## ⏱️ Roteiro Guiado (Passo a Passo)

### Etapa 1: Criando o Cluster Kubernetes com `kind` (15 min)

1. Clone este repositório e acesse a pasta do projeto:
```bash
git clone https://github.com/DaviFerreiraLima/k8s-conecta.git
cd k8s-conecta
```

2. Crie o cluster Kubernetes local chamado `oficina`:
```bash
kind create cluster --name conecta
```

3. Verifique se o seu `kubectl` já está apontando para o cluster recém-criado e liste os nós (Nodes):
```bash
kubectl cluster-info --context kind-conecta
kubectl get nodes -o wide
```

4. Veja que o `kind` nada mais é do que um contêiner Docker rodando os componentes do Kubernetes:
```bash
docker ps
```

---

### Etapa 2: Subindo a Aplicação Backend e o Service DNS (20 min)

1. Aplique o manifesto do Backend (`k8s/backend.yaml`):
```bash
kubectl apply -f k8s/backend.yaml
```

2. Verifique os Pods sendo criados e descubra o **IP interno** que cada um recebeu:
```bash
kubectl get pods -l app=api-backend -o wide
```

3. Inspecione o `Service` criado (`api-service`) e veja os `Endpoints` (os IPs dos 3 Pods que estão pendurados atrás desse Service):
```bash
kubectl get service api-service
kubectl get endpoints api-service
```

4. **Testando DNS e HTTP via Terminal (Raio-X da Rede):**

```bash
kubectl run teste-rede --rm -it --image=curlimages/curl --restart=Never -- curl -i http://api-service:8080
```
> 💡 **Observe a mágica:** O CoreDNS traduziu o nome `api-service` para o IP do Service, e o Service respondeu com os dados de um dos Pods!

---

### Etapa 3: Subindo a Aplicação Frontend Visual (25 min)

Agora vamos subir a aplicação `web-frontend`, que possui uma interface gráfica e conversa internamente com `http://api-service:8080`.

1. Aplique o manifesto do Frontend (`k8s/frontend.yaml`):
```bash
kubectl apply -f k8s/frontend.yaml
```

2. Aguarde o Pod do Frontend ficar com status `Running`:
```bash
kubectl get pods -l app=web-frontend
kubectl get services
```

---

### Etapa 4: Visualizando no Navegador e Testando Resiliência (20 min)

1. Crie um túnel da porta `8080` da sua máquina para a porta `80` do `frontend-svc`:
```bash
kubectl port-forward svc/frontend-svc 8080:80
```

2. Abra o seu navegador em:
👉 **[http://localhost:8080](http://localhost:8080)**

#### 🧪 Experimento 1: Balanceamento de Carga Visual
- Clique várias vezes no botão **"⚡ Disparar Requisição HTTP"** (ou ative o botão **"🔄 Auto-Disparo"**).
- Observe o **Placar de Réplicas** no painel: cada clique é roteado para um Pod diferente do Backend, exibindo o nome do Pod e o IP interno dele!

#### 🧪 Experimento 2: Auto-Recuperação (Self-Healing)
- Abra uma **segunda aba no terminal** (mantenha o `port-forward` ativo na primeira).
- Ative o **"🔄 Auto-Disparo"** no navegador.
- No segundo terminal, apague um dos Pods de Backend à força:
```bash
kubectl get pods -l app=api-backend
kubectl delete pod <COLE_O_NOME_DE_UM_POD_AQUI>
```
- Olhe para o navegador! A comunicação não cai e um novo Pod com novo nome e novo IP aparece automaticamente no placar em poucos segundos!

#### 🧪 Experimento 3: Escalonamento Horizontal (Scaling)
- Com o painel aberto no navegador, escale o Backend de 3 para 6 réplicas com um único comando:
```bash
kubectl scale deployment api-backend --replicas=6
```
- Veja no navegador que agora **6 Pods diferentes** começam a dividir as requisições HTTP!

---

## 🧹 Limpando o Ambiente

Ao concluir a oficina, remova o cluster local com:
```bash
kind delete cluster --name oficina
```