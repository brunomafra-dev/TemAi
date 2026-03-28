import Link from "next/link";

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-screen w-full max-w-md space-y-4 px-4 py-6">
      <h1 className="font-display text-3xl text-[#2A1E17]">Politica de Privacidade</h1>
      <p className="text-sm text-[#6A5E52]">Ultima atualizacao: 28/03/2026</p>
      <section className="space-y-3 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <p>
          Coletamos dados necessarios para funcionamento da conta, como nome, email, username e foto de perfil.
        </p>
        <p>
          Esses dados sao usados para autenticacao, personalizacao da experiencia e sincronizacao entre dispositivos.
        </p>
        <p>
          Nao vendemos dados pessoais. Compartilhamentos ocorrem apenas com provedores tecnicos necessarios para operar o app.
        </p>
        <p>
          Voce pode solicitar atualizacao ou exclusao dos seus dados. Ao excluir a conta, os dados vinculados sao removidos conforme politicas tecnicas e legais aplicaveis.
        </p>
        <p>
          Adotamos medidas de seguranca para proteger informacoes, mas nenhum sistema e 100% infalivel.
        </p>
      </section>
      <Link href="/auth" className="text-sm font-semibold text-primary underline">
        Voltar para login
      </Link>
    </main>
  );
}
