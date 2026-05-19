import Link from "next/link";
import { LEGAL_CONTACT_EMAIL, LEGAL_CONTACT_MAILTO } from "@/lib/legal";

export default function AccountDeletionPage() {
  return (
    <main className="native-page mx-auto w-full max-w-2xl space-y-4 px-4">
      <h1 className="font-display text-3xl text-[#2A1E17]">Exclusão de conta e dados</h1>
      <p className="text-sm text-[#6A5E52]">
        Use esta página para entender como excluir sua conta TemAI e solicitar ajuda caso você não consiga acessar o app.
      </p>

      <section className="space-y-4 rounded-2xl border border-[#E5D7BF] bg-[#FFFCF7] p-4 text-sm text-[#4F4338]">
        <h2 className="font-semibold text-[#2A1E17]">Excluir pelo app</h2>
        <p>
          Se você consegue entrar na conta, abra o TemAI, vá em Perfil, toque em Excluir conta e confirme a ação. Esse é o
          caminho mais rápido porque valida sua sessão antes da exclusão.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">Solicitar por email</h2>
        <p>
          Se você perdeu acesso ou precisa de ajuda, envie um email para{" "}
          <a
            href={`${LEGAL_CONTACT_MAILTO}?subject=TemAI%20-%20Exclus%C3%A3o%20de%20conta`}
            className="font-semibold text-primary underline"
          >
            {LEGAL_CONTACT_EMAIL}
          </a>{" "}
          com o assunto &quot;TemAI - Exclusão de conta&quot; e informe o email cadastrado. Podemos pedir confirmação adicional
          para proteger sua conta.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">O que é removido</h2>
        <p>
          A exclusão remove a conta e dados vinculados quando tecnicamente e legalmente cabível, incluindo perfil,
          preferências, receitas privadas, favoritos, listas, avaliações, comentários, tickets e dados locais do
          dispositivo quando a exclusão é feita pelo app.
        </p>

        <h2 className="font-semibold text-[#2A1E17]">O que pode ser preservado</h2>
        <p>
          Alguns registros podem ser mantidos por obrigação legal, segurança, prevenção a fraude, cobrança, suporte,
          defesa de direitos ou preservação de conteúdo público sem identificação direta. Assinaturas compradas pela App
          Store ou Google Play também devem ser canceladas na respectiva loja.
        </p>
      </section>

      <div className="flex flex-wrap gap-3 text-sm font-semibold text-primary underline">
        <Link href="/perfil">Abrir perfil</Link>
        <Link href="/termos">Termos de Uso</Link>
        <Link href="/privacidade">Política de Privacidade</Link>
      </div>
    </main>
  );
}
