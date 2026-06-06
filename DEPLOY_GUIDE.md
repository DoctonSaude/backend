# Guia de Deploy do Backend Docton Saúde

## Passo 1: Preparar o Projeto

1. Certifique-se de que o arquivo `backend/.gitignore` inclua:
   ```
   node_modules
   dist
   .env
   *.log
   ```

## Passo 2: Configurar o Railway

1. Acesse https://railway.app/ e crie uma conta.
2. Clique em "New Project" > "Empty Project".
3. Adicione um "PostgreSQL" no menu "Add Service".
4. Adicione um "GitHub Repo" conectando seu repositório.
5. Vá para "Settings" > "Environment" e adicione as variáveis abaixo:

### Variáveis de Ambiente Obrigatórias

```
DATABASE_URL=... (copie do service PostgreSQL no Railway)
JWT_SECRET=sua_chave_secreta_super_forte_aqui
PORT=3001
NODE_ENV=production
```

## Passo 3: Configurar Build e Deploy

1. No painel do service GitHub, vá para "Deploy" > "Deployments".
2. Clique em "Trigger Deploy" para iniciar o deploy.
3. O Railway automaticamente vai:
   - Executar `npm install`
   - Executar `prisma generate` e `prisma migrate deploy`
   - Executar `npm run build`
   - Iniciar o servidor com `npm start`

## Passo 4: Testar a API

Quando o deploy finalizar, clique em "Domains" no painel do Railway para obter a URL pública da API (ex: `https://docton-backend.railway.app`).

Teste o endpoint de health:
`GET https://sua-url.railway.app/api/health`

## Observações

- Para migrar o banco de dados, o Railway usa automaticamente o script `prisma migrate deploy`.
- As rotas CORS já estão configuradas para aceitar requisições de `https://app.docton.com.br` e outros domínios.
