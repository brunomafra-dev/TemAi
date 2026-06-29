"use client";

import Image, { type ImageProps } from "next/image";
import { memo, useEffect, useMemo, useState } from "react";

const RECIPE_PLACEHOLDER_SRC =
  "https://images.unsplash.com/photo-1495521821757-a1efb6729352?auto=format&fit=crop&w=1200&q=80";
const FALLBACK_TIMEOUT_MS = 8000;

const nextImageHosts = new Set([
  "images.unsplash.com",
  "images.pexels.com",
  "static.itdg.com.br",
  "www.tudogostoso.com.br",
  "s2-receitas.glbimg.com",
  "s2.glbimg.com",
  "img.itdg.com.br",
  "upload.wikimedia.org",
]);

type RecipeImageProps = Omit<ImageProps, "src" | "alt" | "onLoad" | "onError"> & {
  src?: string | null;
  alt: string;
  fallbackSrc?: string;
  imageClassName?: string;
  overlayClassName?: string;
  showIllustrativeOverlay?: boolean;
};

function normalizeRecipeImageSource(value?: string | null): string | null {
  const source = value?.trim();
  if (!source) return null;
  if (source.startsWith("/") || /^data:image\/[a-z0-9.+-]+;base64,/i.test(source)) return source;

  try {
    const url = new URL(source);
    if (url.protocol !== "http:" && url.protocol !== "https:") return null;
    return url.toString();
  } catch {
    return null;
  }
}

function shouldBypassNextOptimizer(source: string): boolean {
  if (source.startsWith("/") || source.startsWith("data:image/")) return source.startsWith("data:image/");

  try {
    const url = new URL(source);
    if (url.hostname === "www.receiteria.com.br") return true;
    return !nextImageHosts.has(url.hostname);
  } catch {
    return true;
  }
}

export const RecipeImage = memo(function RecipeImage({
  src,
  alt,
  fallbackSrc,
  className = "",
  imageClassName = "",
  overlayClassName = "",
  showIllustrativeOverlay = true,
  priority = false,
  loading,
  decoding = "async",
  sizes = "(max-width: 768px) 100vw, 50vw",
  ...props
}: RecipeImageProps) {
  const initialSource = useMemo(() => normalizeRecipeImageSource(src), [src]);
  const fallbackSource = useMemo(
    () => normalizeRecipeImageSource(fallbackSrc) || RECIPE_PLACEHOLDER_SRC,
    [fallbackSrc],
  );
  const normalizedSource = initialSource || fallbackSource;

  return (
    <RecipeImageState
      key={normalizedSource}
      {...props}
      src={normalizedSource}
      alt={alt}
      className={className}
      imageClassName={imageClassName}
      overlayClassName={overlayClassName}
      showIllustrativeOverlay={showIllustrativeOverlay}
      priority={priority}
      loading={loading}
      decoding={decoding}
      sizes={sizes}
      startsAsFallback={!initialSource}
      fallbackSrc={fallbackSource}
    />
  );
});

RecipeImage.displayName = "RecipeImage";

type RecipeImageStateProps = Omit<RecipeImageProps, "src"> & {
  src: string;
  startsAsFallback: boolean;
};

function RecipeImageState({
  src,
  alt,
  className = "",
  imageClassName = "",
  overlayClassName = "",
  showIllustrativeOverlay = true,
  priority = false,
  loading,
  decoding = "async",
  sizes = "(max-width: 768px) 100vw, 50vw",
  startsAsFallback,
  fallbackSrc = RECIPE_PLACEHOLDER_SRC,
  ...props
}: RecipeImageStateProps) {
  const [activeSource, setActiveSource] = useState(src);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isFallback, setIsFallback] = useState(startsAsFallback);
  const [placeholderFailed, setPlaceholderFailed] = useState(false);

  useEffect(() => {
    if (isLoaded || isFallback) return;

    const timer = window.setTimeout(() => {
      setActiveSource(fallbackSrc);
      setIsFallback(true);
      setIsLoaded(false);
    }, FALLBACK_TIMEOUT_MS);

    return () => window.clearTimeout(timer);
  }, [fallbackSrc, isFallback, isLoaded, activeSource]);

  const useCssFallback = isFallback && placeholderFailed;
  const unoptimized = shouldBypassNextOptimizer(activeSource);

  return (
    <div className={`relative overflow-hidden bg-[#F4E6D3] ${className}`}>
      <div
        className={`absolute inset-0 transition-opacity duration-500 ${
          isLoaded || useCssFallback ? "opacity-0" : "opacity-100"
        }`}
        aria-hidden="true"
      >
        <div className="h-full w-full animate-pulse bg-[linear-gradient(110deg,#F1DEC4_0%,#FFF7EC_46%,#E7C9A5_100%)]" />
      </div>

      {useCssFallback ? (
        <div
          className="absolute inset-0 bg-[radial-gradient(circle_at_26%_18%,rgba(255,248,236,0.92),transparent_28%),linear-gradient(135deg,#6E3B28_0%,#C97645_44%,#F3D5A9_100%)]"
          aria-hidden="true"
        />
      ) : (
        <Image
          {...props}
          src={activeSource}
          alt={alt}
          sizes={sizes}
          priority={priority}
          loading={priority ? undefined : loading || "lazy"}
          decoding={decoding}
          unoptimized={unoptimized}
          className={`transition duration-700 ${isLoaded ? "opacity-100" : "opacity-0"} ${imageClassName}`}
          onLoad={() => setIsLoaded(true)}
          onError={() => {
            if (activeSource === fallbackSrc || activeSource === RECIPE_PLACEHOLDER_SRC) {
              setPlaceholderFailed(true);
              setIsLoaded(true);
              return;
            }
            setActiveSource(fallbackSrc);
            setIsFallback(true);
            setIsLoaded(false);
          }}
        />
      )}

      {isFallback && showIllustrativeOverlay ? (
        <div className={`absolute inset-x-0 bottom-0 px-3 py-2 ${overlayClassName}`}>
          <span className="inline-flex rounded-full bg-[#2A1E17]/28 px-2.5 py-1 text-[10px] font-semibold text-white/78 backdrop-blur-sm">
            Imagem ilustrativa
          </span>
        </div>
      ) : null}
    </div>
  );
}
