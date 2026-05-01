import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

const dishGallery = [
  {
    src: "https://images.unsplash.com/photo-1544025162-d76694265947?auto=format&fit=crop&w=1200&q=80",
    alt: "Prato principal finalizado com legumes e proteína grelhada",
  },
  {
    src: "https://images.unsplash.com/photo-1482049016688-2d3e1b311543?auto=format&fit=crop&w=1200&q=80",
    alt: "Mesa com café da manhã e ingredientes simples transformados em refeição",
  },
  {
    src: "https://images.unsplash.com/photo-1512621776951-a57141f2eefd?auto=format&fit=crop&w=1200&q=80",
    alt: "Bowl colorido preparado com ingredientes frescos",
  },
];

const testimonials = [
  {
    name: "Marina Costa",
    role: "Usuária TemAi",
    quote:
      "Nunca pensei que conseguiria criar pratos desse nível com tão poucos ingredientes. O TemAi virou meu plano B e meu plano A.",
    image:
      "https://images.unsplash.com/photo-1504674900247-0877df9cc836?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Rafael Nunes",
    role: "Usuário premium",
    quote:
      "Eu abria a geladeira e travava. Agora tiro uma foto, recebo ideias boas e ainda economizo porque paro de deixar ingrediente vencer.",
    image:
      "https://images.unsplash.com/photo-1414235077428-338989a2e8c0?auto=format&fit=crop&w=1000&q=85",
  },
  {
    name: "Juliana Melo",
    role: "Usuária premium",
    quote:
      "Uso por áudio quando estou cozinhando e o app me ajuda a transformar sobra em janta de verdade. Parece simples, mas muda a rotina.",
    image:
      "https://images.unsplash.com/photo-1551218808-94e220e084d2?auto=format&fit=crop&w=1000&q=85",
  },
];

const steps = [
  {
    title: "Mostre o que você tem",
    description: "Envie uma foto, descreva por texto ou fale os ingredientes por áudio.",
  },
  {
    title: "Receba ideias com contexto",
    description: "A IA combina o que você tem em casa e cria opções realistas para o seu momento.",
  },
  {
    title: "Cozinhe com mais segurança",
    description: "Você escolhe uma receita pronta para seguir, salvar, ajustar e compartilhar.",
  },
];

const benefits = [
  "Transforma sobra de geladeira em refeição de verdade",
  "Ajuda quem não tem repertório culinário a decidir rápido",
  "Economiza tempo, desperdício e idas desnecessárias ao mercado",
  "Entrega ideias por foto, áudio ou texto no formato mais fácil para cada pessoa",
];

const appUrl = "https://temaiapp.vercel.app/";
const iosPwaGuideUrl = "/site/ios";

function PlayStoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path d="M3 2.5 14.8 12 3 21.5Z" fill="#00D3FF" />
      <path d="M3 2.5 18.6 10.9 14.8 12 3 2.5Z" fill="#00E091" />
      <path d="M14.8 12 18.6 10.9 21 12.2 18.4 13.7Z" fill="#FFD23F" />
      <path d="M3 21.5 14.8 12 18.4 13.7 3 21.5Z" fill="#FF5A5F" />
    </svg>
  );
}

function AndroidIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M7.2 8.3h9.6a4.8 4.8 0 0 1 4.8 4.8v4.5a1.4 1.4 0 0 1-1.4 1.4h-1v2.2a1.2 1.2 0 0 1-2.4 0V19H7.2v2.2a1.2 1.2 0 0 1-2.4 0V19h-1a1.4 1.4 0 0 1-1.4-1.4v-4.5a4.8 4.8 0 0 1 4.8-4.8Zm2-4.4 1.5 2.6m4.1-2.6-1.5 2.6M9 14.1a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Zm6 0a.8.8 0 1 0 0-1.6.8.8 0 0 0 0 1.6Z"
      />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5">
      <path
        fill="currentColor"
        d="M15.5 3.2c0 1-.4 1.9-1.1 2.6-.8.8-1.8 1.2-2.8 1.1-.1-1 .3-2 1-2.7.8-.8 1.9-1.2 2.9-1Zm3.3 13.7c-.4 1-1 2-1.7 2.8-.9 1.1-1.8 1.7-2.8 1.7-.4 0-1-.1-1.7-.4s-1.4-.4-1.8-.4-1 .1-1.8.4c-.8.2-1.4.4-1.8.4-1 0-2-.6-2.9-1.8A11.9 11.9 0 0 1 2 12.6c0-2 .5-3.7 1.6-5 .9-1.1 2.1-1.8 3.5-1.8.5 0 1.2.1 2 .4.8.3 1.4.4 1.6.4.2 0 .8-.1 1.8-.5 1-.3 1.9-.5 2.5-.4 1.7.1 3 .8 3.8 2.2-1.5 1-2.3 2.4-2.3 4.2 0 1.4.5 2.6 1.5 3.6.4.4.9.7 1.4.9-.1.4-.2.7-.4 1.1Z"
      />
    </svg>
  );
}

function AppStoreIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-6 w-6">
      <path
        fill="currentColor"
        d="m9.2 4.8 1.4-.8 7.2 12.5-1.4.8Zm-4.3 13 1.4-.8 3.8 6.6-1.4.8Zm2-8.8h10.8v1.6H6.9Zm-2.5 7.6h13.5v1.6H4.4Z"
      />
    </svg>
  );
}

function DownloadButton({
  href,
  eyebrow,
  title,
  description,
  leftIcon,
  rightIcon,
  subtle,
}: {
  href: string;
  eyebrow: string;
  title: string;
  description: string;
  leftIcon: ReactNode;
  rightIcon: ReactNode;
  subtle?: boolean;
}) {
  return (
    <Link
      href={href}
      className={
        subtle
          ? "group flex items-center justify-between gap-4 rounded-[1.6rem] border border-[#D9D1C2] bg-white px-5 py-4 text-[#241914] transition hover:-translate-y-0.5 hover:border-[#C76E41] hover:shadow-[0_20px_40px_-28px_rgba(27,20,15,0.45)]"
          : "group flex items-center justify-between gap-4 rounded-[1.6rem] border border-[#D46F43] bg-[#231712] px-5 py-4 text-[#FFF7F1] transition hover:-translate-y-0.5 hover:bg-[#2C1B14] hover:shadow-[0_24px_44px_-28px_rgba(27,20,15,0.6)]"
      }
    >
      <div className="flex items-center gap-4">
        <div
          className={
            subtle
              ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F4EBDD] text-[#1F1713]"
              : "flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F5E5D8] text-[#241914]"
          }
        >
          {leftIcon}
        </div>
        <div>
          <p className={subtle ? "text-[11px] uppercase tracking-[0.24em] text-[#8B7567]" : "text-[11px] uppercase tracking-[0.24em] text-[#E5BFA5]"}>
            {eyebrow}
          </p>
          <p className="mt-1 text-lg font-semibold">{title}</p>
          <p className={subtle ? "mt-1 text-sm text-[#6C5C51]" : "mt-1 text-sm text-[#E7D4C7]"}>
            {description}
          </p>
        </div>
      </div>
      <div
        className={
          subtle
            ? "flex h-11 w-11 items-center justify-center rounded-full border border-[#E4D8C9] text-[#382922]"
            : "flex h-11 w-11 items-center justify-center rounded-full border border-white/15 text-[#FFF7F1]"
        }
      >
        {rightIcon}
      </div>
    </Link>
  );
}

export default function MarketingPage() {
  return (
    <main className="bg-[#F4EFE7] text-[#241914]">
      <section className="relative isolate overflow-hidden bg-[linear-gradient(180deg,#2D1A14_0%,#3A2219_42%,#F4EFE7_100%)] text-[#FFF7F1]">
        <div className="absolute inset-0 opacity-40">
          <Image
            src="https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1800&q=80"
            alt="Mesa com pratos prontos e ingredientes frescos"
            fill
            priority
            sizes="100vw"
            className="object-cover object-center"
          />
        </div>
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(26,16,12,0.58)_0%,rgba(34,20,15,0.72)_45%,rgba(45,26,20,0.92)_100%)]" />

        <div className="relative mx-auto max-w-6xl px-5 pb-18 pt-6 sm:px-8 lg:px-10">
          <header className="flex items-center justify-between gap-4">
            <div>
              <p className="font-display text-2xl">TemAi</p>
              <p className="text-xs uppercase tracking-[0.24em] text-[#E8CDBA]">
                Receitas por foto, áudio e texto
              </p>
            </div>
            <Link
              href="#baixe-agora"
              className="rounded-full border border-white/15 bg-white/8 px-4 py-2 text-sm font-semibold text-white backdrop-blur"
            >
              Baixe agora
            </Link>
          </header>

          <div className="grid gap-10 pt-12 lg:grid-cols-[1.05fr_0.95fr] lg:items-end lg:pt-18">
            <div className="max-w-2xl">
              <p className="text-xs uppercase tracking-[0.3em] text-[#EDC3A7]">
                Chega de abrir a geladeira sem ideia
              </p>
              <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.96] sm:text-6xl lg:text-7xl">
                Nunca mais diga que não tem nada em casa
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-7 text-[#F4E4D8] sm:text-xl">
                Crie receitas de chef com ingredientes que estão sobrando na geladeira.
              </p>
              <p className="mt-2 max-w-xl text-base leading-7 text-[#E9D6CA] sm:text-lg">
                Descubra formas criativas de combinar ingredientes e transforme dúvida, pressa e falta de repertório em refeições que realmente valem a pena.
              </p>

              <div className="mt-8 max-w-xl rounded-[1.4rem] border border-white/12 bg-black/18 p-4 backdrop-blur">
                <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-[#EDC3A7]">
                  Recursos do app
                </p>
                <div className="mt-3 flex flex-wrap gap-2 text-sm text-[#FFF2EA]">
                  <span className="rounded-full border border-[#EDC3A7]/35 bg-white/10 px-4 py-2">IA por foto</span>
                  <span className="rounded-full border border-[#EDC3A7]/35 bg-white/10 px-4 py-2">IA por áudio</span>
                  <span className="rounded-full border border-[#EDC3A7]/35 bg-white/10 px-4 py-2">IA por texto</span>
                  <span className="rounded-full border border-[#EDC3A7]/35 bg-white/10 px-4 py-2">Biblioteca compartilhada</span>
                </div>
              </div>

              <div className="mt-9 flex flex-col gap-3 sm:flex-row">
                <Link
                  href="#baixe-agora"
                  className="inline-flex items-center justify-center rounded-full bg-[#D97243] px-6 py-3 text-sm font-semibold text-white transition hover:brightness-95"
                >
                  Quero cozinhar melhor agora
                </Link>
                <Link
                  href="#como-funciona"
                  className="inline-flex items-center justify-center rounded-full border border-white/15 bg-white/8 px-6 py-3 text-sm font-semibold text-white backdrop-blur"
                >
                  Ver como funciona
                </Link>
              </div>

              <div className="mt-10 grid max-w-xl grid-cols-1 gap-4 sm:grid-cols-3">
                <div className="rounded-[1.4rem] border border-white/10 bg-white/7 px-4 py-4 backdrop-blur">
                  <p className="text-3xl font-semibold">3x</p>
                  <p className="mt-2 text-sm text-[#E8D6C9]">mais caminhos para criar receitas com o que já existe na sua casa</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/7 px-4 py-4 backdrop-blur">
                  <p className="text-3xl font-semibold">1 foto</p>
                  <p className="mt-2 text-sm text-[#E8D6C9]">pode virar ideia, receita final e menos desperdício na semana</p>
                </div>
                <div className="rounded-[1.4rem] border border-white/10 bg-white/7 px-4 py-4 backdrop-blur">
                  <p className="text-3xl font-semibold">+ clareza</p>
                  <p className="mt-2 text-sm text-[#E8D6C9]">para decidir o que cozinhar sem perder tempo pensando</p>
                </div>
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
              <div className="relative min-h-[300px] overflow-hidden rounded-[2rem] border border-white/10 shadow-[0_36px_70px_-30px_rgba(0,0,0,0.55)]">
                <Image
                  src={dishGallery[0].src}
                  alt={dishGallery[0].alt}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 40vw"
                  className="object-cover"
                />
                <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(34,20,15,0.04)_0%,rgba(34,20,15,0.78)_100%)]" />
                <div className="absolute bottom-0 left-0 right-0 p-5">
                  <p className="text-xs uppercase tracking-[0.25em] text-[#EDC7AE]">Resultado</p>
                  <p className="mt-2 max-w-xs text-xl font-semibold">
                    Ideias bonitas, possíveis e com cara de refeição de verdade
                  </p>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-2">
                {dishGallery.slice(1).map((dish) => (
                  <div
                    key={dish.src}
                    className="relative min-h-[168px] overflow-hidden rounded-[1.6rem] border border-white/10 shadow-[0_24px_50px_-30px_rgba(0,0,0,0.55)]"
                  >
                    <Image
                      src={dish.src}
                      alt={dish.alt}
                      fill
                      sizes="(max-width: 1024px) 50vw, 20vw"
                      className="object-cover"
                    />
                    <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(34,20,15,0.06)_0%,rgba(34,20,15,0.72)_100%)]" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className="border-y border-[#E2D6C8] bg-[#F8F3EC]">
        <div className="mx-auto max-w-6xl px-5 py-6 sm:px-8 lg:px-10">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            {benefits.map((benefit) => (
              <div key={benefit} className="rounded-[1.2rem] bg-white px-4 py-4 text-sm text-[#5F5148] shadow-[0_16px_30px_-28px_rgba(33,22,17,0.45)]">
                {benefit}
              </div>
            ))}
          </div>
        </div>
      </section>

      <section id="como-funciona" className="mx-auto max-w-6xl px-5 py-18 sm:px-8 lg:px-10">
        <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#A46544]">Como funciona</p>
            <h2 className="mt-4 max-w-lg font-display text-4xl leading-tight text-[#241914] sm:text-5xl">
              O app que pensa junto com você quando falta repertório
            </h2>
            <p className="mt-4 max-w-lg text-lg leading-8 text-[#61534A]">
              O TemAi foi desenhado para quem quer cozinhar melhor sem depender de inspiração espontânea. Você mostra o que tem. O app organiza, sugere, estrutura e te ajuda a chegar em um prato que faz sentido.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {steps.map((step, index) => (
              <div
                key={step.title}
                className="rounded-[1.8rem] border border-[#E2D6C8] bg-white px-5 py-6 shadow-[0_22px_44px_-34px_rgba(33,22,17,0.45)]"
              >
                <p className="text-sm font-semibold text-[#C86D42]">0{index + 1}</p>
                <h3 className="mt-4 text-2xl leading-tight text-[#241914]">{step.title}</h3>
                <p className="mt-3 text-sm leading-7 text-[#65564C]">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#241914] text-[#FFF8F2]">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-18 sm:px-8 lg:grid-cols-[1fr_1fr] lg:px-10">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#E0B899]">Por que converte tanto na rotina</p>
            <h2 className="mt-4 font-display text-4xl leading-tight sm:text-5xl">
              O benefício principal não é receita. É decisão.
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-8 text-[#E5D3C7]">
              Quando a pessoa não sabe o que fazer, ela pede delivery, improvisa mal ou deixa ingrediente estragar. O TemAi entra exatamente nesse momento de indecisão e devolve clareza, economia e confiança.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
              <p className="text-sm font-semibold text-[#E7BC9F]">Para iniciantes</p>
              <p className="mt-3 text-sm leading-7 text-[#F1E3DA]">
                Tira o peso de inventar do zero e ajuda a cozinhar melhor mesmo sem experiência.
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
              <p className="text-sm font-semibold text-[#E7BC9F]">Para quem já cozinha</p>
              <p className="mt-3 text-sm leading-7 text-[#F1E3DA]">
                Abre novas combinações e salva tempo nos dias corridos em que falta imaginação.
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
              <p className="text-sm font-semibold text-[#E7BC9F]">Para o bolso</p>
              <p className="mt-3 text-sm leading-7 text-[#F1E3DA]">
                Aproveita melhor o que já está em casa e reduz desperdício ao longo da semana.
              </p>
            </div>
            <div className="rounded-[1.8rem] border border-white/10 bg-white/6 p-6">
              <p className="text-sm font-semibold text-[#E7BC9F]">Para assinatura</p>
              <p className="mt-3 text-sm leading-7 text-[#F1E3DA]">
                O valor fica claro quando a pessoa usa o app como companhia real para decidir o que cozinhar.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-18 sm:px-8 lg:px-10">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.28em] text-[#A46544]">Prova social</p>
            <h2 className="mt-4 font-display text-4xl leading-tight text-[#241914] sm:text-5xl">
              O tipo de reação que queremos provocar
            </h2>
          </div>
        </div>

        <div className="mt-8 grid gap-5 lg:grid-cols-3">
          {testimonials.map((item) => (
            <article
              key={item.name}
              className="overflow-hidden rounded-[2rem] border border-[#E2D6C8] bg-white shadow-[0_22px_44px_-34px_rgba(33,22,17,0.45)]"
            >
              <div className="relative h-56">
                <Image
                  src={item.image}
                  alt={`Prato citado por ${item.name}`}
                  fill
                  sizes="(max-width: 1024px) 100vw, 33vw"
                  className="object-cover"
                />
              </div>
              <div className="p-6">
                <p className="text-base leading-8 text-[#4F4239]">&quot;{item.quote}&quot;</p>
                <p className="mt-5 text-sm font-semibold text-[#241914]">{item.name}</p>
                <p className="text-sm text-[#7C6B60]">{item.role}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      <section id="baixe-agora" className="bg-[#EEE3D5]">
        <div className="mx-auto max-w-6xl px-5 py-18 sm:px-8 lg:px-10">
          <div className="grid gap-10 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
            <div>
              <p className="text-xs uppercase tracking-[0.28em] text-[#A46544]">Baixe agora</p>
              <h2 className="mt-4 font-display text-4xl leading-tight text-[#241914] sm:text-5xl">
                Entre no TemAi do jeito certo para o seu aparelho
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-8 text-[#61534A]">
                Android vai para o app. iPhone entra pela experiência PWA com passo a passo claro, sem cair por engano numa página errada quando o objetivo for cozinhar.
              </p>
            </div>

            <div className="grid gap-4">
              <DownloadButton
                href={appUrl}
                eyebrow="Android"
                title="Abrir TemAi agora"
                description="Entre no app pelo navegador e comece a criar receitas com o que você tem em casa."
                leftIcon={<PlayStoreIcon />}
                rightIcon={<AndroidIcon />}
              />
              <DownloadButton
                href={iosPwaGuideUrl}
                eyebrow="Apple"
                title="Apple Store"
                description="Abra o guia do iPhone, instale como app pelo Safari e use o TemAi como PWA enquanto a versão da App Store chega."
                leftIcon={<AppStoreIcon />}
                rightIcon={<AppleIcon />}
                subtle
              />
            </div>
          </div>

        </div>
      </section>
    </main>
  );
}
