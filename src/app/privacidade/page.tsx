import Link from "next/link";
import {
  LEGAL_COMPANY_LAUNCH_NOTE,
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_MAILTO,
  LEGAL_CONTROLLER_NAME,
  LEGAL_LAST_UPDATED_LABEL,
  LEGAL_PRIVACY_VERSION,
} from "@/lib/legal";

export default function PrivacyPage() {
  return (
    <main className="native-page mx-auto w-full max-w-2xl space-y-4 px-4">
      <h1 className="font-display text-3xl text-[#2A1E17]">Política de Privacidade</h1>
      <p className="text-sm text-[#6A5E52]">
        Última atualização: {LEGAL_LAST_UPDATED_LABEL} · Versão {LEGAL_PRIVACY_VERSION}
      </p>

      <section className="space-y-4 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <p>
          Esta Política explica como o TemAI coleta, usa, compartilha, armazena e protege dados pessoais. Ela foi
          estruturada com base na Lei Geral de Proteção de Dados Pessoais (LGPD), no Marco Civil da Internet, no Código de
          Defesa do Consumidor e nas exigências de privacidade das lojas de aplicativos.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">1. Controlador e canal LGPD</h2>
        <p>
          Controlador atual: {LEGAL_CONTROLLER_NAME}. {LEGAL_COMPANY_LAUNCH_NOTE} Para suporte, dúvidas, pedidos de
          privacidade ou exercício de direitos, fale pelo email{" "}
          <a href={LEGAL_CONTACT_MAILTO} className="font-semibold text-primary underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>

        <h2 className="font-semibold text-[#2A1E17]">2. Dados que podemos tratar</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Conta e autenticação: nome, email, username, foto, identificadores de login, sessão e datas de aceite.</li>
          <li>Perfil e preferências: equipamentos de cozinha, badges, notificações, receitas salvas e configurações.</li>
          <li>Conteúdo: receitas, ingredientes, modo de preparo, fotos, comentários, avaliações, denúncias e publicações.</li>
          <li>IA: prompts, ingredientes, áudios, fotos, transcrições, sugestões, receitas geradas e logs de uso.</li>
          <li>Técnicos e segurança: IP, data/hora, dispositivo, navegador, sistema operacional, rotas, status e erros.</li>
          <li>Assinatura: plano, status, período, identificadores de produto e informações de recibo recebidas das lojas.</li>
          <li>Suporte: mensagens, anexos enviados por você, protocolos e histórico necessário para atendimento.</li>
        </ul>

        <h2 className="font-semibold text-[#2A1E17]">3. Dados sensíveis</h2>
        <p>
          O TemAI não pede dados sensíveis. Ainda assim, você pode informar alergias, restrições alimentares, condições de
          saúde ou religião ao descrever ingredientes ou preferências. Envie apenas o necessário. Quando esse dado for
          fornecido por você, ele será tratado para operar o recurso solicitado, melhorar sua segurança e respeitar a LGPD.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">4. Finalidades e bases legais</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Criar, autenticar, proteger e manter sua conta.</li>
          <li>Gerar receitas e sugestões com IA por texto, áudio ou foto.</li>
          <li>Salvar receitas, lista de compras, preferências, histórico e configurações.</li>
          <li>Publicar, organizar, recomendar, ranquear, moderar e exibir receitas na Biblioteca.</li>
          <li>Processar comentários, avaliações, denúncias, notificações, suporte e badges.</li>
          <li>Gerenciar plano gratuito, limites de uso, assinatura Premium, restore e suporte de cobrança.</li>
          <li>Prevenir fraude, abuso, spam, ataques, scraping, acesso indevido e violação dos Termos.</li>
          <li>Cumprir obrigações legais, ordens de autoridade, auditorias e exercício regular de direitos.</li>
          <li>Melhorar segurança, desempenho, estabilidade, qualidade de receitas e experiência do app.</li>
        </ul>
        <p>
          As bases legais podem incluir execução de contrato, procedimentos preliminares, obrigação legal ou regulatória,
          exercício regular de direitos, legítimo interesse, prevenção a fraude e segurança, consentimento quando cabível e
          outras bases previstas na LGPD.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">5. IA, áudio e foto</h2>
        <p>
          Quando você usa recursos de IA, os dados enviados podem ser processados por provedores de inteligência
          artificial para gerar receitas, transcrever áudio, identificar ingredientes em imagens, organizar conteúdo e
          aplicar proteções contra abuso. Evite enviar documentos, dados de terceiros ou informações pessoais que não sejam
          necessárias para a receita.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">6. Compartilhamento e fornecedores</h2>
        <p>
          O TemAI não vende dados pessoais e, no v1, não usa dados para publicidade comportamental ou tracking entre apps.
          Podemos compartilhar dados apenas quando necessário com fornecedores essenciais de hospedagem, banco de dados,
          autenticação, armazenamento, IA, email, segurança, observabilidade, lojas de aplicativos, assinatura, suporte,
          autoridades competentes e terceiros envolvidos em obrigações legais ou defesa de direitos.
        </p>
        <p>
          Entre fornecedores técnicos podem estar Supabase, Vercel, OpenAI, RevenueCat, Apple App Store, Google Play,
          provedores de email/suporte e fornecedores equivalentes usados para operar o serviço. Compras feitas pelas lojas
          seguem também as políticas de privacidade e pagamento da Apple ou do Google.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">7. Transferência internacional</h2>
        <p>
          Alguns fornecedores podem armazenar ou processar dados fora do Brasil. Nesses casos, buscamos usar contratos,
          controles de segurança e salvaguardas compatíveis com a LGPD e proporcionais ao tipo de dado tratado.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">8. Retenção e descarte</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Dados de conta e perfil: enquanto sua conta existir, salvo retenções legais ou de segurança.</li>
          <li>Receitas privadas, favoritos e listas: enquanto você mantiver a conta ou o conteúdo salvo.</li>
          <li>Conteúdo publicado: pode permanecer publicado ou ser desvinculado da conta quando necessário à comunidade.</li>
          <li>Logs de IA e segurança: mantidos pelo prazo necessário para custo, auditoria, prevenção a abuso e defesa.</li>
          <li>Assinaturas e suporte: mantidos pelo prazo necessário para cobrança, atendimento, obrigações legais e defesa.</li>
        </ul>
        <p>
          Quando os dados deixarem de ser necessários, eles poderão ser excluídos, anonimizados ou mantidos de forma
          restrita quando houver base legal para conservação.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">9. Cookies, armazenamento local e tecnologias semelhantes</h2>
        <p>
          Podemos usar cookies, localStorage, sessionStorage e tecnologias semelhantes para login, segurança, preferências,
          receitas salvas localmente, restauração de fluxo, medição de uso e melhoria do app. Como o v1 não usa
          publicidade comportamental, eventual adoção futura de analytics ou marketing exigirá revisão desta Política e
          dos formulários das lojas.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">10. Segurança e incidentes</h2>
        <p>
          Adotamos medidas técnicas e administrativas proporcionais ao porte do app, como controle de acesso, separação de
          chaves sensíveis, autenticação, limites de uso, rate limit, monitoramento e revisões de segurança. Nenhum
          ambiente digital é infalível. Incidentes relevantes serão avaliados e comunicados aos titulares e autoridades
          quando a legislação exigir.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">11. Direitos dos titulares</h2>
        <p>
          Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio,
          eliminação quando cabível, portabilidade, informações sobre compartilhamento, revisão de decisões automatizadas,
          consequências do não consentimento e revogação de consentimento quando ele for a base legal.
        </p>
        <p>
          Para exercer seus direitos, envie email para{" "}
          <a href={LEGAL_CONTACT_MAILTO} className="font-semibold text-primary underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          . Podemos pedir informações adicionais para confirmar sua identidade e proteger sua conta.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">12. Exclusão de conta e dados</h2>
        <p>
          Você pode excluir sua conta pelo Perfil do app ou solicitar ajuda pela página pública de exclusão. A exclusão
          remove dados vinculados quando cabível, mas alguns registros podem ser preservados de forma restrita por lei,
          segurança, prevenção a fraude, cobrança, suporte, defesa de direitos ou preservação de conteúdo público sem
          identificação direta.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">13. Decisões automatizadas</h2>
        <p>
          O TemAI usa automações e IA para sugerir receitas, organizar conteúdo, calcular limites de uso, aplicar
          proteções contra abuso, ranquear receitas e apoiar moderação. Quando uma decisão automatizada produzir efeito
          relevante sobre você, você pode solicitar informações e revisão pelo canal de contato.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">14. Crianças e adolescentes</h2>
        <p>
          O TemAI não é direcionado a crianças. Menores de 18 anos devem usar o app com autorização e supervisão de
          responsável legal. Se você acredita que uma criança forneceu dados pessoais sem autorização, entre em contato
          para avaliarmos remoção ou outras providências cabíveis.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">15. Alterações desta Política</h2>
        <p>
          Esta Política pode ser atualizada para refletir mudanças no app, empresa, fornecedores, legislação ou práticas.
          A versão vigente sempre indicará data e versão. Mudanças relevantes poderão exigir novo aceite ou comunicação
          destacada.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary underline">
        <Link href="/perfil">Voltar para perfil</Link>
        <Link href="/auth">Voltar para login</Link>
        <Link href="/termos">Termos de Uso</Link>
        <Link href="/exclusao-de-conta">Excluir conta e dados</Link>
      </div>
    </main>
  );
}
