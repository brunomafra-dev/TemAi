"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Product = {
  id: string;
  name: string;
  description: string;
  audience: string;
  pains: string[];
  benefits: string[];
  voice: string;
  cta: string;
  link: string;
};

type CampaignInput = {
  productId: string;
  channel: string;
  format: string;
  goal: string;
  style: string;
  duration: string;
  variations: number;
};

type ThemeId = "clean" | "bold" | "app" | "ugc";
type SlideKind = "cover" | "problem" | "demo" | "proof" | "steps" | "cta";
type VisualStyle = "character" | "phone" | "split" | "checklist" | "scene";

type CarouselSlide = {
  kind: SlideKind;
  title: string;
  text: string;
  visual: string;
  visualStyle?: VisualStyle;
};

type GeneratedContent = {
  hook: string;
  scenes: string[];
  onScreenText: string[];
  caption: string;
  cta: string;
  hashtags: string[];
  visualAssets: string[];
  shotList: string[];
  checklist: string[];
  abTests: string[];
  slides: CarouselSlide[];
};

type LibraryItem = {
  id: string;
  title: string;
  productId: string;
  channel: string;
  format: string;
  status: "ideia" | "em producao" | "postado" | "descartado";
  plannedDate: string;
  views: number;
  likes: number;
  comments: number;
  estimatedDownloads: number;
  content: GeneratedContent;
};

const channels = ["Instagram", "TikTok", "YouTube Shorts", "Pinterest", "Threads"];
const formats = ["Reel", "Carrossel", "Story", "Post estatico", "Roteiro UGC", "Ideia de video"];
const goals = ["download", "cadastro", "educacao", "prova social", "retencao", "viralizacao"];
const styles = ["chef testando", "antes/depois", "problema/solucao", "tutorial", "lista", "humor leve", "comparacao"];
const durations = ["15s", "30s", "45s"];
const statuses: LibraryItem["status"][] = ["ideia", "em producao", "postado", "descartado"];

const themes: Record<ThemeId, { name: string; bg: string; fg: string; muted: string; accent: string; soft: string }> = {
  clean: { name: "Clean SaaS", bg: "#f8fafc", fg: "#0f172a", muted: "#475569", accent: "#059669", soft: "#d1fae5" },
  bold: { name: "Bold social", bg: "#111827", fg: "#ffffff", muted: "#d1d5db", accent: "#f59e0b", soft: "#374151" },
  app: { name: "Print do app", bg: "#eef2ff", fg: "#111827", muted: "#4b5563", accent: "#4f46e5", soft: "#ffffff" },
  ugc: { name: "UGC simples", bg: "#fff7ed", fg: "#1f2937", muted: "#6b7280", accent: "#ea580c", soft: "#ffedd5" },
};

const initialProducts: Product[] = [
  {
    id: "temai",
    name: "TemAi",
    description: "App de receitas com IA que transforma ingredientes por texto, foto ou audio em sugestoes praticas.",
    audience: "Pessoas que querem cozinhar melhor, economizar, evitar desperdicio e decidir o que fazer com o que tem em casa.",
    pains: ["nao saber o que cozinhar", "desperdicio de comida", "falta de tempo", "compras sem planejamento"],
    benefits: ["ideias rapidas", "menos desperdicio", "receitas com o que ja existe em casa", "mais confianca na cozinha"],
    voice: "pratico, acolhedor, esperto e brasileiro",
    cta: "Baixe o TemAi e descubra receitas com o que voce ja tem.",
    link: "https://temai.app",
  },
  {
    id: "splitmate",
    name: "SplitMate",
    description: "App para dividir contas e gastos entre amigos, casais, viagens, roles e republicas sem confusao.",
    audience: "Pessoas que querem evitar atrito, esquecimento e calculo manual ao dividir despesas em grupo.",
    pains: ["cobranca constrangedora", "conta que nunca fecha", "gastos esquecidos", "planilhas improvisadas"],
    benefits: ["divisao clara", "menos atrito", "registro organizado", "acerto rapido depois do role"],
    voice: "direto, leve, social e confiavel",
    cta: "Organize o proximo role com SplitMate.",
    link: "https://splitmate.app",
  },
];

const storageKeys = {
  products: "launchkit-growth-products-v2",
  library: "launchkit-growth-library-v2",
};

const todayIso = () => new Date().toISOString().slice(0, 10);

function readStored<T>(key: string, fallback: T): T {
  if (typeof window === "undefined") return fallback;
  try {
    const stored = window.localStorage.getItem(key);
    return stored ? (JSON.parse(stored) as T) : fallback;
  } catch {
    return fallback;
  }
}

function createCarousel(product: Product, goal: string, count: number): CarouselSlide[] {
  const pain = product.pains[0] ?? "problema chato";
  const benefit = product.benefits[0] ?? "resultado claro";
  const isTemAi = product.id === "temai";
  const slides: CarouselSlide[] = [
    {
      kind: "cover",
      title: isTemAi ? "O que cozinhar com o que sobrou?" : "Dividir conta nao precisa virar climão",
      text: `Um carrossel rapido para mostrar o valor do ${product.name}.`,
      visual: isTemAi ? "Foto/print: ingredientes na mesa + celular aberto" : "Foto/print: mesa de role + celular aberto",
    },
    { kind: "problem", title: `O problema: ${pain}`, text: "Mostre uma situacao real que a pessoa reconhece em 2 segundos.", visual: "Card com icone grande + frase curta" },
    { kind: "demo", title: `Abra o ${product.name}`, text: "Use um print real do app e destaque apenas uma acao principal.", visual: "Moldura de celular com print do app" },
    { kind: "proof", title: benefit, text: "Transforme o beneficio em uma cena concreta, sem promessa exagerada.", visual: "Antes/depois simples ou mini checklist visual" },
    { kind: "steps", title: "Como funciona", text: "1. Abra o app  2. Informe o contexto  3. Use a sugestao  4. Ajuste se precisar", visual: "Lista numerada com 4 passos" },
    { kind: "proof", title: "Conteudo barato de produzir", text: "Print, gravacao de tela e uma foto simples ja resolvem a maioria dos posts.", visual: "Grid com print + foto + card" },
    { kind: "cta", title: "Teste no proximo momento real", text: goal === "download" ? product.cta : `Salve esta ideia e rode um teste com ${product.name}.`, visual: "CTA grande + link/app store" },
    { kind: "cta", title: "Pronto para postar", text: "Copie a legenda, baixe os cards e publique manualmente sem depender de API social.", visual: "Checklist final de publicacao" },
  ];
  return slides.slice(0, count).map((slide, index) => ({
    ...slide,
    visualStyle: slide.visualStyle ?? (["character", "character", "phone", "split", "checklist", "scene", "phone", "checklist"][index] as VisualStyle),
  }));
}

function createCampaign(product: Product, input: CampaignInput): GeneratedContent {
  const pain = product.pains[0] ?? "problema recorrente";
  const benefit = product.benefits[0] ?? "resultado claro";
  const isTemAi = product.id === "temai";
  const opening =
    input.style === "humor leve"
      ? `POV: ${pain}, mas voce tem ${product.name}`
      : input.style === "comparacao"
        ? `Antes: ${pain}. Depois: ${product.name}.`
        : `Pare de sofrer com ${pain}`;

  return {
    hook: `${opening} em ${input.duration}.`,
    scenes: [
      `0-3s: cena real mostrando ${pain}.`,
      `3-8s: gravacao de tela abrindo ${product.name}.`,
      `8-14s: mostrar ${benefit} com exemplo concreto.`,
      input.duration === "15s" ? `14-15s: CTA curto: ${product.cta}` : `15-${input.duration}: repetir valor, mostrar print final e CTA.`,
    ],
    onScreenText: [`Voce tambem passa por isso?`, `${product.name} resolve em poucos toques`, benefit, product.cta],
    caption: `${opening}. ${product.description} Conteudo demonstrativo com app real, pensado para ${input.goal}. ${product.cta}`,
    cta: product.cta,
    hashtags: isTemAi
      ? ["#receitasfaceis", "#cozinhainteligente", "#semdesperdicio", "#ia", "#temai"]
      : ["#dividirconta", "#viagemcomamigos", "#organizacao", "#financas", "#splitmate"],
    visualAssets: [
      "1 print vertical da tela principal do app",
      "1 gravacao de tela curta com a acao principal",
      isTemAi ? "1 foto simples de ingredientes reais" : "1 foto simples de mesa/conta/role",
      "1 card final com CTA e logo/nome do app",
    ],
    shotList: [
      `Close do problema: ${pain}`,
      `Mao segurando celular com ${product.name}`,
      "Gravacao de tela limpa, sem notificacoes",
      `Resultado visual: ${benefit}`,
      "Frame final com CTA",
    ],
    checklist: [
      "Usar app real, print real ou gravacao real.",
      "Nao criar depoimento falso fingindo usuario real.",
      "Se for UGC, marcar internamente como simulado.",
      "Exportar cards, legenda, hashtags e roteiro antes de publicar.",
    ],
    abTests: Array.from({ length: Math.max(1, input.variations) }, (_, index) =>
      index % 2 === 0 ? `A${index + 1}: dor direta - "${pain}"` : `B${index + 1}: beneficio direto - "${benefit}"`,
    ),
    slides: createCarousel(product, input.goal, 7),
  };
}

function downloadText(filename: string, value: string) {
  const blob = new Blob([value], { type: "text/markdown;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function wrapText(context: CanvasRenderingContext2D, text: string, maxWidth: number) {
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  words.forEach((word) => {
    const test = line ? `${line} ${word}` : word;
    if (context.measureText(test).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = test;
    }
  });
  if (line) lines.push(line);
  return lines;
}

function roundRect(context: CanvasRenderingContext2D, x: number, y: number, width: number, height: number, radius: number) {
  context.beginPath();
  context.moveTo(x + radius, y);
  context.arcTo(x + width, y, x + width, y + height, radius);
  context.arcTo(x + width, y + height, x, y + height, radius);
  context.arcTo(x, y + height, x, y, radius);
  context.arcTo(x, y, x + width, y, radius);
  context.closePath();
}

function drawPhone(context: CanvasRenderingContext2D, theme: (typeof themes)[ThemeId], product: Product) {
  context.fillStyle = "#111827";
  roundRect(context, 360, 205, 360, 510, 58);
  context.fill();
  context.fillStyle = theme.soft;
  roundRect(context, 388, 245, 304, 430, 34);
  context.fill();
  context.fillStyle = theme.accent;
  roundRect(context, 420, 292, 240, 58, 18);
  context.fill();
  context.fillStyle = theme.fg;
  context.font = "800 28px Arial";
  context.fillText(product.name, 442, 330);
  context.fillStyle = theme.bg;
  for (let index = 0; index < 4; index += 1) {
    roundRect(context, 424, 385 + index * 58, 232, 36, 14);
    context.fill();
  }
  context.strokeStyle = theme.accent;
  context.lineWidth = 8;
  context.beginPath();
  context.arc(688, 280, 54, 0, Math.PI * 2);
  context.stroke();
}

function drawCharacter(context: CanvasRenderingContext2D, theme: (typeof themes)[ThemeId], product: Product) {
  context.fillStyle = theme.accent;
  context.beginPath();
  context.arc(520, 360, 92, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = "#f8d7b6";
  context.beginPath();
  context.arc(520, 318, 58, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = theme.fg;
  context.beginPath();
  context.arc(500, 312, 7, 0, Math.PI * 2);
  context.arc(540, 312, 7, 0, Math.PI * 2);
  context.fill();
  context.strokeStyle = theme.fg;
  context.lineWidth = 6;
  context.beginPath();
  context.arc(520, 330, 24, 0.1, Math.PI - 0.1);
  context.stroke();
  context.fillStyle = theme.bg;
  roundRect(context, 610, 250, 280, 130, 28);
  context.fill();
  context.fillStyle = theme.muted;
  context.font = "700 26px Arial";
  wrapText(context, product.id === "temai" ? "e agora, o que eu cozinho?" : "quem pagou o que?", 230).forEach((line, index) => context.fillText(line, 635, 302 + index * 34));
}

function drawSplit(context: CanvasRenderingContext2D, theme: (typeof themes)[ThemeId]) {
  context.fillStyle = theme.bg;
  roundRect(context, 160, 245, 330, 260, 36);
  context.fill();
  context.fillStyle = theme.soft;
  roundRect(context, 590, 245, 330, 260, 36);
  context.fill();
  context.fillStyle = theme.muted;
  context.font = "800 30px Arial";
  context.fillText("ANTES", 245, 310);
  context.fillText("DEPOIS", 668, 310);
  context.strokeStyle = theme.accent;
  context.lineWidth = 14;
  context.beginPath();
  context.moveTo(520, 370);
  context.lineTo(560, 370);
  context.stroke();
  context.fillStyle = theme.accent;
  context.beginPath();
  context.moveTo(560, 330);
  context.lineTo(635, 370);
  context.lineTo(560, 410);
  context.fill();
}

function drawChecklist(context: CanvasRenderingContext2D, theme: (typeof themes)[ThemeId]) {
  context.font = "800 32px Arial";
  for (let index = 0; index < 4; index += 1) {
    context.fillStyle = theme.bg;
    roundRect(context, 190, 235 + index * 92, 700, 62, 20);
    context.fill();
    context.strokeStyle = theme.accent;
    context.lineWidth = 8;
    context.beginPath();
    context.moveTo(222, 266 + index * 92);
    context.lineTo(246, 290 + index * 92);
    context.lineTo(292, 238 + index * 92);
    context.stroke();
    context.fillStyle = theme.muted;
    context.fillText(`Passo ${index + 1}`, 330, 278 + index * 92);
  }
}

function drawScene(context: CanvasRenderingContext2D, theme: (typeof themes)[ThemeId], product: Product) {
  context.fillStyle = theme.bg;
  roundRect(context, 145, 220, 790, 360, 42);
  context.fill();
  const labels = product.id === "temai" ? ["foto", "print", "card"] : ["conta", "print", "cta"];
  labels.forEach((label, index) => {
    context.fillStyle = index === 1 ? theme.accent : theme.soft;
    roundRect(context, 195 + index * 250, 270, 190, 230, 30);
    context.fill();
    context.fillStyle = index === 1 ? "#ffffff" : theme.muted;
    context.font = "800 30px Arial";
    context.fillText(label, 245 + index * 250, 398);
  });
}

function drawSlideToCanvas(canvas: HTMLCanvasElement, slide: CarouselSlide, product: Product, themeId: ThemeId, index: number) {
  const theme = themes[themeId];
  const context = canvas.getContext("2d");
  if (!context) return;
  canvas.width = 1080;
  canvas.height = 1350;
  context.fillStyle = theme.bg;
  context.fillRect(0, 0, canvas.width, canvas.height);

  context.fillStyle = theme.soft;
  context.fillRect(70, 84, 940, 1182);
  context.fillStyle = theme.accent;
  context.fillRect(70, 84, 18, 1182);

  context.fillStyle = theme.fg;
  context.font = "800 42px Arial";
  context.fillText(product.name, 120, 155);
  context.fillStyle = theme.accent;
  context.font = "700 30px Arial";
  context.fillText(`Slide ${index + 1}`, 830, 155);

  if (slide.visualStyle === "phone") {
    drawPhone(context, theme, product);
  } else if (slide.visualStyle === "split") {
    drawSplit(context, theme);
  } else if (slide.visualStyle === "checklist") {
    drawChecklist(context, theme);
  } else if (slide.visualStyle === "scene") {
    drawScene(context, theme, product);
  } else {
    drawCharacter(context, theme, product);
  }
  context.fillStyle = theme.muted;
  context.font = "700 26px Arial";
  wrapText(context, slide.visual, 780).slice(0, 2).forEach((line, lineIndex) => {
    context.fillText(line, 150, 620 + lineIndex * 36);
  });

  context.fillStyle = theme.fg;
  context.font = "900 72px Arial";
  wrapText(context, slide.title, 830).slice(0, 4).forEach((line, lineIndex) => {
    context.fillText(line, 120, 700 + lineIndex * 82);
  });
  context.fillStyle = theme.muted;
  context.font = "600 40px Arial";
  wrapText(context, slide.text, 820).slice(0, 5).forEach((line, lineIndex) => {
    context.fillText(line, 120, 990 + lineIndex * 54);
  });

  context.fillStyle = theme.accent;
  context.font = "800 32px Arial";
  context.fillText("LaunchKit Growth", 120, 1210);
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1.5 text-xs font-bold uppercase tracking-[0.08em] text-slate-500">
      {label}
      {children}
    </label>
  );
}

function SelectField({ value, onChange, options }: { value: string; onChange: (value: string) => void; options: string[] }) {
  return (
    <select value={value} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none ring-emerald-500 focus:ring-2">
      {options.map((option) => <option key={option}>{option}</option>)}
    </select>
  );
}

export function LaunchKitApp() {
  const [active, setActive] = useState("Dashboard");
  const [products, setProducts] = useState<Product[]>(() => readStored(storageKeys.products, initialProducts));
  const [library, setLibrary] = useState<LibraryItem[]>(() => readStored(storageKeys.library, []));
  const [campaignInput, setCampaignInput] = useState<CampaignInput>({
    productId: "temai",
    channel: "Instagram",
    format: "Reel",
    goal: "download",
    style: "problema/solucao",
    duration: "30s",
    variations: 3,
  });
  const [generated, setGenerated] = useState<GeneratedContent | null>(null);
  const [carouselProductId, setCarouselProductId] = useState("temai");
  const [carouselGoal, setCarouselGoal] = useState("download");
  const [slideCount, setSlideCount] = useState(7);
  const [themeId, setThemeId] = useState<ThemeId>("clean");
  const [slides, setSlides] = useState<CarouselSlide[]>([]);
  const previewCanvas = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => window.localStorage.setItem(storageKeys.products, JSON.stringify(products)), [products]);
  useEffect(() => window.localStorage.setItem(storageKeys.library, JSON.stringify(library)), [library]);

  const product = products.find((item) => item.id === campaignInput.productId) ?? products[0];
  const carouselProduct = products.find((item) => item.id === carouselProductId) ?? products[0];
  const firstSlide = slides[0];

  useEffect(() => {
    if (firstSlide && previewCanvas.current) drawSlideToCanvas(previewCanvas.current, firstSlide, carouselProduct, themeId, 0);
  }, [firstSlide, carouselProduct, themeId]);

  const metrics = useMemo(() => ({
    total: library.length,
    production: library.filter((item) => item.status === "em producao").length,
    posted: library.filter((item) => item.status === "postado").length,
    views: library.reduce((sum, item) => sum + item.views, 0),
  }), [library]);

  function generateCampaign() {
    const next = createCampaign(product, campaignInput);
    setGenerated(next);
    setSlides(next.slides);
    setCarouselProductId(product.id);
    setCarouselGoal(campaignInput.goal);
    setActive("Gerar conteudo");
  }

  function saveGenerated() {
    if (!generated) return;
    setLibrary((current) => [{
      id: crypto.randomUUID(),
      title: generated.hook,
      productId: product.id,
      channel: campaignInput.channel,
      format: campaignInput.format,
      status: "ideia",
      plannedDate: todayIso(),
      views: 0,
      likes: 0,
      comments: 0,
      estimatedDownloads: 0,
      content: generated,
    }, ...current]);
    setActive("Biblioteca");
  }

  function generateCarousel() {
    setSlides(createCarousel(carouselProduct, carouselGoal, slideCount));
    setActive("Carrossel");
  }

  function exportSlide(index: number) {
    const slide = slides[index];
    if (!slide) return;
    const canvas = document.createElement("canvas");
    drawSlideToCanvas(canvas, slide, carouselProduct, themeId, index);
    const a = document.createElement("a");
    a.href = canvas.toDataURL("image/png");
    a.download = `${carouselProduct.name.toLowerCase()}-slide-${index + 1}.png`;
    a.click();
  }

  function exportAllSlides() {
    slides.forEach((_, index) => window.setTimeout(() => exportSlide(index), index * 180));
  }

  function copyPublishPack() {
    const pack = generated ?? library[0]?.content;
    if (!pack) return;
    navigator.clipboard.writeText(`${pack.caption}\n\n${pack.hashtags.join(" ")}\n\nCTA: ${pack.cta}`);
  }

  const nav = ["Dashboard", "Gerar conteudo", "Carrossel", "Publicar", "Biblioteca", "Calendario", "Produtos", "Configuracoes"];

  return (
    <main className="min-h-dvh bg-[#f6f7f4] text-slate-950">
      <div className="flex min-h-dvh">
        <aside className="hidden w-64 shrink-0 border-r border-slate-200 bg-white px-4 py-5 lg:block">
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-emerald-700">Mafra Labs</p>
          <h1 className="mt-1 font-sans text-xl font-black">LaunchKit Growth</h1>
          <nav className="mt-6 grid gap-1">
            {nav.map((item) => (
              <button key={item} onClick={() => setActive(item)} className={`rounded-md px-3 py-2 text-left text-sm font-semibold ${active === item ? "bg-slate-950 text-white" : "text-slate-600 hover:bg-slate-100"}`}>
                {item}
              </button>
            ))}
          </nav>
        </aside>

        <section className="min-w-0 flex-1">
          <header className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 px-4 py-3 backdrop-blur lg:px-8">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-slate-500">Ferramenta interna</p>
                <h2 className="font-sans text-2xl font-black">{active}</h2>
              </div>
              <div className="flex gap-2">
                <button onClick={generateCampaign} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Gerar pacote</button>
                <button onClick={generateCarousel} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold">Criar cards</button>
              </div>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto lg:hidden">
              {nav.map((item) => <button key={item} onClick={() => setActive(item)} className={`whitespace-nowrap rounded-md px-3 py-2 text-xs font-bold ${active === item ? "bg-slate-950 text-white" : "bg-slate-100 text-slate-600"}`}>{item}</button>)}
            </div>
          </header>

          <div className="grid gap-5 p-4 lg:p-8">
            {active === "Dashboard" && (
              <>
                <div className="grid gap-4 md:grid-cols-4">
                  {[["Ideias salvas", metrics.total], ["Em producao", metrics.production], ["Postados", metrics.posted], ["Views manuais", metrics.views]].map(([label, value]) => (
                    <div key={label} className="rounded-md border border-slate-200 bg-white p-4">
                      <p className="text-sm font-semibold text-slate-500">{label}</p>
                      <p className="mt-2 text-3xl font-black">{value}</p>
                    </div>
                  ))}
                </div>
                <div className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
                  <Panel title="Pipeline de producao">
                    <div className="grid gap-3 md:grid-cols-4">
                      {["Briefing", "Cards", "Gravacao", "Postagem"].map((step, index) => <Stage key={step} step={step} text={["Gerar pacote", "Baixar PNGs", "Seguir shot list", "Copiar legenda"][index]} />)}
                    </div>
                  </Panel>
                  <Panel title="Plano rapido de 7 dias"><Plan products={products} days={7} /></Panel>
                </div>
              </>
            )}

            {active === "Gerar conteudo" && (
              <div className="grid gap-5 xl:grid-cols-[380px_1fr]">
                <Panel title="Briefing">
                  <div className="grid gap-3">
                    <Field label="Produto"><SelectField value={campaignInput.productId} onChange={(value) => setCampaignInput({ ...campaignInput, productId: value })} options={products.map((item) => item.id)} /></Field>
                    <Field label="Canal"><SelectField value={campaignInput.channel} onChange={(value) => setCampaignInput({ ...campaignInput, channel: value })} options={channels} /></Field>
                    <Field label="Formato"><SelectField value={campaignInput.format} onChange={(value) => setCampaignInput({ ...campaignInput, format: value })} options={formats} /></Field>
                    <Field label="Objetivo"><SelectField value={campaignInput.goal} onChange={(value) => setCampaignInput({ ...campaignInput, goal: value })} options={goals} /></Field>
                    <Field label="Estilo"><SelectField value={campaignInput.style} onChange={(value) => setCampaignInput({ ...campaignInput, style: value })} options={styles} /></Field>
                    <Field label="Duracao"><SelectField value={campaignInput.duration} onChange={(value) => setCampaignInput({ ...campaignInput, duration: value })} options={durations} /></Field>
                    <Field label="Variacoes"><input type="number" min={1} max={8} value={campaignInput.variations} onChange={(event) => setCampaignInput({ ...campaignInput, variations: Number(event.target.value) })} className="h-10 rounded-md border border-slate-200 bg-white px-3 text-sm" /></Field>
                    <button onClick={generateCampaign} className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Gerar pacote completo</button>
                  </div>
                </Panel>
                <Panel title="Pacote pronto para produzir">
                  {generated ? <GeneratedView generated={generated} onSave={saveGenerated} onOpenCarousel={() => setActive("Carrossel")} /> : <Empty text="Gere um pacote que ja inclui roteiro, assets, shot list, copy e carrossel." />}
                </Panel>
              </div>
            )}

            {active === "Carrossel" && (
              <div className="grid gap-5 xl:grid-cols-[340px_1fr]">
                <Panel title="Estudio de cards">
                  <div className="grid gap-3">
                    <Field label="Produto"><SelectField value={carouselProductId} onChange={setCarouselProductId} options={products.map((item) => item.id)} /></Field>
                    <Field label="Objetivo"><SelectField value={carouselGoal} onChange={setCarouselGoal} options={goals} /></Field>
                    <Field label="Quantidade"><input type="number" min={5} max={8} value={slideCount} onChange={(event) => setSlideCount(Number(event.target.value))} className="h-10 rounded-md border border-slate-200 px-3 text-sm" /></Field>
                    <Field label="Template visual"><SelectField value={themeId} onChange={(value) => setThemeId(value as ThemeId)} options={Object.keys(themes)} /></Field>
                    <button onClick={generateCarousel} className="rounded-md bg-slate-950 px-4 py-2.5 text-sm font-bold text-white">Gerar carrossel visual</button>
                    <button onClick={exportAllSlides} className="rounded-md bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white">Baixar todos PNG</button>
                    <button onClick={() => downloadText("launchkit-carousel.md", slides.map((slide, index) => `## Slide ${index + 1}: ${slide.title}\n${slide.text}\nVisual: ${slide.visual}\nEstilo: ${slide.visualStyle ?? "character"}`).join("\n\n"))} className="rounded-md border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold">Exportar roteiro MD</button>
                  </div>
                </Panel>
                <div className="grid gap-4">
                  <Panel title="Preview 1080x1350">
                    {slides.length ? <canvas ref={previewCanvas} className="aspect-[4/5] w-full max-w-[360px] rounded-md border border-slate-200 bg-white" /> : <Empty text="Gere cards com template visual, placeholders de imagem e export PNG." />}
                  </Panel>
                  <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    {slides.map((slide, index) => (
                      <SlideCard key={`${slide.title}-${index}`} slide={slide} product={carouselProduct} themeId={themeId} index={index} onExport={() => exportSlide(index)} onChange={(next) => setSlides((current) => current.map((item, itemIndex) => itemIndex === index ? next : item))} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {active === "Publicar" && (
              <PublishHub
                generated={generated}
                latest={library[0]}
                onCopy={copyPublishPack}
                onExport={exportAllSlides}
                onCreateCards={generateCarousel}
              />
            )}

            {active === "Biblioteca" && <Panel title="Conteudos salvos"><LibraryRows library={library} products={products} setLibrary={setLibrary} /></Panel>}
            {active === "Calendario" && <div className="grid gap-5 xl:grid-cols-2"><Panel title="Plano de 7 dias"><Plan products={products} days={7} /></Panel><Panel title="Plano de 30 dias"><Plan products={products} days={30} /></Panel></div>}
            {active === "Produtos" && <div className="grid gap-4 xl:grid-cols-2">{products.map((item, index) => <ProductEditor key={item.id} product={item} onChange={(next) => setProducts((current) => current.map((entry, entryIndex) => entryIndex === index ? next : entry))} />)}</div>}
            {active === "Configuracoes" && <Settings />}
          </div>
        </section>
      </div>
    </main>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="rounded-md border border-slate-200 bg-white p-5 shadow-sm"><h3 className="mb-4 font-sans text-base font-black">{title}</h3>{children}</section>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-md border border-dashed border-slate-300 bg-slate-50 p-8 text-center text-sm font-semibold text-slate-500">{text}</div>;
}

function Stage({ step, text }: { step: string; text: string }) {
  return <div className="rounded-md border border-slate-200 bg-slate-50 p-4"><p className="font-black">{step}</p><p className="mt-1 text-sm font-semibold text-slate-500">{text}</p></div>;
}

function GeneratedView({ generated, onSave, onOpenCarousel }: { generated: GeneratedContent; onSave: () => void; onOpenCarousel: () => void }) {
  return (
    <div className="grid gap-4">
      <div className="rounded-md bg-slate-950 p-4 text-white"><p className="text-xs font-bold uppercase tracking-[0.12em] text-emerald-300">Hook</p><p className="mt-2 text-xl font-black">{generated.hook}</p></div>
      <div className="grid gap-4 xl:grid-cols-3">
        <CopyBlock label="Roteiro" value={generated.scenes.join("\n")} />
        <CopyBlock label="Assets para criar" value={generated.visualAssets.join("\n")} />
        <CopyBlock label="Shot list" value={generated.shotList.join("\n")} />
      </div>
      <div className="grid gap-4 xl:grid-cols-2">
        <CopyBlock label="Legenda" value={generated.caption} />
        <CopyBlock label="Texto na tela" value={generated.onScreenText.join("\n")} />
        <CopyBlock label="Hashtags" value={generated.hashtags.join(" ")} />
        <CopyBlock label="Variacoes A/B" value={generated.abTests.join("\n")} />
      </div>
      <div className="flex flex-wrap gap-2">
        <button onClick={onSave} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Salvar na biblioteca</button>
        <button onClick={onOpenCarousel} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">Editar carrossel gerado</button>
        <a href="https://www.canva.com/" target="_blank" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold">Abrir Canva</a>
        <a href="https://www.capcut.com/" target="_blank" className="rounded-md border border-slate-200 px-4 py-2 text-sm font-bold">Abrir CapCut</a>
      </div>
    </div>
  );
}

function PublishHub({
  generated,
  latest,
  onCopy,
  onExport,
  onCreateCards,
}: {
  generated: GeneratedContent | null;
  latest?: LibraryItem;
  onCopy: () => void;
  onExport: () => void;
  onCreateCards: () => void;
}) {
  const pack = generated ?? latest?.content ?? null;
  const destinations = [
    ["Instagram", "https://www.instagram.com/"],
    ["TikTok", "https://www.tiktok.com/upload"],
    ["YouTube Shorts", "https://studio.youtube.com/"],
    ["Pinterest", "https://www.pinterest.com/pin-builder/"],
    ["Threads", "https://www.threads.net/"],
  ];

  return (
    <div className="grid gap-5 xl:grid-cols-[1fr_380px]">
      <Panel title="Publicacao assistida">
        <div className="grid gap-4">
          <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm font-semibold leading-6 text-amber-900">
            Postagem direta real depende de APIs oficiais e permissoes das plataformas. No MVP, o LaunchKit prepara arquivos, copia o texto e abre a tela de publicacao para postagem manual rapida.
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <Stage step="1. Criativos" text="Baixar PNGs ou gerar cards" />
            <Stage step="2. Copy" text="Copiar legenda e hashtags" />
            <Stage step="3. Canal" text="Abrir plataforma e postar" />
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={onCreateCards} className="rounded-md bg-slate-950 px-4 py-2 text-sm font-bold text-white">Gerar cards</button>
            <button onClick={onExport} className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-bold text-white">Baixar PNGs</button>
            <button onClick={onCopy} className="rounded-md border border-slate-200 bg-white px-4 py-2 text-sm font-bold">Copiar copy</button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-5">
            {destinations.map(([name, href]) => (
              <a key={name} href={href} target="_blank" className="rounded-md border border-slate-200 bg-white px-3 py-3 text-center text-sm font-black text-slate-900 hover:bg-slate-50">
                Abrir {name}
              </a>
            ))}
          </div>
        </div>
      </Panel>
      <Panel title="Copy pronta">
        {pack ? (
          <div className="grid gap-3">
            <CopyBlock label="Legenda" value={pack.caption} />
            <CopyBlock label="Hashtags" value={pack.hashtags.join(" ")} />
            <CopyBlock label="Roteiro curto" value={pack.scenes.join("\n")} />
          </div>
        ) : (
          <Empty text="Gere um pacote ou salve uma ideia antes de publicar." />
        )}
      </Panel>
    </div>
  );
}

function CopyBlock({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-slate-200 bg-slate-50 p-4">
      <div className="mb-2 flex items-center justify-between gap-3"><p className="text-xs font-black uppercase tracking-[0.12em] text-slate-500">{label}</p><button onClick={() => navigator.clipboard.writeText(value)} className="rounded-md bg-white px-3 py-1.5 text-xs font-bold ring-1 ring-slate-200">Copiar</button></div>
      <p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{value}</p>
    </div>
  );
}

function SlideCard({ slide, product, themeId, index, onExport, onChange }: { slide: CarouselSlide; product: Product; themeId: ThemeId; index: number; onExport: () => void; onChange: (slide: CarouselSlide) => void }) {
  const theme = themes[themeId];
  return (
    <div className="grid gap-2 rounded-md border border-slate-200 bg-white p-3">
      <div className="aspect-[4/5] rounded-md p-4" style={{ background: theme.bg, color: theme.fg }}>
        <div className="h-full rounded-md p-4" style={{ background: theme.soft }}>
          <p className="text-xs font-black uppercase" style={{ color: theme.accent }}>{product.name} / {index + 1}</p>
          <div className="mt-5 rounded-md border-2 border-dashed p-3 text-xs font-bold" style={{ borderColor: theme.accent, color: theme.muted }}>{slide.visual}</div>
          <h4 className="mt-5 text-2xl font-black leading-tight">{slide.title}</h4>
          <p className="mt-3 text-sm font-semibold leading-relaxed" style={{ color: theme.muted }}>{slide.text}</p>
        </div>
      </div>
      <input value={slide.title} onChange={(event) => onChange({ ...slide, title: event.target.value })} className="h-9 rounded-md border border-slate-200 px-2 text-sm font-bold" />
      <textarea value={slide.text} onChange={(event) => onChange({ ...slide, text: event.target.value })} className="min-h-16 rounded-md border border-slate-200 p-2 text-sm" />
      <textarea value={slide.visual} onChange={(event) => onChange({ ...slide, visual: event.target.value })} className="min-h-14 rounded-md border border-slate-200 p-2 text-xs" />
      <select value={slide.visualStyle ?? "character"} onChange={(event) => onChange({ ...slide, visualStyle: event.target.value as VisualStyle })} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-xs font-bold">
        {["character", "phone", "split", "checklist", "scene"].map((style) => <option key={style}>{style}</option>)}
      </select>
      <button onClick={onExport} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white">Baixar PNG</button>
    </div>
  );
}

function LibraryRows({ library, products, setLibrary }: { library: LibraryItem[]; products: Product[]; setLibrary: React.Dispatch<React.SetStateAction<LibraryItem[]>> }) {
  if (!library.length) return <Empty text="Nenhum conteudo salvo ainda." />;
  return <div className="grid gap-2">{library.map((item) => {
    const product = products.find((entry) => entry.id === item.productId);
    return <div key={item.id} className="grid gap-3 rounded-md border border-slate-200 p-3 md:grid-cols-[1fr_150px_120px] md:items-center"><div><p className="font-bold leading-snug">{item.title}</p><p className="mt-1 text-xs font-semibold text-slate-500">{product?.name} - {item.channel} - {item.format} - {item.plannedDate}</p><p className="mt-2 text-xs text-slate-500">Views {item.views} - Curtidas {item.likes} - Comentarios {item.comments} - Downloads {item.estimatedDownloads}</p></div><select value={item.status} onChange={(event) => setLibrary((current) => current.map((entry) => entry.id === item.id ? { ...entry, status: event.target.value as LibraryItem["status"] } : entry))} className="h-9 rounded-md border border-slate-200 bg-white px-2 text-sm font-semibold">{statuses.map((status) => <option key={status}>{status}</option>)}</select><button onClick={() => navigator.clipboard.writeText(`${item.content.caption}\n\n${item.content.hashtags.join(" ")}`)} className="rounded-md bg-slate-950 px-3 py-2 text-xs font-bold text-white">Copiar post</button></div>;
  })}</div>;
}

function Plan({ products, days }: { products: Product[]; days: number }) {
  const formatsForPlan = ["Reel", "Carrossel", "Story", "Short", "Threads"];
  return <div className="max-h-[520px] overflow-auto">{Array.from({ length: days }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() + index);
    const product = products[index % products.length];
    return <div key={index} className="grid grid-cols-[92px_1fr] gap-3 border-b border-slate-100 py-3 last:border-0"><p className="text-xs font-black uppercase text-slate-400">{date.toLocaleDateString("pt-BR", { day: "2-digit", month: "short" })}</p><div><p className="text-sm font-bold">{product.name} - {formatsForPlan[index % formatsForPlan.length]}</p><p className="text-sm text-slate-500">{product.pains[index % product.pains.length]} {"->"} {product.benefits[index % product.benefits.length]}</p></div></div>;
  })}</div>;
}

function ProductEditor({ product, onChange }: { product: Product; onChange: (product: Product) => void }) {
  return <Panel title={product.name}><div className="grid gap-3"><Field label="Nome"><input value={product.name} onChange={(event) => onChange({ ...product, name: event.target.value })} className="h-10 rounded-md border border-slate-200 px-3 text-sm" /></Field><Field label="Descricao"><textarea value={product.description} onChange={(event) => onChange({ ...product, description: event.target.value })} className="min-h-20 rounded-md border border-slate-200 p-3 text-sm" /></Field><Field label="Publico-alvo"><textarea value={product.audience} onChange={(event) => onChange({ ...product, audience: event.target.value })} className="min-h-20 rounded-md border border-slate-200 p-3 text-sm" /></Field><Field label="Dores"><input value={product.pains.join(", ")} onChange={(event) => onChange({ ...product, pains: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="h-10 rounded-md border border-slate-200 px-3 text-sm" /></Field><Field label="Beneficios"><input value={product.benefits.join(", ")} onChange={(event) => onChange({ ...product, benefits: event.target.value.split(",").map((item) => item.trim()).filter(Boolean) })} className="h-10 rounded-md border border-slate-200 px-3 text-sm" /></Field><Field label="Tom de voz"><input value={product.voice} onChange={(event) => onChange({ ...product, voice: event.target.value })} className="h-10 rounded-md border border-slate-200 px-3 text-sm" /></Field><Field label="CTA principal"><input value={product.cta} onChange={(event) => onChange({ ...product, cta: event.target.value })} className="h-10 rounded-md border border-slate-200 px-3 text-sm" /></Field><Field label="Link"><input value={product.link} onChange={(event) => onChange({ ...product, link: event.target.value })} className="h-10 rounded-md border border-slate-200 px-3 text-sm" /></Field></div></Panel>;
}

function Settings() {
  return <Panel title="Automacao possivel sem prometer API social"><div className="grid gap-3 text-sm leading-6 text-slate-600"><p>Canva nao e obrigatorio agora. O LaunchKit ja gera PNG 1080x1350 no navegador, copia legendas e abre ferramentas externas como atalho.</p><p>Proxima evolucao: rota com OpenAI quando houver OPENAI_API_KEY, upload de prints do app, presets visuais por produto e export ZIP dos cards.</p><div className="flex flex-wrap gap-2 pt-2">{[["Instagram", "https://www.instagram.com/"], ["TikTok", "https://www.tiktok.com/"], ["Canva", "https://www.canva.com/"], ["CapCut", "https://www.capcut.com/"]].map(([name, href]) => <a key={name} href={href} target="_blank" className="rounded-md border border-slate-200 bg-white px-3 py-2 text-sm font-bold text-slate-800">Abrir {name}</a>)}</div></div></Panel>;
}
