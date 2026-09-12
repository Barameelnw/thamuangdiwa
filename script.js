/* ===== ข้อมูลต้นไม้ตั้งต้น (แก้ให้ตรงกับโรงเรียนได้เลย) ===== */
const SEED = [];

const KEY = "tmr_urbanforest_v1";
let trees = load();

function load(){
  try{ const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : [...SEED]; }
  catch(e){ return [...SEED]; }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(trees)); }

/* ===== สูตรคำนวณ ===== */
const dbh  = g => g / Math.PI;                          // เส้นผ่านศูนย์กลาง (ซม.)
const bio  = (g,h) => 0.0509 * 0.6 * Math.pow(dbh(g),2) * h;  // มวลชีวภาพ (กก.)
const co2  = (g,h) => bio(g,h) * 0.47 * 3.67;           // CO₂ กักเก็บ (กก.)
const HEALTH_TH = {good:"สมบูรณ์ดี", fair:"ต้องเฝ้าระวัง", bad:"ต้องดูแลด่วน"};
const ICONS = {"ไม้ยืนต้น":"🌳","ไม้ดอก":"🌸","ไม้ผล":"🍎","ไม้พุ่ม":"🌿"};

/* ===== สถิติ Hero ===== */
function renderStats(){
  const total = trees.length;
  const species = new Set(trees.map(t=>t.name)).size;
  const carbon = trees.reduce((s,t)=>s+co2(t.girth,t.height),0);
  const good = trees.filter(t=>t.health==="good").length;
  animate(document.getElementById("stTotal"), total);
  animate(document.getElementById("stSpecies"), species);
  animate(document.getElementById("stCarbon"), Math.round(carbon));
  document.getElementById("stHealth").textContent =
    (total ? Math.round(good/total*100) : 0) + "%";
}
function animate(el,target){
  let n=0, step=Math.max(1,Math.ceil(target/30));
  const id=setInterval(()=>{ n+=step;
    if(n>=target){n=target;clearInterval(id);}
    el.textContent=n.toLocaleString();},30);
}

/* ===== การ์ดฐานข้อมูล ===== */
function renderTrees(){
  const q = document.getElementById("searchBox").value.trim().toLowerCase();
  const ty = document.getElementById("filterType").value;
  const he = document.getElementById("filterHealth").value;

  const list = trees.filter(t=>{
    const hit = (t.name+t.sci+t.code+t.zone).toLowerCase().includes(q);
    return hit && (!ty || t.type===ty) && (!he || t.health===he);
  });

  document.getElementById("resultInfo").textContent =
    `พบข้อมูล ${list.length} ต้น จากทั้งหมด ${trees.length} ต้น`;

  const grid = document.getElementById("treeGrid");
  grid.innerHTML = list.length ? list.map((t,i)=>`
    <article class="tree-card" data-code="${t.code}">
      <div class="tc-top"><span class="code">${t.code}</span>${t.icon||ICONS[t.type]||"🌳"}</div>
      <div class="tc-body">
        <h4>${t.name}</h4>
        <p class="sci">${t.sci||"-"}</p>
        <div class="meta"><span>📍 ${t.zone}</span><span>↕ ${t.height} ม.</span></div>
        <div class="meta"><span>🌲 ${t.type}</span><span>⌀ ${dbh(t.girth).toFixed(1)} ซม.</span></div>
        <span class="badge ${t.health}">${HEALTH_TH[t.health]}</span>
      </div>
    </article>`).join("")
    : `<p style="grid-column:1/-1;text-align:center;color:#889;padding:40px 0">
        😢 ไม่พบข้อมูลที่ตรงกับเงื่อนไข</p>`;

  grid.querySelectorAll(".tree-card").forEach(c=>
    c.onclick = ()=> openModal(c.dataset.code));
}

/* ===== แผนที่ ===== */
function renderMap(){
  const canvas = document.getElementById("mapCanvas");
  canvas.querySelectorAll(".pin").forEach(p=>p.remove());
  trees.forEach(t=>{
    const p = document.createElement("div");
    p.className = `pin ${t.health}`;
    p.style.left = (t.x ?? 50) + "%";
    p.style.top  = (t.y ?? 50) + "%";
    p.title = `${t.code} ${t.name}`;
    p.onclick = ()=> openModal(t.code);
    canvas.appendChild(p);
  });
}

/* ===== Modal ===== */
function openModal(code){
  const t = trees.find(x=>x.code===code); if(!t) return;
  document.getElementById("modalBody").innerHTML = `
    <div style="font-size:3rem;text-align:center">${t.icon||ICONS[t.type]||"🌳"}</div>
    <h3 style="text-align:center">${t.name}</h3>
    <p style="text-align:center;font-style:italic;color:#889;margin-bottom:18px">${t.sci||"-"}</p>
    <div class="info-line"><span>รหัสต้นไม้</span><b>${t.code}</b></div>
    <div class="info-line"><span>ประเภท</span><b>${t.type}</b></div>
    <div class="info-line"><span>บริเวณ</span><b>${t.zone}</b></div>
    <div class="info-line"><span>ความสูง</span><b>${t.height} เมตร</b></div>
    <div class="info-line"><span>เส้นรอบวง</span><b>${t.girth} ซม.</b></div>
    <div class="info-line"><span>DBH</span><b>${dbh(t.girth).toFixed(1)} ซม.</b></div>
    <div class="info-line"><span>CO₂ ที่กักเก็บ</span><b>${co2(t.girth,t.height).toFixed(1)} กก.</b></div>
    <div class="info-line"><span>สุขภาพ</span><b class="badge ${t.health}" style="margin:0">${HEALTH_TH[t.health]}</b></div>
    <div class="info-line"><span>ผู้สำรวจ</span><b>${t.surveyor}</b></div>
    <p style="margin-top:14px;font-size:.88rem;color:#556">📝 ${t.note||"ไม่มีบันทึกเพิ่มเติม"}</p>`;
  document.getElementById("modal").classList.add("show");
}
document.getElementById("modalClose").onclick =
  ()=> document.getElementById("modal").classList.remove("show");
document.getElementById("modal").onclick = e=>{
  if(e.target.id==="modal") e.currentTarget.classList.remove("show"); };

/* ===== Dashboard ===== */
function renderDash(){
  const zones = {};
  trees.forEach(t => zones[t.zone] = (zones[t.zone]||0)+1);
  const max = Math.max(1, ...Object.values(zones));
  document.getElementById("chartZone").innerHTML =
    Object.entries(zones).map(([z,n])=>`
      <div class="bar-row"><div style="display:flex;justify-content:space-between">
        <span>${z}</span><b>${n} ต้น</b></div>
        <div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%"></div></div>
      </div>`).join("");

  const colors = {good:"#2e8b57",fair:"#e0a020",bad:"#d9534f"};
  document.getElementById("chartHealth").innerHTML =
    ["good","fair","bad"].map(h=>{
      const n = trees.filter(t=>t.health===h).length;
      const pct = trees.length ? (n/trees.length*100) : 0;
      return `<div class="bar-row"><div style="display:flex;justify-content:space-between">
        <span>${HEALTH_TH[h]}</span><b>${n} ต้น (${pct.toFixed(0)}%)</b></div>
        <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${colors[h]}"></div></div>
      </div>`; }).join("");
}

/* ===== ฟอร์มสำรวจ ===== */
const form = document.getElementById("treeForm");
form.addEventListener("input", ()=>{
  const g = +form.girth.value, h = +form.height.value;
  if(g>0 && h>0){
    document.getElementById("cDbh").textContent = dbh(g).toFixed(1)+" ซม.";
    document.getElementById("cBio").textContent = bio(g,h).toFixed(1)+" กก.";
    document.getElementById("cCo2").textContent = co2(g,h).toFixed(1)+" กก.";
  }
});
form.addEventListener("submit", e=>{
  e.preventDefault();
  const f = new FormData(form);
  const num = String(trees.length+1).padStart(3,"0");
  trees.push({
    code:"TMR-"+num,
    name:f.get("name"), sci:f.get("sci"), type:f.get("type"), zone:f.get("zone"),
    height:+f.get("height"), girth:+f.get("girth"), health:f.get("health"),
    surveyor:f.get("surveyor"), note:f.get("note"),
    x:10+Math.random()*80, y:10+Math.random()*80,
    icon: ICONS[f.get("type")] || "🌳"
  });
  save(); refresh(); form.reset();
  ["cDbh","cBio","cCo2"].forEach(id=>document.getElementById(id).textContent="– กก.");
  alert(`✅ บันทึกสำเร็จ! รหัสต้นไม้ใหม่คือ TMR-${num}`);
  document.getElementById("database").scrollIntoView({behavior:"smooth"});
});

/* ===== ส่งออก CSV ===== */
document.getElementById("btnExport").onclick = ()=>{
  const head = "รหัส,ชื่อ,ชื่อวิทยาศาสตร์,ประเภท,บริเวณ,ความสูง(ม.),เส้นรอบวง(ซม.),DBH(ซม.),CO2(กก.),สุขภาพ,ผู้สำรวจ,หมายเหตุ";
  const rows = trees.map(t=>[t.code,t.name,t.sci,t.type,t.zone,t.height,t.girth,
    dbh(t.girth).toFixed(1),co2(t.girth,t.height).toFixed(1),HEALTH_TH[t.health],
    t.surveyor,(t.note||"").replace(/,/g,"；")].join(","));
  const blob = new Blob(["\uFEFF"+head+"\n"+rows.join("\n")],{type:"text/csv;charset=utf-8"});
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "ฐานข้อมูลต้นไม้_ท่าม่วงราษฎร์บำรุง.csv";
  a.click();
};

/* ===== ตัวกรอง + เมนู ===== */
["searchBox","filterType","filterHealth"].forEach(id=>
  document.getElementById(id).addEventListener("input", renderTrees));
document.getElementById("btnReset").onclick = ()=>{
  document.getElementById("searchBox").value="";
  document.getElementById("filterType").value="";
  document.getElementById("filterHealth").value="";
  renderTrees();
};
document.getElementById("burger").onclick = ()=>
  document.getElementById("menu").classList.toggle("open");
document.querySelectorAll('#menu a').forEach(a=>
  a.onclick = ()=> document.getElementById("menu").classList.remove("open"));
document.querySelectorAll('a[href^="#"]').forEach(a=>{
  a.addEventListener("click", e=>{
    const el = document.querySelector(a.getAttribute("href"));
    if(el){ e.preventDefault(); el.scrollIntoView({behavior:"smooth"}); }
  });
});

/* ===== เริ่มทำงาน ===== */
function refresh(){ renderStats(); renderTrees(); renderMap(); renderDash(); }
refresh();
// =========================================================
// 🚀 ระบบส่งข้อมูลฟอร์มต้นไม้ไปที่ Google Sheets (SheetDB)
// =========================================================

document.addEventListener("DOMContentLoaded", () => {
  const treeForm = document.getElementById("treeForm");

  if (treeForm) {
    treeForm.addEventListener("submit", function (event) {
      event.preventDefault(); // ป้องกันไม่ให้หน้าเว็บรีเฟรชเอง

      // 1. ดึงข้อมูลจากช่องกรอกทั้งหมดในฟอร์มโดยใช้ FormData
      const formData = new FormData(treeForm);

      // แปลงค่าสุขภาพต้นไม้ให้อ่านง่ายก่อนลง Google Sheets
      let healthText = "";
      const healthValue = formData.get("health");
      if (healthValue === "good") healthText = "สมบูรณ์ดี";
      else if (healthValue === "fair") healthText = "ต้องเฝ้าระวัง";
      else if (healthValue === "bad") healthText = "ต้องดูแลด่วน";

      // 2. แพ็กข้อมูลเป็นก้อน Object (ตรงนี้ต้องตั้งชื่อฝั่งซ้ายให้ตรงกับหัวตาราง Google Sheets ของคุณเป๊ะๆ)
      const treeData = {
        "timestamp": new Date().toLocaleString("th-TH"), // สร้างวันเวลาไทยอัตโนมัติ
        "ชื่อต้นไม้(ไทย)*": formData.get("name"),
        "ชื่อวิทยาศาสตร์": formData.get("sci"),
        "ประเภท": formData.get("type"),
        "บริเวณ": formData.get("zone"),
        "ความสูง": formData.get("height"),
        "เส้นรอบวง": formData.get("girth"),
        "สุขภาพ": healthText,
        "ผู้สำรวจ": formData.get("surveyor"),
        "บันทึกเพิ่มเติม": formData.get("note")
      };

      // 3. ใช้ fetch ส่งข้อมูล (POST) ไปยัง SheetDB
      // ⚠️ เปลี่ยนลิงก์ด้านล่างนี้ให้เป็น API URL ที่ได้มาจากเว็บ SheetDB ของคุณจริงๆ นะครับ
      const sheetDbUrl = "https://sheetdb.io/api/v1/m7x855pegxfiw";

      // แสดงสถานะกำลังบันทึกบนปุ่มชั่วคราว
      const submitBtn = treeForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.innerHTML;
      submitBtn.disabled = true;
      submitBtn.innerHTML = "⏳ กำลังบันทึกข้อมูล...";

      fetch(sheetDbUrl, {
        method: "POST",
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          data: [treeData]
        })
      })
        .then((response) => {
          if (!response.ok) {
            throw new Error("ระบบฐานข้อมูลตอบกลับผิดพลาด");
          }
          return response.json();
        })
        .then((data) => {
          alert("🎉 บันทึกผลสำรวจต้นไม้โรงเรียนท่าม่วงฯ สำเร็จแล้ว!");
          treeForm.reset(); // ล้างข้อมูลในฟอร์มเมื่อบันทึกเสร็จ

          // ล้างตัวเลขบนกล่องคำนวณหน้าเว็บให้กลับเป็นค่าเริ่มต้น
          document.getElementById("cDbh").innerText = "– ซม.";
          document.getElementById("cBio").innerText = "– กก.";
          document.getElementById("cCo2").innerText = "– กก.";
        })
        .catch((error) => {
          console.error("Error:", error);
          alert("❌ เกิดข้อผิดพลาด ไม่สามารถส่งข้อมูลได้ กรุณาตรวจสอบการเชื่อมต่ออินเทอร์เน็ต");
        })
        .finally(() => {
          // คืนค่าปุ่มให้กดใหม่ได้ตามปกติ
          submitBtn.disabled = false;
          submitBtn.innerHTML = originalBtnText;
        });
    });
  }
});
