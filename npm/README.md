##  Path-based allowlisting 

In **Nginx Proxy Manager**:

1. Ga naar **Proxy Hosts**
2. Open `<domein naam>`
3. Ga naar **Advanced**
4. Voeg onderstaande configuratie toe

### Custom Nginx Configuration

```nginx
# Sta ALLEEN webhooks toe op dit subdomein
# n8n gebruikt standaard /webhook/ en /webhook-test/
if ($request_uri !~ ^/(webhook|webhook-test)/) {
    return 404;
}
```

### Effect

| URL | Resultaat |
|----|----|
| `https://hooks-public-1.../` | 404 (geen login pagina) |
| `https://hooks-public-1.../webhook/<id>` | Toegestaan |
| `https://hooks-public-1.../webhook-test/<id>` | Toegestaan |

> Wil je harder droppen (minder informatielek), vervang `404` door `444`.





## Licentie

Vrij te gebruiken. Geen garanties. Security blijft context-afhankelijk.

