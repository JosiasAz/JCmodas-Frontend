# JC Moda Masculina - Site

Loja virtual da **JC Moda Masculina**, com vitrine, carrinho, checkout e painel administrativo.

Os dados são fornecidos pela API da loja, mantida em um repositório separado.

## Funcionalidades

**Loja**
- Página inicial com banners, categorias, ofertas, combos e novidades
- Catálogo com busca, filtros e ordenação
- Página do produto com galeria, cores, tamanhos e disponibilidade em estoque
- Carrinho com cupom de desconto e cálculo de frete
- Checkout com preenchimento de endereço pelo CEP e pagamento via Pix, cartão ou dinheiro
- Envio do pedido pelo WhatsApp e acompanhamento pelo código do pedido
- Página de política de privacidade

**Painel administrativo** (`/admin`)
- Resumo de vendas e estoque
- Gestão de pedidos, produtos, categorias, promoções, cupons, combos e anúncios
- Gestão de usuários com autenticação em duas etapas
- Histórico de alterações
- Configurações da loja (contato, frete, pagamento e política de privacidade)

## Tecnologias

- [Angular](https://angular.dev/)
- [TypeScript](https://www.typescriptlang.org/)
- [SCSS](https://sass-lang.com/)

## Pré-requisitos

- [Node.js](https://nodejs.org/) 20.19 ou superior
- API da loja em execução (por padrão em `http://localhost:8000`)

## Instalação

```bash
git clone <url-do-repositorio>
cd <pasta-do-repositorio>
npm install
```

## Execução

```bash
npm start
```

Acesse http://localhost:4200.

Durante o desenvolvimento, as requisições para `/api` e `/static` são encaminhadas para a API
conforme o arquivo `proxy.conf.json`. Altere esse arquivo caso a API esteja em outro endereço.

## Scripts

| Comando | Descrição |
|---|---|
| `npm start` | Inicia o servidor de desenvolvimento |
| `npm run build` | Gera a versão de produção em `dist/frontend/browser` |
| `npm test` | Executa os testes unitários |

## Estrutura do projeto

```
public/
└── logo/        # logotipos em SVG e PNG
src/
├── app/
│   ├── core/    # serviços, autenticação e tipos
│   ├── shared/  # componentes reutilizáveis
│   ├── store/   # páginas da loja
│   └── admin/   # páginas do painel administrativo
├── index.html
└── styles.scss  # estilos globais
```

## Implantação

1. Gere a versão de produção:

   ```bash
   npm run build
   ```

2. Publique o conteúdo de `dist/frontend/browser` em um servidor web com HTTPS.
3. Configure o servidor para:
   - encaminhar `/api` e `/static` para a API;
   - redirecionar as demais rotas para `index.html`.

Exemplo de configuração com Nginx:

```nginx
server {
    listen 443 ssl;
    server_name www.seudominio.com.br;
    root /var/www/jcmoda;

    location /api/    { proxy_pass http://127.0.0.1:8000; }
    location /static/ { proxy_pass http://127.0.0.1:8000; }
    location /        { try_files $uri $uri/ /index.html; }
}
```

## Licença

Projeto proprietário. Todos os direitos reservados. Consulte o arquivo [LICENSE](LICENSE).
