import { Routes } from '@angular/router';
import { adminGuard } from './core/auth';

export const routes: Routes = [
  // ------------------------------------------------------------ loja
  {
    path: '',
    loadComponent: () => import('./store/store-layout').then((m) => m.StoreLayout),
    children: [
      { path: '', title: 'JC Moda Masculina', loadComponent: () => import('./store/home').then((m) => m.Home) },
      { path: 'loja', title: 'Loja | JC Moda', loadComponent: () => import('./store/catalog').then((m) => m.Catalog) },
      { path: 'produto/:slug', loadComponent: () => import('./store/product-page').then((m) => m.ProductPage) },
      { path: 'combos', title: 'Combos | JC Moda', loadComponent: () => import('./store/combos').then((m) => m.Combos) },
      { path: 'carrinho', title: 'Carrinho | JC Moda', loadComponent: () => import('./store/cart').then((m) => m.Cart) },
      { path: 'checkout', title: 'Finalizar compra | JC Moda', loadComponent: () => import('./store/checkout').then((m) => m.Checkout) },
      { path: 'pedido/:code', title: 'Pedido recebido | JC Moda', loadComponent: () => import('./store/order-done').then((m) => m.OrderDone) },
      { path: 'privacidade', title: 'Política de privacidade | JC Moda', loadComponent: () => import('./store/privacy').then((m) => m.Privacy) },
      { path: 'rastrear', title: 'Acompanhar pedido | JC Moda', loadComponent: () => import('./store/track-order').then((m) => m.TrackOrder) },
    ],
  },

  // ------------------------------------------------------------ painel
  { path: 'admin/login', title: 'Entrar | Painel JC', loadComponent: () => import('./admin/login').then((m) => m.Login) },
  {
    path: 'admin',
    canActivate: [adminGuard],
    canActivateChild: [adminGuard],
    loadComponent: () => import('./admin/admin-layout').then((m) => m.AdminLayout),
    children: [
      { path: '', title: 'Resumo | Painel JC', loadComponent: () => import('./admin/dashboard').then((m) => m.Dashboard) },
      { path: 'pedidos', title: 'Pedidos | Painel JC', loadComponent: () => import('./admin/orders').then((m) => m.Orders) },
      { path: 'produtos', title: 'Produtos | Painel JC', loadComponent: () => import('./admin/products').then((m) => m.Products) },
      { path: 'categorias', title: 'Categorias | Painel JC', loadComponent: () => import('./admin/categories').then((m) => m.Categories) },
      { path: 'promocoes', title: 'Promoções | Painel JC', loadComponent: () => import('./admin/promotions').then((m) => m.Promotions) },
      { path: 'cupons', title: 'Cupons | Painel JC', loadComponent: () => import('./admin/coupons').then((m) => m.Coupons) },
      { path: 'combos', title: 'Combos | Painel JC', loadComponent: () => import('./admin/combos').then((m) => m.AdminCombos) },
      { path: 'anuncios', title: 'Anúncios | Painel JC', loadComponent: () => import('./admin/banners').then((m) => m.Banners) },
      { path: 'atividades', title: 'Atividades | Painel JC', loadComponent: () => import('./admin/audit').then((m) => m.Audit) },
      { path: 'usuarios', title: 'Usuários | Painel JC', loadComponent: () => import('./admin/users').then((m) => m.Users) },
      { path: 'configuracoes', title: 'Configurações | Painel JC', loadComponent: () => import('./admin/settings').then((m) => m.Settings) },
    ],
  },

  { path: '**', redirectTo: '' },
];
