import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Política de Privacidade | Total Pousada',
  description: 'Política de Privacidade e tratamento de dados pessoais da plataforma Total Pousada.',
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-sky-400 hover:underline">
        ← Voltar
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
        Política de Privacidade
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Última atualização: 07 de agosto de 2026
      </p>

      <div className="glass-panel mt-8 space-y-8 rounded-[24px] p-6 text-sm leading-7 text-slate-300 sm:p-8">
        <section>
          <h2 className="text-base font-semibold text-white">1. Quem somos</h2>
          <p className="mt-2">
            Esta Política de Privacidade descreve como [RAZÃO SOCIAL], inscrita no CNPJ nº
            [PREENCHER] (&quot;Total Pousada&quot;, &quot;nós&quot;), coleta, usa, armazena e
            protege dados pessoais no contexto da plataforma de gestão de pousadas Total
            Pousada (&quot;Plataforma&quot;), em conformidade com a Lei Geral de Proteção de
            Dados Pessoais (Lei nº 13.709/2018 — LGPD).
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">2. Papéis: controlador e operador</h2>
          <p className="mt-2">
            Cada pousada cliente (&quot;Contratante&quot;) é a <strong>controladora</strong> dos
            dados pessoais de seus hóspedes e funcionários que insere na Plataforma (nome,
            CPF, e-mail, telefone, dados de reserva, etc.), sendo responsável por garantir
            base legal para essa coleta. A Total Pousada atua como <strong>operadora</strong>,
            tratando esses dados exclusivamente para viabilizar as funcionalidades da
            Plataforma, conforme instruções do Contratante.
          </p>
          <p className="mt-2">
            Em relação aos dados do próprio Contratante e de seus usuários com acesso ao
            sistema (nome, e-mail, credenciais de acesso, plano contratado), a Total
            Pousada atua como <strong>controladora</strong>.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">3. Dados que coletamos</h2>
          <ul className="mt-2 list-disc space-y-1 pl-5">
            <li>Dados de cadastro da conta: nome, e-mail, telefone e cargo do usuário.</li>
            <li>Dados da pousada: nome, endereço, quartos, tarifas, fotos e configurações.</li>
            <li>
              Dados operacionais inseridos pelo Contratante: reservas, hóspedes, check-in/
              check-out, cupons, adicionais e histórico financeiro.
            </li>
            <li>
              Dados técnicos de acesso: endereço IP, data/hora de acesso e cookies
              estritamente necessários para autenticação (sessão de login).
            </li>
          </ul>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">4. Cookies</h2>
          <p className="mt-2">
            Utilizamos apenas um cookie estritamente necessário (<code>sancho_session</code>),
            de uso funcional, para manter o usuário autenticado na Plataforma. Esse cookie
            é essencial ao funcionamento do serviço e não é utilizado para rastreamento,
            publicidade ou perfis de navegação, dispensando consentimento prévio nos termos
            da regulamentação aplicável.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">5. Finalidade do tratamento</h2>
          <p className="mt-2">
            Os dados são tratados para: (i) viabilizar o acesso e funcionamento da
            Plataforma; (ii) permitir a gestão de reservas, hóspedes e operações da
            pousada; (iii) processar e manter registros financeiros e de auditoria
            exigidos por lei ou pelo próprio Contratante; (iv) prestar suporte técnico; e
            (v) cumprir obrigações legais e regulatórias.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">6. Compartilhamento de dados</h2>
          <p className="mt-2">
            Não vendemos dados pessoais. Dados podem ser compartilhados com prestadores de
            infraestrutura estritamente necessários à operação da Plataforma (ex.: provedor
            de hospedagem/banco de dados), sob obrigações contratuais de confidencialidade
            e segurança, ou quando exigido por autoridade competente.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">7. Segurança e isolamento entre clientes</h2>
          <p className="mt-2">
            A Plataforma é multi-tenant: os dados de cada pousada cliente são logicamente
            isolados dos dados de outras pousadas clientes, com controle de acesso baseado
            em sessão autenticada e vinculada ao respectivo tenant. Adotamos medidas
            técnicas e organizacionais razoáveis para proteger os dados contra acesso não
            autorizado, perda ou alteração indevida.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">8. Retenção e exclusão</h2>
          <p className="mt-2">
            Os dados são mantidos enquanto a conta do Contratante estiver ativa e pelo
            período adicional necessário para cumprimento de obrigações legais,
            regulatórias, fiscais ou para exercício regular de direitos. Após o
            cancelamento da assinatura, os dados podem ser eliminados ou anonimizados,
            ressalvadas hipóteses de guarda obrigatória por lei.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">9. Direitos do titular</h2>
          <p className="mt-2">
            Nos termos da LGPD, o titular dos dados pode solicitar, mediante requisição ao
            respectivo controlador (o Contratante, no caso de dados de hóspedes, ou a Total
            Pousada, no caso de dados da conta): confirmação da existência de tratamento,
            acesso, correção, anonimização, portabilidade, eliminação e informações sobre
            compartilhamento dos seus dados.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">10. Contato do encarregado (DPO)</h2>
          <p className="mt-2">
            Solicitações relacionadas a dados pessoais podem ser enviadas para{' '}
            <a href="mailto:privacidade@totalpousada.com" className="text-sky-400 hover:underline">
              privacidade@totalpousada.com
            </a>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">11. Alterações desta política</h2>
          <p className="mt-2">
            Esta Política pode ser atualizada periodicamente. Recomendamos a consulta
            regular desta página. Alterações relevantes serão comunicadas aos Contratantes
            pelos canais de contato cadastrados.
          </p>
        </section>
      </div>
    </main>
  );
}
