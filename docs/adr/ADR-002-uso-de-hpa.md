# ADR-002 — Escalabilidade horizontal com HPA

| | |
|---|---|
| **Status** | Aceita |
| **Data** | 2026-09-09 |
| **Relacionados** | [RFC-002 — Escolha da nuvem](../rfc/RFC-002-escolha-da-nuvem.md) |

## Contexto

A fase exige **escalabilidade e alta disponibilidade**: a aplicação precisa aguentar variação de carga (múltiplas unidades, base de clientes crescente) sem intervenção manual. Rodando em Kubernetes (EKS), há várias formas de escalar a API:

- **Réplicas fixas** — simples, mas ou desperdiça recurso ocioso ou fica curto no pico.
- **HorizontalPodAutoscaler (HPA)** — ajusta o número de réplicas por métrica (CPU/memória).
- **VerticalPodAutoscaler (VPA)** — ajusta requests/limits do pod, mas reinicia o pod para aplicar.
- **KEDA** — autoscaling por eventos/filas; poderoso, mas sem fila no fluxo atual.

## Decisão

Usar **HorizontalPodAutoscaler** para a API, escalando por **CPU e memória**:

- `minReplicas: 2`, `maxReplicas: 10`
- Alvos: **CPU 70%** e **memória 80%** de utilização média (percentual sobre o `resources.requests`)
- Requer o **metrics-server** no cluster (instalado no `fase3-infra-k8s`), que fornece as métricas de utilização.
- `resources.requests`/`limits` são **obrigatórios** no Deployment — são o denominador do cálculo do HPA.

O piso de **2 réplicas** também serve à disponibilidade (o serviço nunca roda com um único pod), reforçado por PodDisruptionBudget e topologySpread (ver o Deployment da aplicação).

## Consequências

### Positivas
- A API sobe/desce réplicas sozinha conforme a carga real, sem intervenção.
- Piso de 2 réplicas dá disponibilidade mínima; teto de 10 limita o custo.
- Padrão nativo do Kubernetes, sem componente extra além do metrics-server.

### Negativas / trade-offs
- **Requer capacidade de nós:** se o HPA pedir mais réplicas do que os nós comportam, os pods ficam `Pending`. O teto de 10 pressupõe capacidade — o autoscaling **de nós** (Cluster Autoscaler/Karpenter) é uma evolução de infraestrutura ainda não adotada.
- **Sensível ao `resources.requests`:** um request de memória muito baixo faz a utilização bater no alvo (80%) mesmo ocioso, disparando escala sem carga real. Por isso o request de memória foi calibrado (256Mi) para a API não "flapar".
- Escala reativa (por métrica), não preditiva — picos muito abruptos sobem réplicas com alguns segundos de atraso, absorvidos pelo piso de 2 réplicas + readiness probes.
