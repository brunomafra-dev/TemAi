import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="native-page mx-auto w-full max-w-2xl space-y-4 px-4">
      <h1 className="font-display text-3xl text-[#2A1E17]">Política de Privacidade</h1>
      <p className="text-sm text-[#6A5E52]">Última atualização: 18/05/2026</p>

      <section className="space-y-4 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <p>
          Esta Política explica como o TemAI, produto da Mafra Labs, marca/projeto operado por Bruno Mafra, coleta,
          utiliza, compartilha, armazena e protege dados pessoais. Ela foi escrita para refletir a Lei Geral de Proteção
          de Dados Pessoais (LGPD - Lei 13.709/2018), o Marco Civil da Internet e demais normas brasileiras aplicáveis.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">1. Controlador e canal de contato</h2>
        <p>
          Controlador: Mafra Labs, marca/projeto operado por Bruno Mafra. Para suporte, dúvidas, pedidos de privacidade
          ou exercício de direitos de titular, entre em contato pelo email Mafralabs@outlook.com.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">2. Dados que podemos tratar</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Dados de conta: nome, email, username, foto, identificadores de autenticação e senha protegida pelo provedor.</li>
          <li>Dados de perfil: preferências, equipamentos de cozinha, plano, badges, notificações e configurações.</li>
          <li>Conteúdo do usuário: receitas, ingredientes, modo de preparo, fotos, comentários, avaliações e denúncias.</li>
          <li>Dados de IA: textos, ingredientes, áudios, fotos, transcrições, sugestões, receitas geradas e logs de uso.</li>
          <li>Dados técnicos: IP, data/hora, dispositivo, navegador, sistema operacional, registros de acesso e segurança.</li>
          <li>Dados de assinatura: status do plano, período de validade e informações recebidas de lojas ou processadores de pagamento.</li>
          <li>Dados de suporte: mensagens enviadas, tópicos de atendimento e histórico necessário para resolver solicitações.</li>
        </ul>

        <h2 className="font-semibold text-[#2A1E17]">3. Dados sensíveis e cuidado ao enviar informações</h2>
        <p>
          O TemAI não pede que você informe dados sensíveis, como informações de saúde, religião, biometria ou origem
          racial. Ainda assim, você pode mencionar alergias, restrições alimentares ou condições de saúde ao usar a IA.
          Envie apenas o necessário. Quando esse dado for fornecido por você, ele será tratado para operar o recurso
          solicitado e proteger sua experiência, conforme a LGPD.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">4. Para que usamos os dados</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Criar, autenticar, proteger e manter sua conta.</li>
          <li>Gerar sugestões e receitas com IA por texto, áudio ou foto.</li>
          <li>Salvar receitas, lista de compras, preferências, histórico e configurações.</li>
          <li>Publicar, organizar, recomendar, moderar e exibir receitas na Biblioteca.</li>
          <li>Processar comentários, avaliações, denúncias, notificações e badges.</li>
          <li>Gerenciar plano gratuito, limites de uso, assinatura Premium e suporte.</li>
          <li>Prevenir fraude, abuso, spam, ataques, acesso indevido e violações dos Termos.</li>
          <li>Cumprir obrigações legais, ordens de autoridade e exercer direitos em processos administrativos ou judiciais.</li>
          <li>Melhorar segurança, desempenho, estabilidade, qualidade de receitas e experiência do app.</li>
        </ul>

        <h2 className="font-semibold text-[#2A1E17]">5. Bases legais</h2>
        <p>
          Dependendo do contexto, tratamos dados com base em execução de contrato ou procedimentos preliminares,
          cumprimento de obrigação legal ou regulatória, exercício regular de direitos, legítimo interesse, proteção ao
          crédito quando aplicável, prevenção a fraude e segurança, consentimento e outras bases previstas na LGPD.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">6. IA, áudio, fotos e provedores externos</h2>
        <p>
          Quando você usa recursos de IA, os dados enviados podem ser processados por provedores de inteligência
          artificial para gerar sugestões, transcrever áudio, identificar ingredientes em imagens ou organizar receitas.
          Evite enviar informações pessoais desnecessárias, documentos, dados de terceiros ou detalhes sensíveis que não
          sejam relevantes para a receita.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">7. Compartilhamento de dados</h2>
        <p>
          O TemAI não vende dados pessoais. Podemos compartilhar dados apenas quando necessário com provedores de
          hospedagem, banco de dados, autenticação, armazenamento, IA, email, segurança, observabilidade, analytics,
          lojas de aplicativos, processadores de pagamento, suporte, autoridades competentes ou terceiros envolvidos em
          obrigações legais e defesa de direitos.
        </p>
        <p>
          Entre os provedores técnicos do app podem estar Supabase, Vercel, OpenAI, lojas de aplicativos e outros
          fornecedores equivalentes usados para operar o serviço.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">8. Transferência internacional</h2>
        <p>
          Alguns provedores podem armazenar ou processar dados fora do Brasil. Nesses casos, buscamos adotar medidas
          compatíveis com a LGPD, contratos, controles de segurança e salvaguardas adequadas ao tipo de tratamento.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">9. Retenção e descarte</h2>
        <p>
          Mantemos dados pelo tempo necessário para prestar o serviço, cumprir finalidades informadas, respeitar prazos
          legais, manter segurança, prevenir fraude, resolver disputas e exercer direitos. Registros técnicos e de acesso
          podem ser preservados por prazos exigidos pelo Marco Civil da Internet e por outras normas aplicáveis.
        </p>
        <p>
          Quando os dados deixarem de ser necessários, eles poderão ser excluídos, anonimizados ou mantidos de forma
          restrita quando houver base legal para conservação.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">10. Cookies, armazenamento local e tecnologias semelhantes</h2>
        <p>
          Podemos usar cookies, localStorage, sessionStorage e tecnologias semelhantes para login, segurança,
          preferências, receitas salvas localmente, restauração de fluxo, medição de uso e melhoria do app. Configurações
          do navegador ou sistema podem limitar parte dessas tecnologias, mas isso pode afetar funcionalidades.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">11. Segurança da informação</h2>
        <p>
          Adotamos medidas técnicas e administrativas para proteger dados pessoais, como controles de acesso, separação de
          chaves sensíveis, políticas de autenticação, limites de uso, monitoramento e revisões de segurança. Nenhum
          ambiente digital é totalmente infalível; por isso, também recomendamos que você proteja sua conta e dispositivo.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">12. Direitos dos titulares</h2>
        <p>
          Nos termos da LGPD, você pode solicitar confirmação de tratamento, acesso, correção, anonimização, bloqueio,
          eliminação quando cabível, portabilidade, informações sobre compartilhamento, revisão de decisões automatizadas,
          informações sobre consequências do não consentimento e revogação de consentimento quando ele for a base legal.
        </p>
        <p>
          Para exercer seus direitos, envie um email para Mafralabs@outlook.com. Podemos solicitar informações adicionais
          para confirmar sua identidade e proteger sua conta.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">13. Decisões automatizadas e recomendações</h2>
        <p>
          O TemAI usa automações e IA para sugerir receitas, organizar conteúdo, calcular limites de uso, aplicar
          proteções contra abuso e apoiar moderação. Quando uma decisão automatizada produzir efeito relevante sobre você,
          você pode solicitar informações e revisão pelo canal de contato.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">14. Crianças e adolescentes</h2>
        <p>
          O TemAI não é direcionado a crianças. Menores de 18 anos devem usar o app com autorização e supervisão de
          responsável legal. Se você acredita que uma criança forneceu dados pessoais sem autorização, entre em contato
          para avaliarmos a remoção ou outras providências cabíveis.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">15. Alterações desta Política</h2>
        <p>
          Esta Política pode ser atualizada para refletir mudanças no app, em provedores, na legislação ou em nossas
          práticas. A versão vigente sempre indicará a data da última atualização, e mudanças relevantes poderão ser
          comunicadas por meios adequados.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary underline">
        <Link href="/perfil">Voltar para perfil</Link>
        <Link href="/auth">Voltar para login</Link>
        <Link href="/termos">Termos de Uso</Link>
      </div>
    </main>
  );
}
