import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl space-y-4 px-4 py-6">
      <h1 className="font-display text-3xl text-[#2A1E17]">Política de Privacidade</h1>
      <p className="text-sm text-[#6A5E52]">Última atualização: 01/05/2026</p>
      <section className="space-y-4 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <p>
          Esta Política descreve como o TemAi, produto da Mafra Labs, coleta, utiliza, compartilha e protege dados
          pessoais de usuários, em conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei 13.709/2018).
        </p>
        <h2 className="font-semibold text-[#2A1E17]">1. Controlador e contato</h2>
        <p>
          Controlador: Mafra Labs, operada por Bruno Mafra. Para suporte, dúvidas sobre conta ou solicitações
          relacionadas à privacidade/LGPD, entre em contato pelo email Mafralabs@outlook.com.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">2. Dados que podemos tratar</h2>
        <p>
          Podemos tratar dados de cadastro (nome, email, username, foto), dados de uso (receitas, avaliações,
          interações), dados técnicos (IP, logs, dispositivo), e dados relacionados a assinatura e pagamentos (via
          plataformas terceiras quando aplicável).
        </p>
        <h2 className="font-semibold text-[#2A1E17]">3. Finalidades</h2>
        <p>
          Usamos os dados para autenticação, operação da conta, segurança, personalização, suporte, prevenção a fraude,
          cumprimento de obrigações legais e melhoria da plataforma.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">4. Bases legais</h2>
        <p>
          O tratamento pode se basear em execução de contrato, cumprimento legal/regulatório, exercício regular de
          direitos, legítimo interesse e consentimento, conforme o caso.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">5. Compartilhamento</h2>
        <p>
          O TemAi não vende dados pessoais. O compartilhamento ocorre apenas com provedores essenciais (infraestrutura,
          autenticação, armazenamento, analytics, IA e pagamentos), autoridades e obrigações legais quando necessário.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">6. Retenção e descarte</h2>
        <p>
          Os dados são mantidos pelo tempo necessário para as finalidades descritas, obrigações legais e defesa de
          direitos. Após isso, podem ser excluídos ou anonimizados, quando possível.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">7. Direitos do titular</h2>
        <p>
          Você pode solicitar confirmação de tratamento, acesso, correção, portabilidade, anonimização/bloqueio,
          eliminação quando cabível, informações de compartilhamento e revisão de decisões automatizadas, conforme LGPD.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">8. Segurança da informação</h2>
        <p>
          Adotamos medidas técnicas e administrativas para proteção dos dados. Ainda assim, nenhum ambiente é
          completamente infalível, e melhorias de segurança são contínuas.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">9. Transferência internacional</h2>
        <p>
          Alguns provedores podem processar dados fora do Brasil. Nesses casos, buscamos salvaguardas adequadas e
          medidas de conformidade.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">10. Alterações desta Política</h2>
        <p>
          Esta Política pode ser atualizada. A versão vigente sempre indicará a data da última atualização.
        </p>
      </section>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary underline">
        <Link href="/perfil">Voltar para perfil</Link>
        <Link href="/auth">Voltar para login</Link>
      </div>
    </main>
  );
}
