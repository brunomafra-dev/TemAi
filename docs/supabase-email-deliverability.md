# Entregabilidade de Emails do TemAi

O cadastro do TemAi cria o usuário com `email_confirm: true`, então o login não depende de email de confirmação hoje.
Emails que ainda podem cair em Spam/Lixo eletrônico são principalmente recuperação de senha e mensagens transacionais do Supabase.

## Ajuste necessário no Supabase

Para melhorar entregabilidade de verdade, configure SMTP próprio no painel do Supabase:

1. Acesse o projeto no Supabase.
2. Vá em `Authentication > Emails`.
3. Configure `SMTP Settings` com um provedor transacional.
4. Use um domínio autenticado com SPF, DKIM e DMARC.
5. Troque o remetente para algo do domínio oficial, por exemplo `suporte@temai.com.br`.

## Provedores recomendados

- Resend
- Postmark
- Brevo
- Mailgun

Evite depender do remetente padrão do Supabase para produção, porque ele tende a ter pior reputação compartilhada e pode cair em spam.

## Enquanto o domínio não existe

- Mantenha o app avisando para conferir Spam/Lixo eletrônico.
- Não use email pessoal/outlook como remetente principal de produção se puder evitar.
- Quando comprar o domínio, autentique o domínio no provedor de email antes de lançar campanhas ou onboarding.
