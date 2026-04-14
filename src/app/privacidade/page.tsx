import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl space-y-4 px-4 py-6">
      <h1 className="font-display text-3xl text-[#2A1E17]">Politica de Privacidade</h1>
      <p className="text-sm text-[#6A5E52]">Ultima atualizacao: 14/04/2026</p>
      <section className="space-y-4 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <p>
          Esta Politica descreve como o TemAi coleta, utiliza, compartilha e protege dados pessoais de usuarios, em
          conformidade com a Lei Geral de Protecao de Dados (LGPD - Lei 13.709/2018).
        </p>
        <h2 className="font-semibold text-[#2A1E17]">1. Controlador e contato</h2>
        <p>
          Controlador: [RAZAO SOCIAL], CNPJ [CNPJ].<br />
          Contato de suporte: [EMAIL_SUPORTE].<br />
          Contato de privacidade/LGPD: [EMAIL_PRIVACIDADE].
        </p>
        <h2 className="font-semibold text-[#2A1E17]">2. Dados que podemos tratar</h2>
        <p>
          Podemos tratar dados de cadastro (nome, email, username, foto), dados de uso (receitas, avaliacoes,
          interacoes), dados tecnicos (IP, logs, dispositivo), e dados relacionados a assinatura e pagamentos (via
          plataformas terceiras quando aplicavel).
        </p>
        <h2 className="font-semibold text-[#2A1E17]">3. Finalidades</h2>
        <p>
          Usamos os dados para autenticacao, operacao da conta, seguranca, personalizacao, suporte, prevencao a fraude,
          cumprimento de obrigacoes legais e melhoria da plataforma.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">4. Bases legais</h2>
        <p>
          O tratamento pode se basear em execucao de contrato, cumprimento legal/regulatorio, exercicio regular de
          direitos, legitimo interesse e consentimento, conforme o caso.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">5. Compartilhamento</h2>
        <p>
          O TemAi nao vende dados pessoais. O compartilhamento ocorre apenas com provedores essenciais (infraestrutura,
          autenticacao, armazenamento, analytics, IA e pagamentos), autoridades e obrigacoes legais quando necessario.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">6. Retencao e descarte</h2>
        <p>
          Os dados sao mantidos pelo tempo necessario para as finalidades descritas, obrigacoes legais e defesa de
          direitos. Apos isso, podem ser excluidos ou anonimizados, quando possivel.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">7. Direitos do titular</h2>
        <p>
          Voce pode solicitar confirmacao de tratamento, acesso, correcao, portabilidade, anonimização/bloqueio,
          eliminacao quando cabivel, informacoes de compartilhamento e revisao de decisoes automatizadas, conforme LGPD.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">8. Seguranca da informacao</h2>
        <p>
          Adotamos medidas tecnicas e administrativas para protecao dos dados. Ainda assim, nenhum ambiente e
          completamente infalivel, e melhorias de seguranca sao continuas.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">9. Transferencia internacional</h2>
        <p>
          Alguns provedores podem processar dados fora do Brasil. Nesses casos, buscamos salvaguardas adequadas e
          medidas de conformidade.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">10. Alteracoes desta Politica</h2>
        <p>
          Esta Politica pode ser atualizada. A versao vigente sempre indicara a data da ultima atualizacao.
        </p>
      </section>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary underline">
        <Link href="/perfil">Voltar para perfil</Link>
        <Link href="/auth">Voltar para login</Link>
      </div>
    </main>
  );
}
