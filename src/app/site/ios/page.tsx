import Link from "next/link";

const steps = [
  {
    step: "01",
    title: "Abra o TemAi no Safari",
    detail:
      "Use o navegador Safari no iPhone. Esse fluxo funciona melhor para instalar o TemAi como app na tela inicial.",
  },
  {
    step: "02",
    title: "Toque em Compartilhar",
    detail:
      "No menu inferior do Safari, toque no ícone de compartilhamento para abrir as ações disponíveis da página.",
  },
  {
    step: "03",
    title: "Escolha Tela de Início",
    detail:
      "Role as opções até encontrar Adicionar à Tela de Início. Confirme o nome e pronto: o TemAi vira um app no seu iPhone.",
  },
];

function SafariShareIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M12 2.8 7.5 7.3l1.1 1.1 2.6-2.6v9h1.6v-9l2.6 2.6 1.1-1.1ZM5.6 11.2h1.6v6.4h9.6v-6.4h1.6v7.2a.8.8 0 0 1-.8.8H6.4a.8.8 0 0 1-.8-.8Z"
      />
    </svg>
  );
}

function PhoneMock({ title, active }: { title: string; active?: boolean }) {
  return (
    <div className="relative mx-auto w-full max-w-[260px] rounded-[2.4rem] border border-[#201611] bg-[#16100D] p-3 shadow-[0_28px_60px_-30px_rgba(0,0,0,0.55)]">
      <div className="mx-auto mb-3 h-1.5 w-16 rounded-full bg-white/10" />
      <div className="overflow-hidden rounded-[2rem] bg-[#FBF5EC]">
        <div className="border-b border-[#E6D8C7] bg-white px-4 py-3">
          <p className="text-[10px] uppercase tracking-[0.24em] text-[#9C887B]">Safari</p>
          <p className="mt-1 text-sm font-semibold text-[#241914]">{title}</p>
        </div>

        <div className="space-y-3 px-4 py-4">
          <div className="rounded-2xl bg-[#F2E7D6] p-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#5B4A40]">temaiapp.vercel.app</span>
              <span className="rounded-full bg-white px-2 py-1 text-[10px] font-semibold text-[#8A7366]">Seguro</span>
            </div>
            <div className="mt-3 h-20 rounded-[1.3rem] bg-[linear-gradient(135deg,#D87143,#F4BE85)]" />
            <div className="mt-3 h-3 w-3/4 rounded-full bg-white/75" />
            <div className="mt-2 h-3 w-1/2 rounded-full bg-white/55" />
          </div>

          <div className="rounded-2xl border border-[#E6D8C7] bg-white p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-[#241914] text-white">
                <SafariShareIcon />
              </div>
              <div>
                <p className="text-sm font-semibold text-[#241914]">
                  {active ? "Adicionar à Tela de Início" : "Compartilhar"}
                </p>
                <p className="text-xs text-[#7B695D]">
                  {active ? "Fixe o TemAi como app no iPhone" : "Abra o menu de ações do Safari"}
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: 8 }).map((_, index) => (
              <div key={index} className="aspect-square rounded-2xl bg-[#EFE4D5]" />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function IosInstallGuidePage() {
  return (
    <main className="min-h-screen bg-[#F4EFE7] text-[#241914]">
      <section className="mx-auto max-w-6xl px-5 pb-16 pt-8 sm:px-8 lg:px-10">
        <Link href="/site" className="text-sm font-semibold text-[#8C5A3F]">
          Voltar para a landing
        </Link>

        <div className="mt-8 grid gap-10 lg:grid-cols-[0.95fr_1.05fr] lg:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#A46544]">iPhone + PWA</p>
            <h1 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
              Instale o TemAi no iPhone em menos de um minuto
            </h1>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#61534A]">
              Enquanto a versão da Apple Store não chega, você pode usar o TemAi como app no iPhone. O atalho fica na tela inicial e abre como experiência dedicada.
            </p>

            <div className="mt-8 grid gap-4">
              {steps.map((item) => (
                <div
                  key={item.step}
                  className="rounded-[1.8rem] border border-[#E2D6C8] bg-white px-5 py-5 shadow-[0_22px_44px_-34px_rgba(33,22,17,0.45)]"
                >
                  <p className="text-sm font-semibold text-[#C86D42]">{item.step}</p>
                  <h2 className="mt-3 text-2xl leading-tight">{item.title}</h2>
                  <p className="mt-2 text-sm leading-7 text-[#65564C]">{item.detail}</p>
                </div>
              ))}
            </div>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link
                href="https://temaiapp.vercel.app/"
                className="inline-flex items-center justify-center rounded-full bg-[#241914] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
              >
                Abrir TemAi agora
              </Link>
              <div className="inline-flex items-center justify-center rounded-full border border-[#D8CBBB] bg-white px-6 py-3 text-sm font-semibold text-[#6B584E]">
                Instalar como app
              </div>
            </div>
          </div>

          <div className="grid gap-5 sm:grid-cols-2">
            <PhoneMock title="Abra o TemAi no Safari" />
            <PhoneMock title="Toque em Compartilhar" />
            <div className="sm:col-span-2">
              <PhoneMock title="Adicionar à Tela de Início" active />
            </div>
          </div>
        </div>
      </section>
    </main>
  );
}
