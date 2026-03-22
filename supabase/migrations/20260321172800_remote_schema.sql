drop extension if exists "pg_net";

drop policy "public can read recipe_ratings" on "public"."recipe_ratings";

drop policy "public can update recipe_ratings" on "public"."recipe_ratings";

drop policy "public can write recipe_ratings" on "public"."recipe_ratings";

drop policy "public can read recipes_br" on "public"."recipes_br";

revoke delete on table "public"."recipe_ratings" from "anon";

revoke insert on table "public"."recipe_ratings" from "anon";

revoke references on table "public"."recipe_ratings" from "anon";

revoke select on table "public"."recipe_ratings" from "anon";

revoke trigger on table "public"."recipe_ratings" from "anon";

revoke truncate on table "public"."recipe_ratings" from "anon";

revoke update on table "public"."recipe_ratings" from "anon";

revoke delete on table "public"."recipe_ratings" from "authenticated";

revoke insert on table "public"."recipe_ratings" from "authenticated";

revoke references on table "public"."recipe_ratings" from "authenticated";

revoke select on table "public"."recipe_ratings" from "authenticated";

revoke trigger on table "public"."recipe_ratings" from "authenticated";

revoke truncate on table "public"."recipe_ratings" from "authenticated";

revoke update on table "public"."recipe_ratings" from "authenticated";

revoke delete on table "public"."recipe_ratings" from "service_role";

revoke insert on table "public"."recipe_ratings" from "service_role";

revoke references on table "public"."recipe_ratings" from "service_role";

revoke select on table "public"."recipe_ratings" from "service_role";

revoke trigger on table "public"."recipe_ratings" from "service_role";

revoke truncate on table "public"."recipe_ratings" from "service_role";

revoke update on table "public"."recipe_ratings" from "service_role";

revoke delete on table "public"."recipes_br" from "anon";

revoke insert on table "public"."recipes_br" from "anon";

revoke references on table "public"."recipes_br" from "anon";

revoke select on table "public"."recipes_br" from "anon";

revoke trigger on table "public"."recipes_br" from "anon";

revoke truncate on table "public"."recipes_br" from "anon";

revoke update on table "public"."recipes_br" from "anon";

revoke delete on table "public"."recipes_br" from "authenticated";

revoke insert on table "public"."recipes_br" from "authenticated";

revoke references on table "public"."recipes_br" from "authenticated";

revoke select on table "public"."recipes_br" from "authenticated";

revoke trigger on table "public"."recipes_br" from "authenticated";

revoke truncate on table "public"."recipes_br" from "authenticated";

revoke update on table "public"."recipes_br" from "authenticated";

revoke delete on table "public"."recipes_br" from "service_role";

revoke insert on table "public"."recipes_br" from "service_role";

revoke references on table "public"."recipes_br" from "service_role";

revoke select on table "public"."recipes_br" from "service_role";

revoke trigger on table "public"."recipes_br" from "service_role";

revoke truncate on table "public"."recipes_br" from "service_role";

revoke update on table "public"."recipes_br" from "service_role";

alter table "public"."recipe_ratings" drop constraint "recipe_ratings_rating_check";

alter table "public"."recipe_ratings" drop constraint "recipe_ratings_recipe_id_fkey";

alter table "public"."recipe_ratings" drop constraint "recipe_ratings_recipe_id_user_fingerprint_key";

alter table "public"."recipes_br" drop constraint "recipes_br_category_check";

alter table "public"."recipes_br" drop constraint "recipes_br_slug_key";

alter table "public"."recipe_ratings" drop constraint "recipe_ratings_pkey";

alter table "public"."recipes_br" drop constraint "recipes_br_pkey";

drop index if exists "public"."recipe_ratings_pkey";

drop index if exists "public"."recipe_ratings_recipe_id_user_fingerprint_key";

drop index if exists "public"."recipe_ratings_recipe_idx";

drop index if exists "public"."recipes_br_category_idx";

drop index if exists "public"."recipes_br_ingredients_idx";

drop index if exists "public"."recipes_br_pkey";

drop index if exists "public"."recipes_br_slug_key";

drop index if exists "public"."recipes_br_title_idx";

drop table "public"."recipe_ratings";

drop table "public"."recipes_br";


