'use client';

import { AnimatePresence, motion } from 'framer-motion';
import { Cookie } from 'lucide-react';
import Link from 'next/link';
import { useEffect, useState } from 'react';

const CONSENT_COOKIE_NAME = 'tp_cookie_consent';
const CONSENT_STORAGE_KEY = 'tp_cookie_consent';
const CONSENT_MAX_AGE_DAYS = 365;

type ConsentChoice = 'accepted' | 'rejected';

type StoredConsent = {
  choice: ConsentChoice;
  decidedAt: string;
};

function readStoredConsent(): StoredConsent | null {
  try {
    const raw = window.localStorage.getItem(CONSENT_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredConsent;
    if (parsed.choice === 'accepted' || parsed.choice === 'rejected') {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}

function persistConsent(choice: ConsentChoice) {
  const record: StoredConsent = { choice, decidedAt: new Date().toISOString() };
  try {
    window.localStorage.setItem(CONSENT_STORAGE_KEY, JSON.stringify(record));
  } catch {
    // localStorage indisponível (modo privado restrito): o cookie abaixo
    // ainda garante que a decisão não seja perguntada de novo na sessão.
  }

  const maxAge = CONSENT_MAX_AGE_DAYS * 24 * 60 * 60;
  const secure = window.location.protocol === 'https:' ? '; Secure' : '';
  document.cookie = `${CONSENT_COOKIE_NAME}=${choice}; path=/; max-age=${maxAge}; SameSite=Lax${secure}`;
}

/**
 * Aviso de cookies + link para a Política de Privacidade, exigido pela LGPD
 * para dar respaldo legal ao uso de cookies essenciais (sessão de login) do
 * site. Hoje a plataforma não usa cookies de analytics/marketing — só o
 * cookie de sessão, necessário para o funcionamento do painel — então
 * "rejeitar" apenas registra a decisão do usuário sem alterar o
 * funcionamento do site.
 */
export function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!readStoredConsent()) {
      setVisible(true);
    }
  }, []);

  function decide(choice: ConsentChoice) {
    persistConsent(choice);
    setVisible(false);
  }

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 0, y: 32 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 32 }}
          transition={{ type: 'spring', stiffness: 260, damping: 26 }}
          className="fixed inset-x-0 bottom-0 z-[60] flex justify-center px-4 pb-4 sm:px-6 sm:pb-6"
          role="dialog"
          aria-live="polite"
          aria-label="Aviso de cookies"
        >
          <div className="glass-panel flex w-full max-w-2xl flex-col gap-4 rounded-[20px] p-5 sm:flex-row sm:items-center sm:p-6">
            <Cookie className="hidden h-8 w-8 shrink-0 text-emerald sm:block" aria-hidden />
            <p className="flex-1 text-sm leading-6 text-slate-300">
              Usamos cookies essenciais para manter você conectado e o site funcionando
              corretamente. Ao continuar navegando, você concorda com nossa{' '}
              <Link href="/privacidade" className="text-sky-400 hover:underline">
                Política de Privacidade
              </Link>{' '}
              e nossos{' '}
              <Link href="/termos" className="text-sky-400 hover:underline">
                Termos de Uso
              </Link>
              .
            </p>
            <div className="flex shrink-0 gap-3">
              <button
                type="button"
                onClick={() => decide('rejected')}
                className="rounded-xl border border-white/10 px-4 py-2 text-sm text-slate-300 transition hover:bg-white/5"
              >
                Rejeitar
              </button>
              <button
                type="button"
                onClick={() => decide('accepted')}
                className="rounded-xl bg-emerald px-4 py-2 text-sm font-medium text-slate-950 transition hover:opacity-90"
              >
                Aceitar
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
