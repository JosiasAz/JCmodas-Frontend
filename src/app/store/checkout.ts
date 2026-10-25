import { HttpClient } from '@angular/common/http';
import { ChangeDetectionStrategy, Component, effect, inject, signal } from '@angular/core';
import { FormsModule, NgForm } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService } from '../core/api.service';
import { errorMessage } from '../core/auth';
import { CartService } from '../core/cart.service';
import { DeliveryMethod, PaymentMethod, Quote } from '../core/models';
import { StoreService } from '../core/store.service';
import { Icon } from '../shared/icon';
import { MoneyPipe } from '../shared/money.pipe';
import { CartTotals } from './cart-totals';

const FORM_KEY = 'jc-checkout-form';

@Component({
  selector: 'app-checkout',
  imports: [FormsModule, RouterLink, Icon, MoneyPipe, CartTotals],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './checkout.html',
  styleUrl: './checkout.scss',
})
export class Checkout {
  private api = inject(ApiService);
  private http = inject(HttpClient);
  private router = inject(Router);
  protected cart = inject(CartService);
  protected store = inject(StoreService);

  protected delivery = signal<DeliveryMethod>('entrega');
  protected payment = signal<PaymentMethod>('pix');
  protected quote = signal<Quote | null>(null);
  protected sending = signal(false);
  protected error = signal('');
  protected cepStatus = signal<'' | 'loading' | 'error'>('');

  // os dados do cliente só ficam salvos no aparelho se ele pedir ("lembrar meus dados")
  private saved = this.loadForm();
  protected remember = Object.keys(this.saved).length > 0;
  protected form = {
    customer_name: '',
    phone: '',
    email: '',
    cep: '',
    street: '',
    number: '',
    complement: '',
    district: '',
    city: '',
    state: '',
    installments: 1,
    notes: '',
    website: '', // honeypot: campo invisível; só robôs preenchem
    ...this.saved,
  };

  constructor() {
    if (this.cart.isEmpty()) this.router.navigate(['/carrinho']);

    effect((onCleanup) => {
      if (this.cart.isEmpty()) return;
      const sub = this.api
        .quote({ ...this.cart.request(), delivery_method: this.delivery(), payment_method: this.payment() })
        .subscribe((q) => {
          this.quote.set(q);
          this.form.installments = Math.min(this.form.installments, q.max_installments);
        });
      onCleanup(() => sub.unsubscribe());
    });
  }

  installmentOptions(max: number) {
    return Array.from({ length: max }, (_, i) => i + 1);
  }

  formatPhone() {
    const d = this.form.phone.replace(/\D/g, '').slice(0, 11);
    this.form.phone =
      d.length > 10 ? `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
      : d.length > 6 ? `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
      : d.length > 2 ? `(${d.slice(0, 2)}) ${d.slice(2)}`
      : d;
  }

  /** Preenche o endereço pelo CEP (ViaCEP). */
  lookupCep() {
    const cep = this.form.cep.replace(/\D/g, '');
    if (cep.length !== 8) return;
    this.form.cep = `${cep.slice(0, 5)}-${cep.slice(5)}`;
    this.cepStatus.set('loading');
    this.http.get<any>(`https://viacep.com.br/ws/${cep}/json/`).subscribe({
      next: (r) => {
        if (r.erro) {
          this.cepStatus.set('error');
          return;
        }
        this.form.street = r.logradouro || this.form.street;
        this.form.district = r.bairro || this.form.district;
        this.form.city = r.localidade || this.form.city;
        this.form.state = r.uf || this.form.state;
        this.cepStatus.set('');
      },
      error: () => this.cepStatus.set('error'),
    });
  }

  submit(ngForm: NgForm) {
    this.error.set('');
    if (ngForm.invalid) {
      ngForm.control.markAllAsTouched();
      this.error.set('Preencha os campos destacados.');
      return;
    }
    this.sending.set(true);
    const isDelivery = this.delivery() === 'entrega';
    this.api
      .placeOrder({
        ...this.cart.request(),
        ...this.form,
        email: this.form.email || null,
        delivery_method: this.delivery(),
        payment_method: this.payment(),
        installments: this.payment() === 'cartao' ? Number(this.form.installments) : 1,
        // na retirada não mandamos endereço
        ...(isDelivery ? {} : { cep: '', street: '', number: '', complement: '', district: '', city: '', state: '' }),
      })
      .subscribe({
        next: (order) => {
          if (this.remember) this.saveForm();
          else this.forgetForm();
          this.cart.saveLastOrder(order);
          this.cart.clear();
          this.router.navigate(['/pedido', order.code]);
        },
        error: (err) => {
          this.sending.set(false);
          this.error.set(errorMessage(err));
        },
      });
  }

  private loadForm() {
    try {
      return JSON.parse(localStorage.getItem(FORM_KEY) || '{}');
    } catch {
      return {};
    }
  }

  private forgetForm() {
    try {
      localStorage.removeItem(FORM_KEY);
    } catch {
      /* ignora */
    }
  }

  private saveForm() {
    const { notes, installments, website, ...keep } = this.form;
    try {
      localStorage.setItem(FORM_KEY, JSON.stringify(keep));
    } catch {
      /* ignora */
    }
  }
}
