import { Routes } from '@angular/router';
import { adminGuard } from './core/auth';

// SmartPreload (core/preload.ts) baixa estas telas em segundo plano: loja para todos, painel só para quem está logado
const STORE = { preload: 'store' };
const ADMIN = { preload: 'admin' };

export const routes: Routes = [
  // ------------------------------------------------------------ loja
  {
    path: '',
    loadComponent: () => import('./store/store-layout').then((m) => m.StoreLayout),
    children: [
      { path: '', title: 'JC Moda Masculina', data: STORE, loadComponent: () => import('./store/home').then((m) => m.Home) },
      { path: 'loja', title: 'Loja | JC Moda', data: STORE, loadComponent: () => import('./store/catalog').then((m) => m.Catalog) },
      { path: 'produto/:slug', data: STORE, loadComponent: () => import('./store/product-page').then((m) => m.ProductPage) },
      { path: 'combos', title: 'Combos | JC Moda', data: STORE, loadComponent: () => import('./store/combos').then((m) => m.Combos) },
      { path: 'carrinho', title: 'Carrinho | JC Moda', data: STORE, loadComponent: () => import('./store/cart').then((m) => m.Cart) },
      { path: 'checkout', title: 'Finalizar compra | JC Moda', data: STORE, loadComponent: () => import('./store/checkout').then((m) => m.Checkout) },
      { path: 'pedido/:code', title: 'Pedido recebido | JC Moda', data: STORE, loadComponent: () => import('./store/order-done').then((m) => m.OrderDone) },
      { path: 'trocas', title: 'Trocas e devoluções | JC Moda', data: { ...STORE, kind: 'trocas' }, loadComponent: () => import('./store/privacy').then((m) => m.Privacy) },
      { path: 'privacidade', title: 'Política de privacidade | JC Moda', data: STORE, loadComponent: () => import('./store/privacy').then((m) => m.Privacy) },
      { path: 'rastrear', title: 'Acompanhar pedido | JC Moda', data: STORE, loadComponent: () => import('./store/track-order').then((m) => m.TrackOrder) },
    ],
  },

  // ------------------------------------------------------------ painel
  { path: 'admin/login', title: 'Entrar | Painel JC', loadComponent: () => import('./admin/login').then((m) => m.Login) },
  {
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    data: ADMIN,
    loadComponent: () => import('./admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', title: 'Início | Painel JC', data: ADMIN, loadComponent: () => import('./admin/dashboard').then((m) => m.Dashboard) },
      { path: 'pedidos', title: 'Pedidos | Painel JC', data: ADMIN, loadComponent: () => import('./admin/orders').then((m) => m.Orders) },
      { path: 'produtos', title: 'Produtos | Painel JC', data: ADMIN, loadComponent: () => import('./admin/products').then((m) => m.Products) },
      { path: 'categorias', title: 'Categorias | Painel JC', data: ADMIN, loadComponent: () => import('./admin/categories').then((m) => m.Categories) },
      { path: 'promocoes', title: 'Promoções | Painel JC', data: ADMIN, loadComponent: () => import('./admin/promotions').then((m) => m.Promotions) },
      { path: 'cupons', title: 'Cupons | Painel JC', data: ADMIN, loadComponent: () => import('./admin/coupons').then((m) => m.Coupons) },
      { path: 'combos', title: 'Combos | Painel JC', data: ADMIN, loadComponent: () => import('./admin/combos').then((m) => m.AdminCombos) },
      { path: 'anuncios', title: 'Anúncios | Painel JC', data: ADMIN, loadComponent: () => import('./admin/banners').then((m) => m.Banners) },
      { path: 'atividades', title: 'Atividades | Painel JC', data: ADMIN, loadComponent: () => import('./admin/audit').then((m) => m.Audit) },
      { path: 'usuarios', title: 'Equipe | Painel JC', data: ADMIN, loadComponent: () => import('./admin/users').then((m) => m.Users) },
      { path: 'conta', title: 'Minha conta | Painel JC', data: ADMIN, loadComponent: () => import('./admin/account').then((m) => m.Account) },
      { path: 'ajuda', title: 'Ajuda | Painel JC', data: ADMIN, loadComponent: () => import('./admin/help').then((m) => m.Help) },
      { path: 'configuracoes', title: 'Configurações | Painel JC', data: ADMIN, loadComponent: () => import('./admin/settings').then((m) => m.Settings) },
    ],
  },

  { path: '**', redirectTo: '' },
];
