// Tipos espelhando os schemas da API (backend/app/schemas)

/** Tabela de medidas da categoria: a 1ª coluna é o tamanho, as outras são medidas em cm. */
export interface SizeGuide {
  columns: string[];
  rows: string[][];
}

export interface Category {
  id: number;
  name: string;
  slug: string;
  image: string | null;
  sort: number;
  active: boolean;
  size_guide: SizeGuide | null;
  product_count: number;
}

export interface Variant {
  id?: number;
  size: string;
  color: string | null;
  stock: number;
}

export interface Product {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: number;
  compare_at_price: number | null;
  category_id: number | null;
  category_name: string | null;
  category_slug: string | null;
  images: string[];
  /** foto -> cor */
  image_colors: Record<string, string>;
  featured: boolean;
  is_new: boolean;
  active: boolean;
  sold_count: number;
  stock: number;
  variants: Variant[];
  final_price: number;
  old_price: number | null;
  discount_percent: number;
  badges: string[];
}

export interface ProductPage {
  items: Product[];
  total: number;
  page: number;
  pages: number;
}

export interface ProductFilters {
  sizes: string[];
  colors: string[];
  min_price: number;
  max_price: number;
}

export type PromotionKind = 'percent' | 'fixed' | 'buy_x_pay_y';
export type PromotionScope = 'all' | 'category' | 'products';

export interface Promotion {
  id: number;
  name: string;
  badge: string;
  kind: PromotionKind;
  value: number;
  buy_qty: number;
  pay_qty: number;
  scope: PromotionScope;
  category_id: number | null;
  product_ids: number[];
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  running: boolean;
}

export type CouponKind = 'percent' | 'fixed' | 'free_shipping';

export interface Coupon {
  id: number;
  code: string;
  description: string;
  kind: CouponKind;
  value: number;
  min_order: number;
  max_uses: number | null;
  used_count: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

export interface ComboItem {
  product_id: number;
  quantity: number;
  product: Product;
}

export interface Combo {
  id: number;
  name: string;
  slug: string;
  description: string;
  image: string | null;
  price: number;
  original_price: number;
  savings: number;
  active: boolean;
  items: ComboItem[];
}

export type BannerPlacement = 'hero' | 'strip' | 'card';

export interface Banner {
  id: number;
  title: string;
  subtitle: string;
  image: string | null;
  cta_label: string;
  link: string;
  placement: BannerPlacement;
  bg_color: string;
  text_color: string;
  sort: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
}

export interface AdminUser {
  id: number;
  name: string;
  email: string;
  is_me: boolean;
  mfa_enabled: boolean;
}

export interface StoreSettings {
  store_name: string;
  /** nome empresarial e CNPJ: o Decreto 7.962/2013 pede que apareçam no site */
  legal_name: string;
  cnpj: string;
  /** prazo para troca de tamanho/modelo (o arrependimento de 7 dias é da lei) */
  exchange_days: number;
  announcement: string;
  whatsapp: string;
  instagram: string;
  email: string;
  address: string;
  opening_hours: string;
  shipping_fee: number;
  shipping_state_fee: number;
  shipping_other_fee: number;
  free_shipping_min: number;
  pix_discount_percent: number;
  pix_key: string;
  max_installments: number;
  pickup_enabled: boolean;
  order_hold_hours: number;
  max_qty_per_item: number;
  /** só vem nas configurações do painel (a vitrine usa /api/privacy) */
  privacy_policy?: string;
  /** só vem nas configurações do painel (a vitrine usa /api/exchange) */
  exchange_policy?: string;
  /** só vem nas configurações do painel: código do cupom do pop-up de boas-vindas */
  welcome_coupon?: string;
}

export interface HomeData {
  banners: Record<BannerPlacement, Banner[]>;
  categories: Category[];
  featured: Product[];
  on_sale: Product[];
  new_arrivals: Product[];
  best_sellers: Product[];
  combos: Combo[];
  promotions: Promotion[];
}

export interface ProductDetail {
  product: Product;
  related: Product[];
  combos: Combo[];
  size_guide: SizeGuide | null;
}

/** Oferta do pop-up de boas-vindas (null quando não há cupom escolhido ou ele venceu). */
export interface WelcomeOffer {
  code: string;
  offer: string;
  min_order: number;
}

// ------------------------------------------------------------ carrinho e pedidos

export type DeliveryMethod = 'entrega' | 'retirada';
export type PaymentMethod = 'pix' | 'cartao' | 'dinheiro';
export type OrderStatus = 'novo' | 'pago' | 'separando' | 'enviado' | 'entregue' | 'cancelado';

export interface QuoteRequest {
  items: { product_id: number; variant_id: number; quantity: number }[];
  combos: { combo_id: number; quantity: number; variant_ids: number[] }[];
  coupon_code?: string | null;
  delivery_method?: DeliveryMethod;
  payment_method?: PaymentMethod;
  cep?: string;
  city?: string;
  state?: string;
}

export interface QuoteLine {
  key: string;
  name: string;
  detail: string;
  image: string | null;
  quantity: number;
  unit_price: number;
  old_unit_price: number | null;
  total: number;
  available: boolean;
  message: string | null;
}

export interface Quote {
  lines: QuoteLine[];
  subtotal: number;
  discounts: { label: string; amount: number }[];
  discount_total: number;
  shipping: number;
  shipping_pending: boolean;
  shipping_note: string | null;
  total: number;
  coupon_code: string | null;
  coupon_message: string | null;
  coupon_valid: boolean;
  free_shipping_missing: number;
  max_installments: number;
  can_checkout: boolean;
}

export interface OrderRequest extends QuoteRequest {
  customer_name: string;
  phone: string;
  email?: string | null;
  cep?: string;
  street?: string;
  number?: string;
  complement?: string;
  district?: string;
  city?: string;
  state?: string;
  installments: number;
  notes: string;
  /** honeypot anti-robô: sempre vazio para pessoas */
  website?: string;
}

export interface OrderItem {
  id: number;
  product_id: number | null;
  combo_id: number | null;
  name: string;
  detail: string;
  image: string | null;
  quantity: number;
  unit_price: number;
  total: number;
}

export interface Order {
  id: number;
  code: string;
  status: OrderStatus;
  customer_name: string;
  phone: string;
  email: string | null;
  delivery_method: DeliveryMethod;
  cep: string | null;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  payment_method: PaymentMethod;
  installments: number;
  notes: string;
  subtotal: number;
  discount: number;
  shipping: number;
  total: number;
  coupon_code: string | null;
  created_at: string;
  items: OrderItem[];
}

export interface OrderPage {
  items: Order[];
  total: number;
  page: number;
  pages: number;
}

export interface Dashboard {
  revenue: number;
  orders: number;
  average_ticket: number;
  new_orders: number;
  products_active: number;
  low_stock: { product_id: number; name: string; size: string; color: string | null; stock: number }[];
  top_products: { name: string; quantity: number; total: number }[];
  sales_by_day: { date: string; total: number }[];
  orders_by_status: Record<OrderStatus, number>;
}

export const STATUS_LABEL: Record<OrderStatus, string> = {
  novo: 'Novo',
  pago: 'Pago',
  separando: 'Separando',
  enviado: 'Enviado',
  entregue: 'Entregue',
  cancelado: 'Cancelado',
};

export const PAYMENT_LABEL: Record<PaymentMethod, string> = {
  pix: 'Pix',
  cartao: 'Cartão de crédito',
  dinheiro: 'Dinheiro',
};
