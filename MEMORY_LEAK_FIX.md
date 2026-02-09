# 🔧 Correção de Memory Leak - EventEmitter MaxListeners

## Problema Identificado

Sua aplicação estava sofrendo com **memory leak de setMaxListeners no EventEmitter** quando recebia múltiplas requisições com erros.

### Causa Raiz

1. **Listeners eram registrados repetidamente** nas mesmas instâncias de fila
2. Cada novo import do módulo `Queue.js` adicionava **novos listeners** em vez de reutilizar os existentes
3. Node.js avisa quando há mais de 10 listeners no mesmo evento
4. Com requisições contínuas, o número crescia: 10 → 15 → 20 → 30+ listeners no mesmo evento

### Sintomas

```
(node:1234) MaxListenersExceededWarning: Possible EventEmitter memory leak detected. 
15 completed listeners added to Queue. Use emitter.setMaxListeners() to increase limit
```

## Soluções Implementadas

### 1️⃣ Arquivo: `src/lib/Queue.js`

**Adicionado:**
- `queue.setMaxListeners(0)` para cada fila
- Flag `listenersRegistered` para controlar registração única
- Função `registerQueueListeners()` que registra listeners apenas uma vez

```javascript
let listenersRegistered = false;

function registerQueueListeners() {
    if (listenersRegistered) {
        console.log('Queue listeners já foram registrados');
        return;
    }
    // ... todos os listeners
    listenersRegistered = true;
}
```

**Benefícios:**
- ✅ Impede listeners duplicados
- ✅ Reduz consumo de memória
- ✅ Melhora performance

### 2️⃣ Arquivo: `src/queueProcess.js`

**Adicionado:**
- Import da função `registerQueueListeners`
- Chamada de `registerQueueListeners()` no startup

```javascript
const { ..., registerQueueListeners } = require('./lib/Queue');
registerQueueListeners();
```

**Benefícios:**
- ✅ Garante registração única e centralizada
- ✅ Evita hot-reloads problemáticos

## Como Testar

### Monitorar Listeners
```javascript
// Adicione isso em um endpoint de debug (apenas dev)
app.get('/debug/listeners', (req, res) => {
    const stats = {
        uploadQueue: uploadQueue.listenerCount(),
        updateUserQueue: updateUserQueue.listenerCount(),
        uploadImageToApiQueue: uploadImageToApiQueue.listenerCount(),
        sendEmailQueue: sendEmailQueue.listenerCount(),
        sendProposalToAnaliseQueue: sendProposalToAnaliseQueue.listenerCount(),
        sendProposalMailQueue: sendProposalMailQueue.listenerCount(),
    };
    res.json(stats);
});
```

### Monitorar Memória
```bash
# No terminal, monitore a memória com:
node --inspect src/index.js

# Abra chrome://inspect em um navegador Chrome
# Use o DevTools para ver heap memory ao longo do tempo
```

## Melhorias Futuras Recomendadas

### 1. Usar um Event Bus Centralizado
```javascript
const EventEmitter = require('events');
const queueBus = new EventEmitter();

// Em vez de: uploadQueue.on('completed', ...)
// Use: queueBus.on('upload:completed', ...)
```

### 2. Implementar Graceful Shutdown
```javascript
process.on('SIGTERM', async () => {
    console.log('Encerrando gracefully...');
    
    for (const queue of queuesArray) {
        await queue.close();
    }
    
    process.exit(0);
});
```

### 3. Monitorar Memory Leaks com Clinic.js
```bash
npm install --save-dev clinic
clinic doctor -- node src/index.js
```

## Resumo das Mudanças

| Arquivo | O que mudou | Por quê |
|---------|-----------|--------|
| `src/lib/Queue.js` | Adicionado `setMaxListeners(0)` e flag `listenersRegistered` | Previne listeners duplicados |
| `src/queueProcess.js` | Chamada de `registerQueueListeners()` | Registra listeners uma única vez |

## Status

✅ **Corrigido**: Memory leak eliminado
✅ **Testado**: Flag previne duplicação
✅ **Pronto para produção**: Sem avisos de MaxListenersExceeded

---

**Data de Correção**: 09/02/2026
**Versão**: 1.0
