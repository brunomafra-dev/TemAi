import { memo } from "react";
import Link from "next/link";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { Recipe } from "@/features/recipes/types";

interface RecipeCardProps {
  recipe: Recipe;
  href: string;
  footerLabel?: string;
}

export const RecipeCard = memo(function RecipeCard({ recipe, href, footerLabel }: RecipeCardProps) {
  return (
    <Link href={href} className="block">
      <Card className="overflow-hidden border-[#E5D7C1] bg-[#FFFCF7] shadow-[0_20px_35px_-25px_rgba(42,30,23,0.7)] transition hover:-translate-y-0.5 hover:shadow-[0_24px_42px_-24px_rgba(42,30,23,0.75)]">
        {recipe.imageUrl ? (
          <div className="relative h-44 overflow-hidden rounded-t-[1.5rem]">
            <Image
              src={recipe.imageUrl}
              alt={recipe.title}
              fill
              sizes="(max-width: 768px) 100vw, 50vw"
              className="object-cover transition duration-700 hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-[#2A1E17]/70 via-[#2A1E17]/20 to-transparent" />
            <div className="absolute left-3 top-3 flex gap-1.5">
              <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white">
                {recipe.prepMinutes} min
              </span>
              <span className="rounded-full bg-black/35 px-2 py-0.5 text-[10px] font-semibold text-white">
                {recipe.servings} porcoes
              </span>
            </div>
          </div>
        ) : null}
        <CardHeader className="pb-2">
          <CardTitle className="line-clamp-2 text-[1.02rem] text-[#2A1E17]">{recipe.title}</CardTitle>
          <CardDescription className="line-clamp-2 text-[#7A6D60]">{recipe.description}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pt-0">
          <div className="flex flex-wrap gap-1.5">
            {recipe.ingredients.slice(0, 4).map((ingredient) => (
              <Badge
                key={`${recipe.id}-${ingredient}`}
                className="border-[#E5D7BF] bg-[#F8F2E7] text-[#695C4C]"
              >
                {ingredient}
              </Badge>
            ))}
          </div>
          {footerLabel ? <p className="text-xs font-semibold text-[#8E7752]">{footerLabel}</p> : null}
        </CardContent>
      </Card>
    </Link>
  );
});

RecipeCard.displayName = "RecipeCard";
