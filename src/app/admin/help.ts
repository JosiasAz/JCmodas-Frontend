import { ChangeDetectionStrategy, Component, computed, effect, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { Icon } from '../shared/icon';

interface Topic {
  id: string;
  group: string;
  icon: string;
  title: string;
  summary: string;
  link?: string;
  linkLabel?: string;
  steps?: string[];
  example?: { title: string; lines: string[] };
  tips?: string[];
}

// Textos com <b> são do próprio painel (não vêm de usuário), por isso podem ir por [innerHTML].
const TOPICS: Topic[] = [
  // ------------------------------------------------------------ comece aqui
  {
    id: 'configuracoes',
    group: 'Comece aqui',
    icon: 'settings',
    title: 'Configurar a loja',
    summary: 'Contato, endereço, frete, Pix e parcelas. É a primeira coisa a fazer.',
    link: '/admin/configuracoes',
    linkLabel: 'Abrir Configurações',
    steps: [
      'Em <b>Contato</b>, cole o <b>WhatsApp</b> do jeito que vier (com +55, espaços ou traços, o painel arruma). É por ele que o cliente tira dúvidas e manda o comprovante.',
      'Preencha o <b>CEP da loja</b>: o endereço completa sozinho. O frete usa esse CEP para saber de onde o pedido sai.',
      'Em <b>Entrega</b>, coloque o valor do frete <b>na cidade da loja</b>, <b>no mesmo estado</b> e <b>em outros estados</b>. O cliente vê o valor certo assim que digita o CEP dele.',
      'Se quiser, defina <b>frete grátis acima de</b> um valor (0 = sem frete grátis). Isso aparece no topo da loja como vantagem.',
      'Em <b>Pagamento</b>, cole a <b>chave Pix</b> e escolha o <b>desconto no Pix</b> e as <b>parcelas sem juros</b> no cartão.',
      'Em <b>Pedidos e estoque</b>, escolha em quantas horas um pedido <b>não pago</b> é cancelado sozinho. O estoque reservado volta para a loja.',
      'Clique em <b>Salvar</b> no fim da página.',
    ],
    example: {
      title: 'Exemplo para uma loja em Manaus',
      lines: [
        'Na cidade da loja: R$ 10,00 · No mesmo estado: R$ 25,00 · Outros estados: R$ 45,00',
        'Frete grátis acima de R$ 299,00',
        'Desconto no Pix: 5% · Parcelas sem juros: 6x',
        'Cancelar pedido não pago depois de: 24 horas',
      ],
    },
    tips: [
      'Um desconto pequeno no Pix (5%) faz muita gente escolher Pix, e o dinheiro cai na hora, sem taxa de maquininha.',
      'Frete grátis um pouco acima do seu ticket médio (veja em <b>Início</b>) faz o cliente colocar mais uma peça no carrinho.',
      'O <b>Aviso no topo do site</b> é ótimo para campanhas curtas: "Frete grátis só neste fim de semana". Deixe vazio para esconder.',
    ],
  },
  {
    id: 'seguranca',
    group: 'Comece aqui',
    icon: 'shield',
    title: 'Proteger o acesso (verificação em duas etapas)',
    summary: 'Além da senha, o painel pede um código do celular. Impede que alguém entre com uma senha vazada.',
    link: '/admin/conta',
    linkLabel: 'Abrir Minha conta',
    steps: [
      'Instale no celular um app autenticador, como <b>Google Authenticator</b> ou <b>Microsoft Authenticator</b>.',
      'Em <b>Minha conta</b>, clique em <b>Ativar agora</b>.',
      'No app, toque em <b>adicionar conta</b> → <b>inserir chave</b> e digite a chave que aparece na tela (o botão <b>Copiar</b> ajuda). No celular, dá para tocar no link e o app abre sozinho.',
      'Digite o código de 6 dígitos que o app mostra para confirmar.',
      'Daqui em diante, ao entrar no painel, digite a senha e depois o código do app (ele muda a cada 30 segundos).',
    ],
    tips: [
      'Faça isso antes de cadastrar a equipe. Em <b>Equipe</b> aparece um aviso de quem ainda está sem a verificação.',
      'Nunca mande a senha do painel por grupo de WhatsApp. Se precisar enviar, use uma conversa privada e peça para a pessoa trocar.',
    ],
  },

  // ------------------------------------------------------------ catálogo
  {
    id: 'categorias',
    group: 'Catálogo',
    icon: 'grid',
    title: 'Categorias',
    summary: 'Organizam a vitrine e os filtros. Aparecem em círculos em "Compre por categoria" na página inicial.',
    link: '/admin/categorias',
    linkLabel: 'Abrir Categorias',
    steps: [
      'Clique em <b>Nova categoria</b> e dê um nome curto: "Camisetas", "Polos", "Bermudas".',
      'Em <b>Ordem de exibição</b>, números menores aparecem primeiro. Coloque 1 na categoria que mais vende.',
      'Em <b>Imagem</b>, envie uma foto. Abre a janela de ajuste com a moldura <b>redonda</b>, igual à da loja: arraste para posicionar, use a barrinha para aproximar ou o botão <b>Foto inteira</b> para a peça caber toda no círculo.',
      'Se quiser, monte a <b>Tabela de medidas</b>: escolha um modelo (camisetas ou calças) e preencha os centímetros. Ela aparece no produto em "Qual meu tamanho?".',
      'Deixe marcado <b>Mostrar na loja</b> e salve.',
    ],
    example: {
      title: 'Uma boa lista de categorias para moda masculina',
      lines: ['1 · Camisetas', '2 · Camisas', '3 · Polos', '4 · Bermudas', '5 · Calças', '6 · Acessórios'],
    },
    tips: [
      'Poucas categorias é melhor que muitas. Entre 4 e 8 o cliente acha tudo rápido.',
      'Para a foto da categoria, use uma peça bonita sobre fundo claro. No círculo, a peça inteira (botão <b>Foto inteira</b>) fica mais bonita que um pedaço cortado.',
      'Para trocar só o enquadramento de uma foto já enviada, abra a categoria e clique em <b>Ajustar</b>, embaixo da miniatura.',
      'A tabela de medidas evita troca por tamanho errado: meça a peça deitada na mesa.',
    ],
  },
  {
    id: 'produtos',
    group: 'Catálogo',
    icon: 'tag',
    title: 'Cadastrar um produto',
    summary: 'Nome, preço, fotos, cores, tamanhos e estoque. Com as cores ligadas às fotos, a foto troca quando o cliente escolhe a cor.',
    link: '/admin/produtos',
    linkLabel: 'Abrir Produtos',
    steps: [
      'Clique em <b>Novo produto</b>. No celular, o botão redondo da câmera já abre o cadastro com as fotos que você tirar.',
      'Preencha o <b>nome</b>, a <b>categoria</b> e o <b>preço de venda</b>. O <b>preço "de"</b> é opcional: ele aparece riscado ao lado, mostrando o desconto.',
      'Escreva uma <b>descrição</b> curta: tecido, caimento, como usar.',
      'Em <b>Fotos</b>, clique em <b>Adicionar fotos</b> e envie várias de uma vez. A primeira é a <b>Capa</b>. Para trocar, clique em <b>Capa</b> embaixo de outra foto.',
      'Em <b>Tamanhos e estoque</b>, digite as <b>cores separadas por vírgula</b> e clique na grade de tamanhos (ex.: <b>+ P ao GG</b>). O painel cria todos os tamanhos de cada cor de uma vez.',
      'Preencha o <b>estoque</b> de cada linha. Linha com 0 aparece riscada na loja (esgotado).',
      'Volte às fotos: embaixo de cada uma escolha <b>a cor dela</b>. Foto que serve para todas (detalhe, etiqueta) fica em "Cor: todas".',
      'Marque <b>Selo "Novo"</b> para lançamentos e clique em <b>Salvar produto</b>.',
    ],
    example: {
      title: 'Exemplo: camiseta em 3 cores',
      lines: [
        'Nome: Camisa Oversized OFF-WHITE · Categoria: Camisetas',
        'Preço de venda: R$ 90,00 · Preço "de": R$ 100,00 (aparece -10%)',
        'Cores: Azul, Roxo, Preta → clique em "+ P ao GG" → 12 linhas criadas (4 tamanhos × 3 cores)',
        'Fotos: foto azul → "Azul", foto roxa → "Roxo", foto preta → "Preta"',
        'Na loja: o cliente clica em "Roxo" e a foto da camisa roxa aparece',
      ],
    },
    tips: [
      'Escreva as cores sempre do mesmo jeito ("Preta", não às vezes "Preto"). Cada nome diferente vira um botão diferente na loja.',
      'Enquanto alguma cor estiver sem foto, aparece um aviso dizendo quais faltam.',
      '<b>Destaque</b> faz o produto aparecer primeiro na loja, na ordem "Relevância".',
      'Para esconder uma peça sem apagar (ex.: fora de estação), clique no status <b>Na loja</b> na lista: vira <b>Escondido</b>.',
      'Apagar um produto não estraga pedidos antigos: eles guardam uma cópia do que foi comprado.',
      'Estoque baixo (3 unidades ou menos) aparece em <b>Início</b>, com link direto para o produto.',
    ],
  },
  {
    id: 'fotos',
    group: 'Catálogo',
    icon: 'camera',
    title: 'Fotos que vendem',
    summary: 'Dicas práticas para fotografar as peças com o celular.',
    tips: [
      'Use <b>luz natural</b>, perto de uma janela, sem sol direto. Evite flash.',
      'Fundo <b>liso e claro</b> (parede branca, lençol esticado). O foco fica na roupa.',
      'Fotografe <b>em pé</b> (vertical). A loja mostra as fotos no formato retrato 4:5.',
      'Mesma distância e mesmo enquadramento para todas as cores: na loja, trocar de cor parece trocar só a cor.',
      'Faça pelo menos: <b>frente</b>, <b>costas</b> e um <b>detalhe</b> (estampa, tecido, etiqueta).',
      'Peça vestida em alguém (ou no cabide, bem passada) vende mais que peça dobrada.',
      'Não precisa reduzir as fotos: o painel diminui o tamanho sozinho antes de enviar.',
    ],
  },

  // ------------------------------------------------------------ marketing
  {
    id: 'anuncios',
    group: 'Marketing',
    icon: 'megaphone',
    title: 'Anúncios (banners da página inicial)',
    summary: 'Chamadas grandes com título, botão e imagem. Podem ter data para começar e acabar.',
    link: '/admin/anuncios',
    linkLabel: 'Abrir Anúncios',
    steps: [
      'Clique em <b>Novo anúncio</b> e escolha <b>onde aparece</b>: <b>Carrossel do topo</b> (o primeiro que o cliente vê), <b>Cartão</b> (dois lado a lado no meio da página) ou <b>Faixa</b> (faixa larga com chamada e botão).',
      'Escreva o <b>título</b> (curto, até umas 5 palavras) e o <b>subtítulo</b> (o detalhe da oferta).',
      'Em <b>Texto do botão</b> e <b>Leva para</b>, escolha para onde o cliente vai: promoções, combos, novidades, mais vendidos ou uma categoria.',
      'Escolha as <b>cores</b> prontas ou personalize fundo e texto.',
      'Envie a <b>imagem</b>. A janela de ajuste já mostra o formato do anúncio. Ajuste e clique em <b>Usar imagem</b>.',
      'Use <b>Início</b> e <b>Fim</b> para campanhas com data. Vazio = começa agora e não acaba.',
      'A pré-visualização no topo da janela mostra como fica. Salve.',
    ],
    example: {
      title: 'Exemplos de anúncios',
      lines: [
        'Carrossel: "Coleção de Verão" · "Camisetas leves a partir de R$ 49,90" · botão "Ver coleção" → Categoria: Camisetas',
        'Cartão: "Leve 3, pague 2" · "Em todas as camisetas" · botão "Aproveitar" → Promoções',
        'Faixa: "Black Friday JC" · "Até 40% OFF só até domingo" · botão "Comprar agora" → Promoções · Fim: domingo 23:59',
      ],
    },
    tips: [
      'No carrossel, 2 ou 3 anúncios bastam. Mais que isso ninguém vê.',
      'Contraste é tudo: fundo escuro com texto branco, ou fundo claro com texto preto.',
      'Programe o <b>Fim</b> de toda campanha. Assim a loja não fica anunciando promoção que já acabou.',
      'Em <b>Ordem</b>, números menores aparecem primeiro.',
    ],
  },
  {
    id: 'promocoes',
    group: 'Marketing',
    icon: 'percent',
    title: 'Promoções (descontos automáticos)',
    summary: 'O desconto aparece sozinho na vitrine e no carrinho. O cliente não precisa digitar nada.',
    link: '/admin/promocoes',
    linkLabel: 'Abrir Promoções',
    steps: [
      'Clique em <b>Nova promoção</b>. O <b>nome interno</b> é só para você; o <b>selo na vitrine</b> é o que o cliente vê na foto (ex.: "20% OFF").',
      'Escolha o <b>tipo</b>: <b>Porcentagem</b> (ex.: 20% em cada peça), <b>Valor fixo</b> (ex.: R$ 15 a menos por peça) ou <b>Leve X, pague Y</b> (as peças mais baratas saem de graça no carrinho).',
      'Em <b>Vale para</b>, escolha <b>toda a loja</b>, <b>uma categoria</b> ou <b>produtos escolhidos</b>.',
      'Defina o <b>período</b>. Vazio = começa agora e não tem data para acabar.',
      'Salve. A promoção já aparece na loja, inclusive em "Ofertas da semana" na página inicial.',
    ],
    example: {
      title: 'Exemplos',
      lines: [
        'Leve 3, pague 2 · Vale para: categoria Camisetas · selo "Leve 3 Pague 2"',
        '20% OFF · Porcentagem 20 · Vale para: categoria Polos · de sexta 00:00 a domingo 23:59',
        'Queima de estoque · Valor fixo R$ 30 · Vale para: produtos escolhidos (as peças paradas)',
      ],
    },
    tips: [
      'Se um produto se encaixa em duas promoções, a loja aplica a melhor para o cliente.',
      'No "Leve X, pague Y", o cliente pode misturar cores e modelos da mesma categoria. Isso é avisado na página do produto.',
      'Promoção com data de fim cria urgência: "só até domingo".',
    ],
  },
  {
    id: 'cupons',
    group: 'Marketing',
    icon: 'ticket',
    title: 'Cupons',
    summary: 'Códigos que o cliente digita no carrinho. Ótimos para Instagram, WhatsApp e primeira compra.',
    link: '/admin/cupons',
    linkLabel: 'Abrir Cupons',
    steps: [
      'Clique em <b>Novo cupom</b> e crie um <b>código</b> fácil de lembrar e digitar (ex.: VERAO15).',
      'Escolha o <b>tipo</b>: <b>Porcentagem</b>, <b>Valor fixo</b> em reais ou <b>Frete grátis</b>.',
      'Se quiser, defina <b>pedido mínimo</b> e <b>limite de usos</b> (vazio = ilimitado).',
      'Escolha as datas de validade e salve.',
      'Divulgue o código no Instagram, no status do WhatsApp ou na embalagem.',
    ],
    example: {
      title: 'Exemplos',
      lines: [
        'PRIMEIRA10 · 10% · para a primeira compra (use como cupom de boas-vindas)',
        'INSTA20 · R$ 20 · pedido mínimo R$ 150 · limite 50 usos',
        'FRETEZERO · Frete grátis · válido só no fim de semana',
      ],
    },
    tips: [
      '<b>Cupom de boas-vindas:</b> em Configurações, escolha um cupom para aparecer num aviso discreto para quem visita a loja pela primeira vez. Ele não aparece no carrinho nem no checkout e some para quem já comprou.',
      'Um código diferente por canal (INSTA, ZAP, TIKTOK) mostra de onde vêm as vendas.',
      'Pedido mínimo protege a margem: o desconto só vale quando a compra é maior.',
    ],
  },
  {
    id: 'combos',
    group: 'Marketing',
    icon: 'gift',
    title: 'Combos (kits com preço fechado)',
    summary: 'Junte peças num kit com preço especial. O cliente escolhe o tamanho de cada peça.',
    link: '/admin/combos',
    linkLabel: 'Abrir Combos',
    steps: [
      'Clique em <b>Novo combo</b>, dê um nome e uma descrição curta.',
      'Envie a <b>imagem do combo</b> (formato deitado), de preferência com as peças juntas.',
      'Em <b>Peças do combo</b>, escolha os produtos e a quantidade de cada um.',
      'Defina o <b>preço do combo</b>. O painel mostra quanto o cliente economiza em relação às peças separadas.',
      'Salve. O combo aparece em "Combos que valem a pena" na página inicial e na página Combos.',
    ],
    example: {
      title: 'Exemplos',
      lines: [
        'Kit 3 Camisetas Básicas · 3× Camiseta Básica (R$ 49,90 cada = R$ 149,70) · preço do combo R$ 119,90',
        'Look Completo · 1 Polo + 1 Bermuda · preço fechado R$ 179,90',
      ],
    },
    tips: [
      'Combos funcionam melhor com peças básicas, que o cliente compraria em mais de uma cor.',
      'O estoque é o das próprias peças: tamanho esgotado aparece como "(esgotado)" e não pode ser escolhido no combo.',
    ],
  },

  // ------------------------------------------------------------ vendas
  {
    id: 'pedidos',
    group: 'Vendas',
    icon: 'box',
    title: 'Pedidos: do pagamento à entrega',
    summary: 'Acompanhe cada venda e avise o andamento. O botão principal sempre mostra o próximo passo.',
    link: '/admin/pedidos',
    linkLabel: 'Abrir Pedidos',
    steps: [
      'Pedido novo chega como <b>Novo</b>. Abra e confira os itens, o endereço e a forma de pagamento.',
      '<b>Antes de confirmar o pagamento</b>, confira a entrada do valor no extrato ou no app do banco. Comprovante enviado por mensagem pode ser falso.',
      'Clique em <b>Confirmar pagamento</b> → <b>Começar a separar</b> → <b>Marcar como enviado</b> (ou <b>Pronto para retirada</b>) → <b>Marcar como entregue</b>.',
      'Use <b>Conversar</b> para abrir o WhatsApp do cliente com uma mensagem pronta sobre o pedido.',
      'Se precisar, clique em <b>Cancelar pedido</b>: as peças voltam para o estoque.',
      'Pedidos cancelados podem ser apagados do histórico: abra o pedido e clique em <b>Remover do histórico</b>. Só administradores podem fazer isso, e não dá para desfazer.',
    ],
    tips: [
      'Use as abas (Novo, Pago, Separando...) para ver o que precisa de atenção. O número de pedidos novos aparece em <b>Início</b>.',
      'Pedido não pago é cancelado sozinho depois do prazo escolhido em Configurações, e o estoque volta.',
      'No cartão, o pagamento é feito pelo link que você envia no WhatsApp ou na maquininha, na retirada.',
      'Pedidos pagos, enviados e entregues nunca podem ser apagados: eles são o seu controle de vendas.',
    ],
  },
  {
    id: 'resumo',
    group: 'Vendas',
    icon: 'chart',
    title: 'Início: vendas e estoque',
    summary: 'Faturamento, número de pedidos, ticket médio, mais vendidos e estoque baixo.',
    link: '/admin',
    linkLabel: 'Abrir Início',
    tips: [
      '<b>Ticket médio</b> = quanto cada cliente gasta, em média. Use para escolher o valor do frete grátis e o pedido mínimo dos cupons.',
      'O gráfico mostra as vendas por dia (pedidos cancelados não entram).',
      'Em <b>Estoque baixo</b>, clique na peça para abrir o cadastro e repor.',
      'Os <b>mais vendidos</b> são ótimos candidatos para anúncios e combos.',
    ],
  },

  // ------------------------------------------------------------ loja e segurança
  {
    id: 'equipe',
    group: 'Loja e segurança',
    icon: 'user',
    title: 'Equipe',
    summary: 'Quem pode entrar no painel. Todos têm acesso completo à loja.',
    link: '/admin/usuarios',
    linkLabel: 'Abrir Equipe',
    steps: [
      'Clique para adicionar uma pessoa, com <b>nome</b>, <b>e-mail</b> e uma <b>senha</b> de pelo menos 8 caracteres.',
      'Envie a senha por uma conversa privada e peça para a pessoa trocar em <b>Minha conta</b>.',
      'Peça também para ela ativar a verificação em duas etapas.',
      'Quando alguém sair da equipe, remova o acesso na hora.',
    ],
    tips: ['Cada pessoa com o próprio login: assim, em <b>Atividades</b>, você sabe quem fez cada alteração.'],
  },
  {
    id: 'atividades',
    group: 'Loja e segurança',
    icon: 'clock',
    title: 'Atividades',
    summary: 'Quem fez o quê no painel: alterações de preço, pedidos, logins e tentativas que falharam.',
    link: '/admin/atividades',
    linkLabel: 'Abrir Atividades',
    tips: [
      'Linhas em vermelho merecem atenção, como várias tentativas de login erradas.',
      'Mudou um preço e não lembra quem? Aqui aparece o antes e o depois.',
    ],
  },
  {
    id: 'trocas',
    group: 'Loja e segurança',
    icon: 'refresh',
    title: 'Trocas, devoluções e privacidade',
    summary: 'As páginas de trocas e de privacidade são montadas sozinhas, com os dados da loja.',
    link: '/admin/configuracoes',
    linkLabel: 'Abrir Configurações',
    tips: [
      '<b>Desistência em 7 dias</b> depois de receber e <b>defeito em até 90 dias</b> são obrigatórios por lei para quem vende pela internet.',
      'O prazo para <b>troca de tamanho ou modelo</b> você escolhe em Configurações (mínimo de 7 dias).',
      'Os dados pessoais dos clientes (nome, telefone, endereço) são apagados sozinhos depois de um tempo. Ficam só os valores, para o seu controle de vendas.',
      'Quer escrever a sua própria política? Abra a opção em Configurações. Enquanto ficar vazia, vale a página automática.',
    ],
  },
];

const GROUPS = ['Comece aqui', 'Catálogo', 'Marketing', 'Vendas', 'Loja e segurança'];

const FIRST_STEPS = [
  { id: 'configuracoes', label: 'Configure contato, frete e Pix' },
  { id: 'seguranca', label: 'Ative a verificação em duas etapas' },
  { id: 'categorias', label: 'Crie as categorias' },
  { id: 'produtos', label: 'Cadastre os produtos com fotos e cores' },
  { id: 'anuncios', label: 'Monte os anúncios da página inicial' },
  { id: 'promocoes', label: 'Crie uma promoção ou um cupom de boas-vindas' },
];

/** tira acentos e tags para a busca achar "promocao" em "Promoção" */
const plain = (s: string) => s.replace(/<[^>]+>/g, '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();

@Component({
  selector: 'app-help',
  imports: [FormsModule, RouterLink, Icon],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="page-head">
      <div>
        <h1>Ajuda</h1>
        <p class="muted">Como usar o painel, com passo a passo, exemplos e dicas para vender mais.</p>
      </div>
    </div>

    <div class="search">
      <app-icon name="search" [size]="18" />
      <input class="input" type="search" placeholder="Buscar: frete, cupom, foto, cor..." [ngModel]="query()"
        (ngModelChange)="query.set($event)" aria-label="Buscar na ajuda" />
    </div>

    @if (!query()) {
      <section class="card start">
        <h2>Primeiros passos</h2>
        <p class="muted small">Nesta ordem, a loja fica pronta para vender.</p>
        <ol>
          @for (s of firstSteps; track s.id; let i = $index) {
            <li><button type="button" (click)="go(s.id)"><span class="num">{{ i + 1 }}</span> {{ s.label }}
              <app-icon name="right" [size]="16" /></button></li>
          }
        </ol>
      </section>
    }

    @for (g of groups(); track g.name) {
      <h2 class="group">{{ g.name }}</h2>
      <div class="topics">
        @for (t of g.topics; track t.id) {
          <details class="card topic" [id]="t.id" [open]="isOpen(t.id)" (toggle)="toggled(t.id, $event)">
            <summary>
              <span class="ico"><app-icon [name]="t.icon" [size]="20" /></span>
              <span class="head"><b>{{ t.title }}</b><small>{{ t.summary }}</small></span>
              <app-icon name="down" [size]="18" class="chev" />
            </summary>
            <div class="body">
              @if (t.steps) {
                <h3>Passo a passo</h3>
                <ol class="steps">
                  @for (s of t.steps; track $index) {
                    <li [innerHTML]="s"></li>
                  }
                </ol>
              }
              @if (t.example; as ex) {
                <div class="example">
                  <b>{{ ex.title }}</b>
                  @for (l of ex.lines; track $index) {
                    <span>{{ l }}</span>
                  }
                </div>
              }
              @if (t.tips) {
                <h3>Dicas</h3>
                <ul class="tips">
                  @for (tip of t.tips; track $index) {
                    <li><app-icon name="bulb" [size]="16" /><span [innerHTML]="tip"></span></li>
                  }
                </ul>
              }
              @if (t.link) {
                <a class="btn sm outline" [routerLink]="t.link">{{ t.linkLabel }} <app-icon name="arrow" [size]="15" /></a>
              }
            </div>
          </details>
        }
      </div>
    } @empty {
      <p class="empty">Nada encontrado para "{{ query() }}". Tente outra palavra, como "frete", "foto" ou "pedido".</p>
    }
  `,
  styles: `
    .search { position: relative; max-width: 520px; margin-bottom: 20px;
      app-icon { position: absolute; left: 14px; top: 50%; transform: translateY(-50%); color: var(--muted); }
      .input { padding-left: 42px; } }
    .start { padding: 20px; margin-bottom: 8px;
      h2 { font-size: 1.15rem; margin: 0; }
      ol { list-style: none; padding: 0; margin: 12px 0 0; display: grid; grid-template-columns: repeat(auto-fit, minmax(min(260px, 100%), 1fr)); gap: 8px; }
      button { display: flex; align-items: center; gap: 10px; width: 100%; min-height: 48px; padding: 8px 12px; text-align: left;
        border: 1px solid var(--line); border-radius: var(--radius-sm); background: var(--bg); font-weight: 600; cursor: pointer;
        &:hover { border-color: var(--ink); }
        app-icon { margin-left: auto; color: var(--muted); } }
      .num { display: grid; place-items: center; flex: none; width: 26px; height: 26px; border-radius: 50%;
        background: var(--ink); color: #fff; font-size: .8rem; } }
    .group { font-size: .78rem; text-transform: uppercase; letter-spacing: .08em; color: var(--muted); margin: 28px 0 10px; }
    .topics { display: grid; gap: 10px; }
    .topic { padding: 0; overflow: hidden; scroll-margin-top: 80px;
      summary { display: flex; align-items: center; gap: 14px; padding: 16px 18px; cursor: pointer; list-style: none;
        &::-webkit-details-marker { display: none; }
        &:hover .chev { color: var(--ink); } }
      .ico { display: grid; place-items: center; flex: none; width: 40px; height: 40px; border-radius: 10px; background: var(--sand); }
      .head { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px;
        small { color: var(--muted); font-size: .86rem; line-height: 1.4; } }
      .chev { color: var(--muted); transition: transform .2s; }
      &[open] .chev { transform: rotate(180deg); }
      &[open] summary { border-bottom: 1px solid var(--line); } }
    .body { padding: 6px 18px 20px; max-width: 760px;
      h3 { font-size: .9rem; margin: 18px 0 8px; }
      .btn { margin-top: 18px; gap: 6px; } }
    .steps { margin: 0; padding-left: 22px; display: grid; gap: 8px; line-height: 1.55;
      li::marker { font-weight: 700; } }
    .example { display: flex; flex-direction: column; gap: 6px; margin-top: 16px; padding: 14px 16px; border-radius: var(--radius-sm);
      background: var(--sand); font-size: .9rem; line-height: 1.5;
      span { padding-left: 12px; border-left: 2px solid var(--line); } }
    .tips { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; line-height: 1.55;
      li { display: flex; gap: 10px; }
      app-icon { margin-top: 3px; color: var(--warn); } }
    .empty { padding: 30px 0; }
    @media (max-width: 720px) {
      .topic summary { padding: 14px; gap: 12px; }
      .topic .ico { width: 36px; height: 36px; }
      .body { padding: 4px 14px 18px; }
    }
  `,
})
export class Help {
  private route = inject(ActivatedRoute);
  private fragment = toSignal(this.route.fragment);

  protected firstSteps = FIRST_STEPS;
  protected query = signal('');
  /** tópicos abertos pelo usuário (com busca, os encontrados abrem sozinhos) */
  private opened = signal(new Set<string>());

  protected groups = computed(() => {
    const q = plain(this.query().trim());
    const match = (t: Topic) =>
      !q || plain([t.title, t.summary, ...(t.steps ?? []), ...(t.tips ?? []), ...(t.example?.lines ?? [])].join(' ')).includes(q);
    return GROUPS.map((name) => ({ name, topics: TOPICS.filter((t) => t.group === name && match(t)) })).filter((g) => g.topics.length);
  });

  constructor() {
    // /admin/ajuda#produtos abre direto no tópico
    effect(() => {
      const id = this.fragment();
      if (id) setTimeout(() => this.go(id));
    });
  }

  isOpen(id: string) {
    return !!this.query().trim() || this.opened().has(id);
  }

  toggled(id: string, event: Event) {
    const open = (event.target as HTMLDetailsElement).open;
    if (open === this.opened().has(id)) return;
    this.opened.update((s) => {
      const next = new Set(s);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  }

  go(id: string) {
    this.opened.update((s) => new Set(s).add(id));
    setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
  }
}
