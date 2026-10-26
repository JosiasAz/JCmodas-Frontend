const SCRIPT_URL = 'https://accounts.google.com/gsi/client';

/** Parte da biblioteca Google Identity Services usada aqui. */
interface GoogleIdentity {
  accounts: {
    id: {
      initialize(config: { client_id: string; callback: (res: { credential: string }) => void }): void;
      renderButton(el: HTMLElement, options: Record<string, unknown>): void;
    };
  };
}

let loading: Promise<GoogleIdentity> | null = null;

/** Carrega o script do Google só quando a tela de login precisa dele (uma vez por página). */
function loadScript(): Promise<GoogleIdentity> {
  loading ??= new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = SCRIPT_URL;
    script.async = true;
    script.onload = () => resolve((window as unknown as { google: GoogleIdentity }).google);
    script.onerror = () => {
      loading = null; // deixa tentar de novo na próxima visita
      reject(new Error('Não foi possível carregar o login do Google'));
    };
    document.head.appendChild(script);
  });
  return loading;
}

/** Desenha o botão "Entrar com Google" em `el`; `onCredential` recebe o ID token para enviar à API. */
export async function renderGoogleButton(el: HTMLElement, clientId: string, onCredential: (credential: string) => void) {
  const google = await loadScript();
  google.accounts.id.initialize({ client_id: clientId, callback: (res) => onCredential(res.credential) });
  google.accounts.id.renderButton(el, {
    theme: 'outline',
    size: 'large',
    text: 'signin_with',
    shape: 'rectangular',
    locale: 'pt-BR',
    width: Math.min(el.clientWidth || 336, 400),
  });
}
