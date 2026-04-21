import { memo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { RecipeSuggestion } from "@/features/recipes/types";

interface SuggestionCardProps {
  suggestion: RecipeSuggestion;
  buttonLabel: string;
  onOpenRecipe: (suggestion: RecipeSuggestion) => void;
}

export const SuggestionCard = memo(function SuggestionCard({ suggestion, buttonLabel, onOpenRecipe }: SuggestionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{suggestion.title}</CardTitle>
        <CardDescription>{suggestion.description}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          {suggestion.matchedIngredients.slice(0, 4).map((ingredient) => (
            <Badge key={`${suggestion.id}-${ingredient}`}>tem {ingredient}</Badge>
          ))}
        </div>
        {suggestion.missingIngredients.length > 0 ? (
          <p className="text-xs text-muted-foreground">
            Falta: {suggestion.missingIngredients.join(", ")}.
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">Voce ja tem tudo para essa receita.</p>
        )}
      </CardContent>
      <CardFooter>
        <Button className="w-full" onClick={() => onOpenRecipe(suggestion)}>
          {buttonLabel}
        </Button>
      </CardFooter>
    </Card>
  );
});

SuggestionCard.displayName = "SuggestionCard";
