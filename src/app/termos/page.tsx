import Link from "next/link";
import {
  LEGAL_COMPANY_LAUNCH_NOTE,
  LEGAL_CONTACT_EMAIL,
  LEGAL_CONTACT_MAILTO,
  LEGAL_CONTROLLER_NAME,
  LEGAL_LAST_UPDATED_LABEL,
  LEGAL_TERMS_VERSION,
} from "@/lib/legal";

export default function TermsPage() {
  return (
    <main className="native-page mx-auto w-full max-w-2xl space-y-4 px-4">
      <h1 className="font-display text-3xl text-[#2A1E17]">Termos de Uso</h1>
      <p className="text-sm text-[#6A5E52]">
        Última atualização: {LEGAL_LAST_UPDATED_LABEL} · Versão {LEGAL_TERMS_VERSION}
      </p>

      <section className="space-y-4 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <p>
          Estes Termos regulam o acesso e uso do TemAI, aplicativo de receitas, biblioteca pública,
          organização pessoal e recursos com inteligência artificial. O TemAI é operado por{" "}
          {LEGAL_CONTROLLER_NAME}. {LEGAL_COMPANY_LAUNCH_NOTE}
        </p>
        <p>
          Ao criar conta, acessar ou usar o TemAI, você confirma que leu e concorda com estes Termos e com a
          Política de Privacidade. Se você não concordar, não utilize o app.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">1. Conta, idade e responsabilidades</h2>
        <p>
          Você deve fornecer informações verdadeiras, manter seus dados atualizados e proteger suas
          credenciais. O TemAI não é direcionado a crianças. Menores de 18 anos devem usar o app com
          autorização e supervisão de responsável legal.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">2. O que o TemAI oferece</h2>
        <p>
          O app pode oferecer geração de receitas por texto, áudio ou foto, biblioteca de receitas, receitas
          salvas, lista de compras, receitas autorais, comentários, avaliações, denúncias, notificações,
          badges, organização com IA e suporte. Recursos podem variar por plano, plataforma, país, versão do
          app e disponibilidade técnica.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">3. Uso de inteligência artificial</h2>
        <p>
          As respostas de IA são sugestões automatizadas e podem conter erros, omissões, tempos imprecisos,
          ingredientes inadequados ou informações incompletas. Antes de cozinhar, revise a receita,
          quantidades, alergias, restrições alimentares, validade dos alimentos, modo de preparo, higiene e
          segurança alimentar.
        </p>
        <p>
          O TemAI não substitui nutricionista, médico, chef profissional ou orientação sanitária. Não use o
          app para diagnóstico, tratamento de saúde, dieta clínica ou situações que exijam orientação
          profissional.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">4. Conteúdo do usuário e Biblioteca</h2>
        <p>
          Você continua responsável pelo conteúdo que cria, envia, publica, comenta, avalia ou denuncia. Ao
          publicar conteúdo na Biblioteca, você concede ao TemAI uma licença não exclusiva, gratuita, mundial
          e enquanto o conteúdo permanecer publicado para hospedar, exibir, organizar, adaptar tecnicamente,
          ranquear, moderar e divulgar esse conteúdo dentro do app e de canais oficiais relacionados ao TemAI,
          sem transferir sua titularidade original.
        </p>
        <p>
          Não publique conteúdo ilegal, ofensivo, discriminatório, enganoso, fraudulento, pornográfico,
          violento, perigoso, que incentive dano, viole direitos de terceiros ou contenha dados pessoais de
          outras pessoas sem autorização. O TemAI pode ocultar, remover, limitar alcance, suspender recursos
          ou encerrar contas em caso de abuso, denúncia, risco ou violação destes Termos.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">5. Regras de uso</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Não tente acessar contas, dados, sistemas ou áreas restritas sem autorização.</li>
          <li>Não use automações abusivas, engenharia reversa, scraping, spam ou ataques contra o app.</li>
          <li>Não burle limites de uso, pagamentos, planos, moderação ou mecanismos de segurança.</li>
          <li>Não envie arquivos, textos ou imagens com vírus, código malicioso ou conteúdo ilícito.</li>
          <li>
            Não use o app para violar direitos autorais, marcas, imagem, honra, privacidade ou leis
            aplicáveis.
          </li>
        </ul>

        <h2 className="font-semibold text-[#2A1E17]">6. Plano gratuito, Premium e pagamentos</h2>
        <p>
          O plano gratuito pode ter limites de uso, como limite mensal de gerações por IA. O Premium oferece
          uso livre com proteções anti-abuso, recursos adicionais de IA por áudio/foto, organização,
          publicação na Biblioteca e outros benefícios descritos no app ou na loja aplicável. Uso livre não
          significa uso automatizado, revenda, exploração abusiva ou ausência de limites técnicos de
          segurança.
        </p>
        <p>
          Os planos previstos são mensal e anual. Valores, impostos, promoções, período de cobrança,
          renovação, cancelamento e reembolso são exibidos na App Store, Google Play ou outro provedor de
          pagamento aplicável. Compras em lojas também seguem as regras dessas plataformas, sem prejudicar
          direitos obrigatórios do consumidor.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">7. Propriedade intelectual</h2>
        <p>
          A marca TemAI, interfaces, textos, código, design, organização da base, funcionalidades e demais
          elementos do app pertencem ao operador do TemAI ou a seus licenciantes. É proibido copiar, vender,
          sublicenciar, distribuir, explorar comercialmente, remover avisos de propriedade ou criar serviço
          concorrente com base no app sem autorização.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">8. Privacidade e dados pessoais</h2>
        <p>
          O tratamento de dados pessoais segue a Política de Privacidade. Ao usar IA, voz, foto, comunidade,
          suporte, assinatura ou conta, dados podem ser processados por fornecedores essenciais como
          hospedagem, banco de dados, inteligência artificial, lojas de aplicativos e processadores de
          assinatura.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">9. Disponibilidade e alterações</h2>
        <p>
          O TemAI busca manter o serviço disponível, mas pode haver manutenção, instabilidade,
          indisponibilidade, alterações de funcionalidades, limites técnicos, modo de proteção contra abuso ou
          interrupções causadas por terceiros. Mudanças relevantes serão comunicadas por meio adequado quando
          necessário.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">10. Encerramento e exclusão de conta</h2>
        <p>
          Você pode deixar de usar o app e solicitar exclusão de conta pelo Perfil ou pela página pública de
          exclusão. A exclusão remove a conta e dados vinculados quando tecnicamente e legalmente cabível.
          Alguns registros podem ser mantidos de forma restrita por obrigação legal, segurança, prevenção a
          fraude, defesa de direitos ou preservação de conteúdo público sem vínculo direto com sua identidade.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">11. Limitação de responsabilidade</h2>
        <p>
          Na máxima extensão permitida pela lei brasileira, o TemAI não se responsabiliza por danos
          decorrentes de uso inadequado das receitas, falha em conferir alergias ou segurança alimentar,
          conteúdo de usuários, serviços de terceiros, indisponibilidade temporária, erro de IA ou uso em
          desacordo com estes Termos. Nenhuma cláusula limita direitos irrenunciáveis do consumidor.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">12. Atualizações destes Termos</h2>
        <p>
          Estes Termos podem ser atualizados para refletir mudanças no app, em provedores, planos, legislação
          ou práticas operacionais. A versão vigente sempre indicará data e versão. Mudanças relevantes
          poderão exigir novo aceite ou comunicação destacada.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">13. Lei aplicável e contato</h2>
        <p>
          Estes Termos são regidos pelas leis da República Federativa do Brasil, preservado o foro do
          domicílio do consumidor quando a legislação aplicável assim determinar. Para suporte, conta,
          assinatura ou privacidade/LGPD, fale pelo email{" "}
          <a href={LEGAL_CONTACT_MAILTO} className="font-semibold text-primary underline">
            {LEGAL_CONTACT_EMAIL}
          </a>
          .
        </p>
      </section>

      <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary underline">
        <Link href="/perfil">Voltar para perfil</Link>
        <Link href="/auth">Voltar para login</Link>
        <Link href="/privacidade">Política de Privacidade</Link>
        <Link href="/exclusao-de-conta">Excluir conta e dados</Link>
      </div>
    </main>
  );
}
