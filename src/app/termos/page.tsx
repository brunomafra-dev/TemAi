import Link from "next/link";

export default function TermsPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-4 px-4 py-6">
      <h1 className="font-display text-3xl text-[#2A1E17]">Termos de Uso</h1>
      <p className="text-sm text-[#6A5E52]">Ultima atualizacao: 28/03/2026</p>
      <section className="space-y-3 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <p>
          O TemAi oferece sugestoes culinarias, organizacao de receitas e recursos de apoio. O usuario e responsavel por validar ingredientes, alergias, higiene e seguranca alimentar antes do consumo.
        </p>
        <p>
          Nao e permitido publicar conteudo ofensivo, ilegal, enganoso ou que viole direitos de terceiros.
          Conteudos podem ser moderados e removidos.
        </p>
        <p>
          Contas podem ser suspensas em caso de abuso, fraude, spam ou uso malicioso da plataforma.
        </p>
        <p>
          Recursos de IA podem sugerir informacoes imprecisas. Sempre revise resultados antes de usar.
        </p>
        <p>
          O usuario e responsavel pelas credenciais de acesso e pela seguranca da conta.
        </p>
      </section>
      <Link href="/auth" className="text-sm font-semibold text-primary underline">
        Voltar para login
      </Link>
    </main>
  );
}
