const http = require("http");
const { createRegistry } = require("./integrations/registry");

const PORT = process.env.PORT || 3000;
const SUPABASE_URL = process.env.SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || "";
const registry = createRegistry();

const page = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>ELEVAT — AI Workflow Audit</title><meta name="description" content="Find practical AI automation opportunities in your business.">
<style>body{font-family:system-ui,-apple-system,sans-serif;max-width:860px;margin:auto;padding:32px;line-height:1.5;background:#0b0d0c;color:#f4f7f5}.card{background:#151917;border:1px solid #2a302c;border-radius:18px;padding:28px;margin:18px 0}h1{font-size:42px;line-height:1.05;margin:0 0 16px}.muted{color:#b9c1bc}.grid{display:grid;grid-template-columns:1fr 1fr;gap:12px}input,select,textarea{width:100%;box-sizing:border-box;padding:13px;border-radius:10px;border:1px solid #39413c;background:#0e1110;color:#fff}textarea{min-height:110px}button{width:100%;padding:14px;border:0;border-radius:10px;background:#39d98a;color:#07110b;font-weight:800;cursor:pointer}.proof{font-size:14px}.success{color:#39d98a}@media(max-width:650px){.grid{grid-template-columns:1fr}h1{font-size:34px}}</style></head>
<body><div class="card"><p class="muted">ELEVAT · Intelligent Business Systems</p><h1>Turn repetitive business work into an automated workflow.</h1>
<p>Identify practical opportunities to automate lead handling, customer follow-up, scheduling, administrative work, and other repetitive processes.</p>
<p><strong>$249 AI Workflow Audit</strong> — focused assessment and implementation roadmap.</p>
<p class="proof">You'll leave with a prioritized automation roadmap tied to your actual workflow—not generic AI advice.</p></div>
<div class="card"><h2>Request your audit</h2><form id="lead"><div class="grid">
<input name="name" placeholder="Your name" required maxlength="120"><input name="work_email" type="email" placeholder="Work email" required maxlength="254">
<input name="company" placeholder="Company" required maxlength="160"><input name="role" placeholder="Your role" required maxlength="120">
<input name="team_size" placeholder="Team size" required maxlength="80"><select name="budget_range" required><option value="">Budget range</option><option>$250–$999</option><option>$1,000–$2,499</option><option>$2,500–$4,999</option><option>$5,000+</option></select>
<select name="timeline" required><option value="">Timeline</option><option>Immediately</option><option>Within 30 days</option><option>1–3 months</option><option>Exploring</option></select></div>
<p><textarea name="primary_goal" placeholder="What repetitive process would you most like to automate?" required maxlength="1000"></textarea></p>
<button type="submit">Request My AI Workflow Audit</button><p id="status" class="muted"></p></form></div>
<script>
const form=document.getElementById("lead"),status=document.getElementById("status");
const params=new URLSearchParams(location.search),source=params.get("utm_source")||params.get("source")||"direct";
fetch("/api/events",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({event_name:"visit_source_captured",session_id:crypto.randomUUID(),properties:{source,utm_medium:params.get("utm_medium")||"",utm_campaign:params.get("utm_campaign")||""}})}).catch(()=>{});
form.addEventListener("submit",async(e)=>{e.preventDefault();status.textContent="Submitting…";const data=Object.fromEntries(new FormData(form).entries());data.source=source;try{const r=await fetch("/api/leads",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(data)});const j=await r.json();if(!r.ok)throw new Error(j.error||"Unable to submit");form.reset();status.textContent="Thanks — your request is in. We'll follow up using the email you provided."}catch(err){status.textContent=err.message||"Please try again."}});
</script>
</body></html>`;

async function supabasePost(table,payload){
 if(!SUPABASE_URL||!SUPABASE_ANON_KEY) throw new Error("Supabase is not configured.");
 const response=await fetch(SUPABASE_URL+"/rest/v1/"+table,{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json","Prefer":"return=minimal"},body:JSON.stringify(payload)});
 if(!response.ok) throw new Error("Supabase write failed.");
}

async function saveLead(data){
 if(!SUPABASE_URL||!SUPABASE_ANON_KEY)throw new Error("Lead capture is not configured.");
 const leadRes=await fetch(SUPABASE_URL+"/rest/v1/consultation_leads",{method:"POST",headers:{"apikey":SUPABASE_ANON_KEY,"Authorization":"Bearer "+SUPABASE_ANON_KEY,"Content-Type":"application/json","Prefer":"return=representation"},body:JSON.stringify({name:data.name,work_email:data.work_email,company:data.company,role:data.role,team_size:data.team_size,primary_goal:data.primary_goal,budget_range:data.budget_range,timeline:data.timeline})});
 if(!leadRes.ok)throw new Error("Lead submission failed.");
 const rows=await leadRes.json(),lead=rows[0];
 await supabasePost("funnel_events",{event_name:"lead_qualified",lead_id:lead.id,properties:{source:data.source||"direct"}});
 return lead.id;
}

const server=http.createServer(async(req,res)=>{
 if(req.url==="/integrations/health"){res.writeHead(200,{"Content-Type":"application/json"});res.end(JSON.stringify({providers:registry.health()},null,2));return;}
 if(req.url==="/api/events"&&req.method==="POST"){let body="";req.on("data",c=>{body+=c});req.on("end",async()=>{try{const data=JSON.parse(body||"{}");if(!["visit_source_captured"].includes(data.event_name))throw new Error("Invalid event.");await supabasePost("funnel_events",{event_name:data.event_name,session_id:data.session_id||null,properties:data.properties||{}});res.writeHead(204);res.end()}catch(e){res.writeHead(400,{"Content-Type":"application/json"});res.end(JSON.stringify({error:e.message}))}});return;}
 if(req.url==="/api/leads"&&req.method==="POST"){let body="";req.on("data",c=>{body+=c});req.on("end",async()=>{try{const data=JSON.parse(body);const id=await saveLead(data);res.writeHead(201,{"Content-Type":"application/json"});res.end(JSON.stringify({ok:true,id}))}catch(e){res.writeHead(400,{"Content-Type":"application/json"});res.end(JSON.stringify({error:e.message}))}});return;}
 res.writeHead(200,{"Content-Type":"text/html; charset=utf-8"});res.end(page);
});
server.listen(PORT,()=>console.log(`Server listening on port ${PORT}`));
