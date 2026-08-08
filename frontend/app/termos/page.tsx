import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Termos de Uso | Total Pousada',
  description: 'Termos de Uso da plataforma Total Pousada.',
};

export default function TermsPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-16">
      <Link href="/" className="text-sm text-sky-400 hover:underline">
        ← Voltar
      </Link>

      <h1 className="mt-6 text-3xl font-semibold tracking-tight text-white">
        Termos de Uso
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        Última atualização: 07 de agosto de 2026
      </p>

      <div className="glass-panel mt-8 space-y-8 rounded-[24px] p-6 text-sm leading-7 text-slate-300 sm:p-8">
        <section>
          <h2 className="text-base font-semibold text-white">1. Aceitação dos termos</h2>
          <p className="mt-2">
            Estes Termos de Uso regem o acesso e a utilização da plataforma Total Pousada
            (&quot;Plataforma&quot;), um sistema de gestão de reservas e operações para
            pousadas e meios de hospedagem, operado por [RAZÃO SOCIAL], inscrita no CNPJ
            sob o nº [PREENCHER], com sede em [ENDEREÇO] (&quot;nós&quot;, &quot;Total Pousada&quot;).
            Ao criar uma conta ou utilizar a Plataforma, você (&quot;Usuário&quot; ou
            &quot;Contratante&quot;) concorda integralmente com estes termos.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">2. Cadastro e contratação</h2>
          <p className="mt-2">
            O acesso à Plataforma é disponibilizado mediante assinatura de um plano pago
            (Basic, Premium ou Enterprise), contratado e processado através do nosso site
            de vendas. A criação do usuário administrador e do ambiente da pousada é
            realizada automaticamente após a confirmação do pagamento. É de
            responsabilidade do Contratante manter suas credenciais de acesso em sigilo e
            informar dados verdadeiros, completos e atualizados no cadastro.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">3. Uso da plataforma</h2>
          <p className="mt-2">
            A Plataforma deve ser utilizada exclusivamente para fins lícitos relacionados à
            gestão da hospedagem do Contratante, incluindo controle de reservas, quartos,
            hóspedes, equipe, promoções, financeiro e relatórios. É vedado o uso da
            Plataforma para armazenar dados de terceiros sem base legal, para fins
            fraudulentos, ou para tentar acessar áreas, dados ou contas de outros
            tenants/clientes da Plataforma.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">4. Planos e limites</h2>
          <p className="mt-2">
            Cada plano possui limites de funcionalidades e volume (por exemplo, quantidade
            de quartos cadastráveis), conforme descrito na página de planos no momento da
            contratação. O upgrade de plano pode ser necessário quando o Contratante
            atingir os limites do plano vigente. Alterações de plano são refletidas na
            cobrança processada pelo site de vendas responsável pelo pagamento.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">5. Dados dos hóspedes</h2>
          <p className="mt-2">
            O Contratante é o responsável (controlador) pelos dados pessoais de seus
            hóspedes e funcionários inseridos na Plataforma, cabendo a ele garantir base
            legal adequada para a coleta e o tratamento desses dados, nos termos da Lei
            Geral de Proteção de Dados (Lei nº 13.709/2018 — LGPD). A Total Pousada atua
            como operadora, processando esses dados apenas conforme as instruções do
            Contratante e para a finalidade de disponibilizar a Plataforma. Veja mais
            detalhes na nossa{' '}
            <Link href="/privacidade" className="text-sky-400 hover:underline">
              Política de Privacidade
            </Link>
            .
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">6. Disponibilidade e suporte</h2>
          <p className="mt-2">
            Envidamos esforços razoáveis para manter a Plataforma disponível de forma
            contínua, mas não garantimos operação ininterrupta. Manutenções programadas
            serão, sempre que possível, comunicadas com antecedência. O suporte técnico é
            prestado conforme os canais e prazos definidos para cada plano.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">7. Cancelamento e suspensão</h2>
          <p className="mt-2">
            O Contratante pode cancelar sua assinatura a qualquer momento através do site
            de vendas responsável pela cobrança. Reservamo-nos o direito de suspender ou
            encerrar o acesso à Plataforma em caso de violação destes Termos, uso
            fraudulento ou inadimplência, mediante aviso prévio quando possível.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">8. Limitação de responsabilidade</h2>
          <p className="mt-2">
            A Plataforma é uma ferramenta de apoio à gestão operacional. A Total Pousada
            não se responsabiliza por decisões comerciais tomadas com base nos dados e
            relatórios gerados, nem por danos indiretos decorrentes do uso da Plataforma,
            respeitados os limites impostos pela legislação aplicável.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">9. Alterações destes termos</h2>
          <p className="mt-2">
            Podemos atualizar estes Termos periodicamente para refletir mudanças na
            Plataforma ou na legislação. A versão vigente estará sempre disponível nesta
            página, com a data da última atualização indicada acima.
          </p>
        </section>

        <section>
          <h2 className="text-base font-semibold text-white">10. Contato</h2>
          <p className="mt-2">
            Dúvidas sobre estes Termos podem ser enviadas para{' '}
            <a href="mailto:contato@totalpousada.com" className="text-sky-400 hover:underline">
              contato@totalpousada.com
            </a>
            .
          </p>
        </section>
      </div>
    </main>
  );
}
