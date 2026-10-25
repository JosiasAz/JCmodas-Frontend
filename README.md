# JC Moda Masculina — Site (front-end)

Loja virtual da JC Moda Masculina: vitrine, carrinho, checkout e painel do lojista.

**Tecnologias:** Angular 21 (componentes standalone, signals, lazy loading, sem zone.js).

Os dados vêm da API (FastAPI), que fica em outro repositório. O site chama sempre `/api/...` e
`/static/...` no mesmo endereço em que está aberto.

## Como rodar

Pré-requisitos: Node.js 20.19 ou mais novo e a API rodando em `http://localhost:8000`.

```bash
npm install
npm start
```

Abra http://localhost:4200. Em desenvolvimento, as chamadas `/api` e `/static` são encaminhadas
para a API pelo [proxy.conf.json](proxy.conf.json). Se a API estiver em outra porta, mude ali.

Painel do lojista: http://localhost:4200/admin (ou "Área do lojista" no rodapé), com o e-mail e a
senha de administrador configurados na API.

## O que o site faz

**Para o cliente**
- Página inicial com carrossel de anúncios, categorias, ofertas, combos, mais vendidos e novidades
- Catálogo com busca, filtros (categoria, tamanho, cor, preço, só promoções), ordenação e paginação
- Página do produto com galeria, cor/tamanho com estoque, "últimas unidades", parcelamento e preço no Pix
- Combos com escolha de tamanho para cada peça
- Carrinho com cupom, barra de "falta X para frete grátis" e checagem de estoque em tempo real
- Checkout em 3 passos: dados, entrega (casa ou retirada, com endereço pelo CEP) e pagamento
  (Pix com desconto, cartão parcelado ou dinheiro)
- Confirmação com chave Pix e botão "Enviar pedido no WhatsApp"
- Acompanhamento do pedido pelo código + telefone
- Página de política de privacidade (`/privacidade`)
- Botão flutuante de WhatsApp

**Para o lojista (painel em `/admin`)**
- **Resumo:** faturamento, pedidos, ticket médio, vendas por dia, mais vendidos, estoque baixo
- **Pedidos:** filtro por status, busca, mudança de status, conversa no WhatsApp, anonimização de pedidos antigos
- **Produtos:** fotos, preço "de/por", destaque, selo "Novo", grade de tamanhos com estoque
- **Categorias**, **Promoções** (%, R$ ou "Leve X Pague Y"), **Cupons**, **Combos**
- **Anúncios:** banners, cartões e faixas, com prévia ao vivo e agendamento
- **Usuários:** acesso ao painel, troca de senha e verificação em duas etapas
- **Atividades:** histórico de quem alterou o quê
- **Configurações:** aviso do topo, contato, frete, Pix, parcelas, prazo de pedidos e política de privacidade

O site nunca calcula preços sozinho: totais, promoções, cupom e frete vêm sempre da API.

## Comandos

| Comando | O que faz |
|---|---|
| `npm start` | servidor de desenvolvimento em http://localhost:4200 |
| `npm run build` | gera a versão de produção em `dist/frontend/browser` |
| `npm test` | testes unitários |
| `npm audit --omit=dev` | procura falhas conhecidas nas bibliotecas (rodar antes de publicar) |

## Estrutura

```
public/
  logo/        logo em SVG e PNG (todas as versões)
  favicon.svg
src/
  app/
    core/      serviços (API, carrinho, login, avisos) e tipos
    shared/    ícones, card de produto, formatação de moeda
    store/     páginas da loja
    admin/     páginas do painel
  styles.scss  estilos globais e cores
```

### Logo

| Arquivo (`public/logo/`) | Uso |
|---|---|
| `jc-logo.svg` / `.png` | versão original (JC + "Moda Masculina" embaixo) |
| `jc-logo-branca.svg` / `.png` | para fundos escuros |
| `jc-logo-horizontal.svg` / `.png` | cabeçalho do site, assinaturas |
| `jc-logo-horizontal-branca.svg` | rodapé e painel |
| `jc-icone.svg` / `.png` / `-512.png` | ícone do site, redes sociais, favicon |

## Publicar

1. `npm run build` e copie `dist/frontend/browser` para o servidor.
2. O site e a API precisam ficar **no mesmo domínio**: o servidor entrega os arquivos do site e
   encaminha `/api` e `/static` para a API. Exemplo com Nginx:

   ```nginx
   server {
       listen 443 ssl;
       server_name www.seudominio.com.br;
       root /var/www/jcmoda;

       location /api/    { proxy_pass http://127.0.0.1:8000; proxy_set_header X-Forwarded-For $remote_addr; }
       location /static/ { proxy_pass http://127.0.0.1:8000; }

       # rotas do Angular (/produto/..., /admin, ...) caem no index.html
       location / { try_files $uri $uri/ /index.html; }

       add_header Content-Security-Policy "default-src 'self'; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; font-src 'self'; connect-src 'self' https://viacep.com.br; frame-ancestors 'none'; base-uri 'self'; form-action 'self'" always;
       add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
       add_header X-Content-Type-Options "nosniff" always;
       add_header Referrer-Policy "strict-origin-when-cross-origin" always;
   }
   ```
3. HTTPS obrigatório (Let's Encrypt ou Cloudflare): sem ele, senha e login do painel trafegam abertos.
4. Na API, coloque o endereço `https://` do site em `CORS_ORIGINS`.

## Privacidade

- As fontes (Inter e Playfair Display) são servidas pelo próprio site, sem Google Fonts.
- O único serviço externo chamado pelo navegador é o ViaCEP, para preencher o endereço pelo CEP.
- O navegador guarda o carrinho e o login do painel. Os dados do checkout só são guardados se o
  cliente marcar "lembrar meus dados".
