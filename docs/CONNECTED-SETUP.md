# Activació dels serveis

La configuració està desactivada per defecte a `config/services.json`. L’exportació/importació local i Route Watch funcionen sense compte. No s’ha creat cap projecte de pagament ni activat servei extern.

1. En un projecte Supabase de prova, executar en ordre les tres migracions de `supabase/migrations/`. No executar cegament sobre un esquema que ja contingui taules `bp_*`: aquestes migracions inicialitzen un esquema nou.
2. Configurar `supabaseUrl` i `supabaseAnonKey` amb URL HTTPS i clau pública publishable/anon. Mai incloure service-role o secret keys al navegador.
3. A Auth: URL de l’app i redirect permès `https://DOMINI/modules/account/`. Configurar el lliurament d’email. Provar els enllaços des del mateix navegador (PKCE). Per a Google/Apple, configurar primer el proveïdor i després afegir-lo a `oauthProviders`.
4. El bucket `bike-documents` ha de continuar privat. La migració força privacitat, 5 MB i JPG/PNG/PDF. Les URLs signades duren 60 segons. En eliminar un compte cal eliminar abans els seus objectes Storage; l’eliminació de la fila d’usuari no esborra els objectes.
5. Fer una prova amb dos comptes: cap accés creuat a còpies, bicis, missatges o documents; incidència pendent invisible al segon; fitxa pública només després d’opt-in; retirada immediata; conflicte de revisions des de dos dispositius.
6. Només l’operador amb accés administratiu ha de moderar `bp_reports.status`. No hi ha funció d’autoverificació del client. Definir responsable i termini de revisió abans d’activar la comunitat.
7. `analyticsEnabled` només si es decideix activar-lo. A més, cada usuari ha de consentir a Compte. Els esdeveniments només contenen nom, identificador del compte i data. Establir retenció (p. ex. 90 dies) amb una tasca administrativa. Els usuaris poden retirar consentiment i eliminar els seus esdeveniments.
8. Revisar límits/condicions dels proveïdors: [Supabase RLS](https://supabase.com/docs/guides/database/postgres/row-level-security), [Photon](https://github.com/komoot/photon), [Open-Meteo](https://open-meteo.com/en/terms). El servei meteorològic gratuït no cobreix ús comercial; configurar un proveïdor/pla adequat si correspon.

Consulta administrativa orientativa (només mostra usuaris que consenten i tenen compte):

```sql
select date_trunc('day',created_at) as day,name,count(*) as events,
       count(distinct user_id) as consenting_accounts
from public.bp_events
group by 1,2 order by 1 desc,2;
```

No s’han connectat Verified extern, transferència de propietat real, push en segon pla ni blockchain. El QR és una fitxa declarativa de contacte.
