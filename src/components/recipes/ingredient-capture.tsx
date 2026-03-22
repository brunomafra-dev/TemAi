"use client";

import { useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import type { InputMode } from "@/features/recipes/types";
import { cn } from "@/lib/utils";

interface IngredientCaptureProps {
  mode: InputMode;
  onModeChange: (mode: InputMode) => void;
  ingredientsText: string;
  onIngredientsTextChange: (value: string) => void;
  hintText?: string;
}

const captureModes: Array<{ value: InputMode; label: string }> = [
  { value: "text", label: "Texto" },
  { value: "audio", label: "Audio" },
  { value: "photo", label: "Foto" },
];

export function IngredientCapture({
  mode,
  onModeChange,
  ingredientsText,
  onIngredientsTextChange,
  hintText,
}: IngredientCaptureProps) {
  const placeholder = useMemo(() => {
    if (mode === "audio") {
      return "Ex: audio com ovo, tomate e queijo. Se quiser, descreva aqui os ingredientes.";
    }

    if (mode === "photo") {
      return "Ex: foto com frango, arroz e cenoura. Descreva aqui para gerar mais rapido.";
    }

    return "Ex: ovo, arroz, tomate, cebola";
  }, [mode]);

  return (
    <Card className="overflow-hidden">
      <CardHeader>
        <CardTitle>O que voce tem em casa?</CardTitle>
        <CardDescription>
          Informe ingredientes por texto, audio ou foto. Na V1, usamos a descricao para gerar com
          velocidade.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-3 gap-2">
          {captureModes.map((captureMode) => (
            <Button
              key={captureMode.value}
              variant={mode === captureMode.value ? "default" : "outline"}
              size="sm"
              className={cn("rounded-2xl", mode === captureMode.value && "shadow-sm")}
              onClick={() => onModeChange(captureMode.value)}
            >
              {captureMode.label}
            </Button>
          ))}
        </div>

        {mode === "audio" && <Input type="file" accept="audio/*" />}
        {mode === "photo" && <Input type="file" accept="image/*" />}

        <Textarea
          value={ingredientsText}
          onChange={(event) => onIngredientsTextChange(event.target.value)}
          placeholder={placeholder}
        />

        {hintText ? <p className="text-xs text-muted-foreground">{hintText}</p> : null}
      </CardContent>
    </Card>
  );
}
