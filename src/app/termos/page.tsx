import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-2xl space-y-4 px-4 py-6">
      <h1 className="font-display text-3xl text-[#2A1E17]">Termos de Uso</h1>
      <p className="text-sm text-[#6A5E52]">Última atualização: 01/05/2026</p>
      <section className="space-y-4 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <p>
          Estes Termos de Uso regulam a utilização do aplicativo TemAi, produto da Mafra Labs, operada por Bruno Mafra.
          Para suporte, dúvidas sobre conta ou privacidade/LGPD, entre em contato pelo email Mafralabs@outlook.com.
        </p>
        <p>
          Ao criar conta, acessar ou utilizar o TemAi, você declara que leu e concorda com estes Termos e com a Política
          de Privacidade.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">1. Conta e elegibilidade</h2>
        <p>
          O usuário deve possuir capacidade legal para contratar. O usuário é responsável pela veracidade das
          informações da conta e pela segurança de suas credenciais.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">2. Funcionalidades do serviço</h2>
        <p>
          O TemAi oferece recursos de receitas, biblioteca de conteúdo, organização de listas, recomendações e
          funcionalidades com apoio de IA. Resultados gerados por IA podem conter imprecisões e devem ser revisados
          antes do uso.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">3. Assinaturas, pagamento e renovação</h2>
        <p>
          O TemAi pode oferecer plano gratuito e planos pagos por assinatura mensal. Em compras realizadas pela Google
          Play ou App Store, valem também as regras da loja sobre cobrança, renovação, cancelamento e reembolso.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">4. Conteúdo do usuário e moderação</h2>
        <p>
          Não é permitido publicar conteúdo ilegal, ofensivo, discriminatório, enganoso, fraudulento, pornográfico,
          violento ou que viole direitos de terceiros. O TemAi pode remover conteúdo, limitar funcionalidades, suspender
          ou encerrar contas em caso de violação.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">5. Propriedade intelectual</h2>
        <p>
          O app, sua marca, código, layout e base de dados são protegidos por lei. É proibido copiar, distribuir, fazer
          engenharia reversa ou explorar comercialmente sem autorização.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">6. Segurança alimentar e saúde</h2>
        <p>
          O TemAi não substitui orientação médica ou nutricional. O usuário é responsável por conferir ingredientes,
          alergias, higiene, preparo e conservação dos alimentos.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">7. Limitação de responsabilidade</h2>
        <p>
          Na máxima extensão permitida por lei, o TemAi não responde por danos indiretos, lucros cessantes ou perdas
          decorrentes de uso indevido, indisponibilidade temporária, conteúdo de terceiros ou falhas fora de controle
          razoável. Nenhuma cláusula exclui direitos irrenunciáveis do consumidor previstos no ordenamento brasileiro.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">8. Alterações e vigência</h2>
        <p>
          Estes Termos podem ser atualizados a qualquer tempo. Mudanças relevantes serão comunicadas no app/site. O uso
          continuado após a atualização representa aceite da nova versão.
        </p>
        <h2 className="font-semibold text-[#2A1E17]">9. Lei aplicável e foro</h2>
        <p>
          Aplicam-se as leis da República Federativa do Brasil. Fica preservado o foro do domicílio do consumidor quando
          a legislação exigir.
        </p>
      </section>
      <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary underline">
        <Link href="/perfil">Voltar para perfil</Link>
        <Link href="/auth">Voltar para login</Link>
      </div>
    </main>
  );
}
