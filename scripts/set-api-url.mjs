// Gera src/environments/environment.production.ts a partir da variável API_URL.
// Na Vercel, cadastre API_URL com o endereço da API (ex.: https://minha-api.vercel.app).
// Sem API_URL, o site chama /api no próprio domínio (servidor com proxy, ex.: Nginx).
import { writeFileSync } from 'node:fs';

const apiUrl = (process.env.API_URL || '').trim().replace(/\/+$/, '');

if (apiUrl && !/^https:\/\/[^\s/]+$/.test(apiUrl)) {
  console.error(`API_URL inválida: "${apiUrl}". Use só o endereço, ex.: https://minha-api.vercel.app`);
  process.exit(1);
}
if (!apiUrl && process.env.VERCEL) {
  console.error('API_URL não definida. Cadastre-a em Settings > Environment Variables na Vercel.');
  process.exit(1);
}

writeFileSync(
  new URL('../src/environments/environment.production.ts', import.meta.url),
  `// Gerado por scripts/set-api-url.mjs. Não edite.\nexport const environment = {\n  apiUrl: ${JSON.stringify(apiUrl)},\n};\n`,
);
console.log(`API_URL: ${apiUrl || '(mesmo domínio)'}`);
