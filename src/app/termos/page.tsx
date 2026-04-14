import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl space-y-4 px-4 py-6">
      <h1 className="font-display text-3xl text-[#2A1E17]">Termos de Uso</h1>
      <p className="text-sm text-[#6A5E52]">Ultima atualizacao: 14/04/2026</p>
      <section className="space-y-4 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <p>
          Estes Termos de Uso regulam a utilizacao do aplicativo TemAi, operado por [RAZAO SOCIAL], CNPJ [CNPJ], com
          sede em [ENDERECO], contato em [EMAIL_SUPORTE] e canal de privacidade em [EMAIL_PRIVACIDADE].
        </p>
        <p>
          Ao criar conta, acessar ou utilizar o TemAi, voce declara que leu e concorda com estes Termos e com a
          Politica de Privacidade.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">1. Conta e elegibilidade</h2>
        <p>
          O usuario deve possuir capacidade legal para contratar. O usuario e responsavel pela veracidade das
          informacoes da conta e pela seguranca de suas credenciais.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">2. Funcionalidades do servico</h2>
        <p>
          O TemAi oferece recursos de receitas, biblioteca de conteudo, organizacao de listas, recomendacoes e
          funcionalidades com apoio de IA. Resultados gerados por IA podem conter imprecisoes e devem ser revisados
          antes do uso.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">3. Assinaturas, pagamento e renovacao</h2>
        <p>
          O TemAi pode oferecer plano gratuito e planos pagos por assinatura mensal. Em compras realizadas pela Google
          Play ou App Store, valem tambem as regras da loja sobre cobranca, renovacao, cancelamento e reembolso.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">4. Conteudo do usuario e moderacao</h2>
        <p>
          Nao e permitido publicar conteudo ilegal, ofensivo, discriminatorio, enganoso, fraudulento, pornografico,
          violento ou que viole direitos de terceiros. O TemAi pode remover conteudo, limitar funcionalidades,
          suspender ou encerrar contas em caso de violacao.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">5. Propriedade intelectual</h2>
        <p>
          O app, sua marca, codigo, layout e base de dados sao protegidos por lei. E proibido copiar, distribuir,
          fazer engenharia reversa ou explorar comercialmente sem autorizacao.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">6. Seguranca alimentar e saude</h2>
        <p>
          O TemAi nao substitui orientacao medica ou nutricional. O usuario e responsavel por conferir ingredientes,
          alergias, higiene, preparo e conservacao dos alimentos.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">7. Limitacao de responsabilidade</h2>
        <p>
          Na maxima extensao permitida por lei, o TemAi nao responde por danos indiretos, lucros cessantes ou perdas
          decorrentes de uso indevido, indisponibilidade temporaria, conteudo de terceiros ou falhas fora de controle
          razoavel. Nenhuma clausula exclui direitos irrenunciaveis do consumidor previstos no ordenamento brasileiro.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">8. Alteracoes e vigencia</h2>
        <p>
          Estes Termos podem ser atualizados a qualquer tempo. Mudancas relevantes serao comunicadas no app/site. O
          uso continuado apos a atualizacao representa aceite da nova versao.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">9. Lei aplicavel e foro</h2>
        <p>
          Aplicam-se as leis da Republica Federativa do Brasil. Fica eleito o foro da comarca de [CIDADE/UF], sem
          prejuizo do foro do domicilio do consumidor quando a legislacao exigir.
        </p>
      </section>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary underline">
        <Link href="/perfil">Voltar para perfil</Link>
        <Link href="/auth">Voltar para login</Link>
      </div>
    </main>
  );
}
