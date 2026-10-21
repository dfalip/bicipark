const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const {PGlite}=require('@electric-sql/pglite');
test('cloud RLS isolates users, rejects stale sync, keeps pending reports private and exposes only minimal bike lookup',async()=>{
 const db=new PGlite();const a='11111111-1111-4111-8111-111111111111',b='22222222-2222-4222-8222-222222222222';
 try{
 await db.exec(`create role anon;create role authenticated;create schema auth;create table auth.users(id uuid primary key);insert into auth.users values('${a}'),('${b}');create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid $$;grant usage on schema auth to anon,authenticated;grant execute on function auth.uid() to anon,authenticated;`);
 await db.exec(fs.readFileSync('supabase/migrations/20261020_connected.sql','utf8'));
 async function user(id){await db.exec(`reset role;select set_config('request.jwt.claim.sub','${id||''}',false);set role ${id?'authenticated':'anon'};`)}
 await user(a);await db.query("select bp_save_state(0,'{}'::jsonb)");assert.equal((await db.query('select revision from bp_user_state')).rows[0].revision,1);
 await assert.rejects(db.query("select bp_save_state(0,'{}'::jsonb)"),/SYNC_CONFLICT/);await db.query("select bp_save_state(1,'{}'::jsonb)");await assert.rejects(db.query("select bp_save_state(1,'{}'::jsonb)"),/SYNC_CONFLICT/);
 const report=(await db.query("select bp_submit_report('works','Obres a la via',41.3,2.1) id")).rows[0].id;
 const bike=(await db.query(`insert into bp_bikes(user_id,brand,model,serial,published) values('${a}','Marca','Model','SECRET-SERIAL',true) returning id,public_token`)).rows[0];
 await user(b);assert.equal((await db.query('select * from bp_user_state')).rows.length,0);assert.equal((await db.query('select * from bp_reports')).rows.length,0);assert.equal((await db.query('select * from bp_bikes')).rows.length,0);
 await assert.rejects(db.query(`insert into bp_user_state(user_id,payload) values('${a}','{}')`));
 await assert.rejects(db.query(`update bp_reports set status='approved' where id='${report}'`));
 await assert.rejects(db.query(`insert into bp_report_votes(report_id,user_id,value) values('${report}','${b}',1)`));
 const publicBike=(await db.query(`select * from bp_public_bike('${bike.public_token}')`)).rows[0];assert.deepEqual(Object.keys(publicBike),['brand','model','status']);assert.equal(publicBike.brand,'Marca');
 await db.query(`select bp_found_bike('${bike.public_token}','contact@example.test','He trobat la bicicleta')`);
 await user(a);assert.equal((await db.query('select * from bp_bike_messages')).rows.length,1);
 await db.exec(`reset role;update bp_reports set status='approved' where id='${report}'`);await user(b);
 await db.query(`insert into bp_report_votes(report_id,user_id,value) values('${report}','${b}',1)`);await assert.rejects(db.query(`insert into bp_report_votes(report_id,user_id,value) values('${report}','${a}',-1)`));
 await user(null);assert.equal((await db.query('select * from bp_reports')).rows.length,1);await assert.rejects(db.query('select * from bp_bikes'));await assert.rejects(db.query('select * from bp_bike_messages'));await assert.rejects(db.query("select bp_save_state(0,'{}'::jsonb)"));
 await user(a);await db.query(`update bp_bikes set published=false where id='${bike.id}'`);await user(null);assert.equal((await db.query(`select * from bp_public_bike('${bike.public_token}')`)).rows.length,0);
 }finally{await db.close()}
});
