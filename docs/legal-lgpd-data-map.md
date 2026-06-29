# TemAI Legal/LGPD Data Map

Documento interno para manter Termos de Uso, Politica de Privacidade, Apple Privacy Details e Google Data Safety alinhados com o app real.

Ultima revisao operacional: 19/05/2026.

## Identificacao e decisao empresarial

- Marca/produto: TemAI, marca/projeto Mafra Labs.
- Situacao atual: empresa em constituicao; nao publicar razao social/CNPJ ficticios.
- Decisao de lancamento: abrir ME/LTDA/SLU antes das lojas e atualizar Termos/Privacidade com razao social, CNPJ, cidade/UF e email LGPD.
- Canal unico de suporte e LGPD ate troca formal: Mafralabs@outlook.com.
- Revisor sugerido: contador para CNAE/regime/nota fiscal e uma revisao juridica pontual antes das lojas; revisao da mae advogada pode focar clareza, equilibrio contratual e abusividade pelo CDC.

## Inventario de dados e bases LGPD

| Categoria             | Exemplos                                                                      | Finalidade                                                                | Base LGPD usual                                                                                | Retencao padrao                                                                                                    |
| --------------------- | ----------------------------------------------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------ |
| Conta e autenticacao  | nome, email, username, hash/sessao do provedor, datas de aceite               | criar conta, login, seguranca, prova de aceite                            | contrato, obrigacao legal, legitimo interesse                                                  | enquanto a conta existir; registros essenciais podem ficar pelo prazo legal/defesa                                 |
| Perfil e preferencias | foto, equipamentos de cozinha, badges, notificacoes                           | personalizar experiencia e sincronizar dispositivos                       | contrato, legitimo interesse                                                                   | enquanto a conta existir ou ate exclusao/alteracao                                                                 |
| Receitas e biblioteca | receitas, ingredientes, modo de preparo, imagens, publicacoes                 | salvar, exibir, publicar, ranquear e moderar receitas                     | contrato, legitimo interesse, consentimento quando aplicavel                                   | privadas: enquanto a conta existir; publicadas podem ser mantidas sem vinculo direto quando necessario             |
| IA                    | prompts, ingredientes, fotos, audios, transcricoes, sugestoes, receita gerada | gerar receitas, transcrever audio, analisar imagem, controlar custo/abuso | contrato, legitimo interesse, consentimento quando houver dado sensivel fornecido pelo usuario | logs operacionais por prazo necessario para seguranca, melhoria e defesa; excluir/anonimizar quando nao necessario |
| Comunidade            | avaliacoes, comentarios, denuncias, moderacao                                 | reputacao, qualidade, seguranca e suporte a denuncias                     | contrato, legitimo interesse, exercicio regular de direitos                                    | enquanto necessario para comunidade, seguranca e defesa                                                            |
| Assinatura            | plano, status, periodo, recibos/token de loja, entitlement                    | liberar Premium, restore, suporte e conciliacao                           | contrato, obrigacao legal, exercicio regular de direitos                                       | pelo prazo contratual/fiscal e defesa                                                                              |
| Suporte               | mensagens, prints enviados, tickets, protocolo                                | atendimento e resolucao de problemas                                      | contrato, legitimo interesse, exercicio regular de direitos                                    | periodo necessario para atendimento, historico e defesa                                                            |
| Tecnicos e seguranca  | IP, user agent, device, rota, status, erros, rate limit                       | estabilidade, antifraude, seguranca e observabilidade                     | legitimo interesse, obrigacao legal                                                            | minimo necessario; logs tecnicos com politica de retencao curta sempre que possivel                                |

## Fornecedores e transferencias

| Fornecedor    | Papel                                           | Dados possiveis                                                         | Observacao para politica                                                                                     |
| ------------- | ----------------------------------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| Supabase      | banco, autenticacao e armazenamento             | conta, perfil, receitas, eventos, suporte, assinatura                   | subprocessador essencial; pode envolver transferencia internacional                                          |
| Vercel        | hospedagem, deploy, logs e observabilidade      | IP, requests, erros, metadados tecnicos                                 | subprocessador essencial; pode envolver transferencia internacional                                          |
| OpenAI        | IA e transcricao/analise conforme recurso usado | prompts, ingredientes, imagens, audio/transcricao e contexto necessario | nao enviar dados pessoais desnecessarios; informar processamento por provedor de IA                          |
| RevenueCat    | recibos, status Premium, restore e webhooks     | identificador interno, recibos, produto, status                         | usar ID interno nao adivinhavel; evitar email como App User ID                                               |
| Apple/Google  | lojas, billing nativo, assinatura e reembolso   | dados da conta da loja, transacao, status e recibos                     | cobranca/cancelamento/reembolso seguem regras das lojas                                                      |
| Email/suporte | atendimento                                     | email, mensagens, anexos enviados voluntariamente                       | limitar anexos sensiveis e reter so o necessario                                                             |
| Analytics     | somente se ativado no futuro                    | eventos de uso e desempenho                                             | v1 assume sem ads/tracking comportamental; qualquer mudanca exige atualizar politica e formularios das lojas |

## Checklist para lojas

- Apple Privacy Details e Google Data Safety devem declarar exatamente os dados coletados e compartilhados acima.
- Declarar que nao ha venda de dados nem tracking publicitario/cross-app no v1.
- Publicar URL de exclusao de conta: `/exclusao-de-conta`.
- Confirmar que o app oferece exclusao dentro do Perfil e canal por email quando o usuario perdeu acesso.
- Textos de assinatura devem dizer "uso livre com protecoes anti-abuso", nunca "ilimitado" absoluto.

## Referencias de trabalho

- LGPD: https://www.planalto.gov.br/ccivil_03/_ato2015-2018/2018/Lei/L13709compilado.htm
- ANPD pequenos agentes: https://www.gov.br/anpd/pt-br/acesso-a-informacao/institucional/atos-normativos/regulamentacoes_anpd/resolucao-cd-anpd-no-2-de-27-de-janeiro-de-2022
- ANPD cookies: https://www.gov.br/anpd/pt-br/centrais-de-conteudo/materiais-educativos-e-publicacoes/guia-orientativo-cookies-e-protecao-de-dados-pessoais.pdf/view
- CDC: https://www.planalto.gov.br/ccivil_03/Leis/L8078compilado.htm
- Marco Civil: https://www.planalto.gov.br/ccivil_03/_ato2011-2014/2014/lei/l12965.htm
- Apple Privacy Details: https://developer.apple.com/app-store/app-privacy-details/
- Google Data Safety/account deletion: https://support.google.com/googleplay/android-developer/answer/10787469 e https://support.google.com/googleplay/android-developer/answer/13327111
- OpenAI data controls: https://platform.openai.com/docs/guides/your-data
- RevenueCat privacy/DPA: https://www.revenuecat.com/privacy/ e https://www.revenuecat.com/dpa/
