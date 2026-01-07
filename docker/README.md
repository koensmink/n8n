## Inhoud

- `docker-compose-basic.yml`
- `docker-compose-advanced.yml`
- `.env.example`
- `n8n-task-runners.json`

---

## Vereisten

- Docker Engine + Docker Compose v2 (`docker compose version`)
- (Aanrader) Reverse proxy met TLS als je n8n (publiek) aanbiedt (Nginx Proxy Manager / Traefik / Caddy)

---

## Verschillen tussen basic vs advanced

| Kenmerk | Basic | Advanced |
|---|---|---|
| Aantal containers | 1 | 3 (n8n + postgres + task-runners) |
| Database | SQLite (in `n8n_data` volume) | PostgreSQL (persistente bind mount) |
| Geschikt voor | test/dev, kleine setups | productie, grotere workflows, hogere betrouwbaarheid |
| Backups/restore | simpel maar minder robuust | robuust (DB dump / PITR opties) |
| Task runners | aan (in n8n) | **extern** (isolatie + meer controle) |
| Complexiteit | laag | middel |

**Waarom je welke kiest**
- Kies **basic** als je snel wilt draaien met minimale onderdelen, en je workload klein is (en je accepteert SQLite).
- Kies **advanced** als je productie-achtig wilt werken: betere DB, makkelijker schalen, en een duidelijker security boundary voor code-executie.

## Operations

### Logs bekijken
```bash
docker compose -f docker-compose-basic.yml logs -f n8n
# of:
docker compose -f docker-compose-advanced.yml logs -f n8n postgres task-runners
```

### Updates
```bash
docker compose -f docker-compose-advanced.yml pull
docker compose -f docker-compose-advanced.yml up -d
```

### Backup tips
- **Basic**: backup van het volume `n8n_data` (bijv. via `docker run --rm -v n8n_data:/data ... tar ...`).
- **Advanced**: maak een Postgres dump (aanrader):
  ```bash
  docker exec -t postgres pg_dump -U "$DB_POSTGRESDB_USER" "$DB_POSTGRESDB_DATABASE" > n8n.sql
  ```

## Security notes (kort & praktisch)

- Zet `N8N_SECURE_COOKIE=true` zodra je via HTTPS publiceert; anders kunnen sessie-cookies onveilig zijn.
- Gebruik sterke tokens/secrets (`DB_POSTGRESDB_PASSWORD`, `N8N_RUNNERS_AUTH_TOKEN`).
- Houd `N8N_RUNNERS_STDLIB_ALLOW` zo klein mogelijk (principle of least privilege).
- Publiceer bij voorkeur **alleen** via reverse proxy (geen directe `5678` exposure naar het internet), tenzij je bewust kiest voor die exposure.
