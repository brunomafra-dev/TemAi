"use client";

export const MAX_PROFILE_PHOTO_SOURCE_BYTES = 12 * 1024 * 1024;
export const PROFILE_PHOTO_TARGET_SIZE = 512;
const PROFILE_PHOTO_QUALITY = 0.82;

export class ProfilePhotoError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ProfilePhotoError";
  }
}

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === "string") {
        resolve(reader.result);
      } else {
        reject(new ProfilePhotoError("Não foi possível carregar a imagem."));
      }
    };
    reader.onerror = () => reject(new ProfilePhotoError("Não foi possível carregar a imagem."));
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new ProfilePhotoError("Não foi possível ler esta imagem."));
    image.src = src;
  });
}

function canvasToJpegDataUrl(canvas: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          resolve(canvas.toDataURL("image/jpeg", PROFILE_PHOTO_QUALITY));
          return;
        }
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result || ""));
        reader.onerror = () => resolve(canvas.toDataURL("image/jpeg", PROFILE_PHOTO_QUALITY));
        reader.readAsDataURL(blob);
      },
      "image/jpeg",
      PROFILE_PHOTO_QUALITY,
    );
  });
}

export async function prepareProfilePhoto(file: File): Promise<string> {
  if (!file.type.startsWith("image/")) {
    throw new ProfilePhotoError("Escolha uma imagem válida.");
  }

  if (file.size > MAX_PROFILE_PHOTO_SOURCE_BYTES) {
    throw new ProfilePhotoError("Use uma imagem de até 12 MB.");
  }

  const rawDataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(rawDataUrl);
  const sourceSize = Math.min(image.naturalWidth || image.width, image.naturalHeight || image.height);
  if (!sourceSize) {
    throw new ProfilePhotoError("Não foi possível ler esta imagem.");
  }

  const canvas = document.createElement("canvas");
  canvas.width = PROFILE_PHOTO_TARGET_SIZE;
  canvas.height = PROFILE_PHOTO_TARGET_SIZE;
  const context = canvas.getContext("2d");
  if (!context) {
    throw new ProfilePhotoError("Não foi possível processar esta imagem.");
  }

  const sx = ((image.naturalWidth || image.width) - sourceSize) / 2;
  const sy = ((image.naturalHeight || image.height) - sourceSize) / 2;
  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(
    image,
    sx,
    sy,
    sourceSize,
    sourceSize,
    0,
    0,
    PROFILE_PHOTO_TARGET_SIZE,
    PROFILE_PHOTO_TARGET_SIZE,
  );

  const result = await canvasToJpegDataUrl(canvas);
  if (!result.startsWith("data:image/")) {
    throw new ProfilePhotoError("Não foi possível processar esta imagem.");
  }
  return result;
}
