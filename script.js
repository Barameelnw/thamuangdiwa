// =========================================================
// 🌳 ส่วนที่ 1: ระบบจัดการข้อมูลคลาวด์ (ครึ่งบน)
// =========================================================

// ⚠️ เปลี่ยนลิงก์ด้านล่างนี้ให้เป็นลิงก์ API ของ SheetDB คุณนะครับ
const SHEETDB_URL = "https://sheetdb.io/api/v1/m7x855pegxfiw";

let trees = []; 

/* ===== สูตรคำนวณของระบบ ===== */
const dbh  = g => g / Math.PI;                          
const bio  = (g,h) => 0.0509 * 0.6 * Math.pow(dbh(g),2) * h;  
const co2  = (g,h) => bio(g,h) * 0.47 * 3.67;           
const HEALTH_TH = {good:"สมบูรณ์ดี", fair:"ต้องเฝ้าระวัง", bad:"ต้องดูแลด่วน"};
const HEALTH_EN = {"สมบูรณ์ดี":"good", "ต้องเฝ้าระวัง":"fair", "ต้องดูแลด่วน":"bad"};
const ICONS = {"ไม้ยืนต้น":"🌳","ไม้ดอก":"🌸","ไม้ผล":"🍎","ไม้พุ่ม":"🌿"};

function refresh() {
  renderStats();
  renderTrees();
  //renderMap();
  renderDash();
}

/* ===== 🔄 โหลดข้อมูลจริงจาก Google Sheets กลับมาแสดงบนหน้าเว็บ ===== */
function loadTreeData() {
  fetch(SHEETDB_URL)
    .then(response => {
      if (!response.ok) throw new Error("ดึงข้อมูลจาก API ไม่สำเร็จ");
      return response.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        // แปลงข้อมูลแถวตารางจาก Google Sheets ให้เข้าล็อกโครงสร้างของหน้าเว็บ
        trees = data.map((item, index) => {
          // 1. ดักจับและแปลงค่าสุขภาพกลับเป็นคีย์ภาษาอังกฤษสำหรับ CSS โค้ดเดิม
          let healthKey = "good";
          const hValue = item["สุขภาพต้นไม้ *"] || item["สุขภาพ"] || "";
          if (hValue.includes("เฝ้าระวัง")) healthKey = "fair";
          if (hValue.includes("ด่วน") || hValue.includes("ผุ")) healthKey = "bad";

          const treeType = item["ประเภท *"] || item["ประเภท"] || "ไม้ยืนต้น";
          
          // 2. ดึงค่าชื่อต้นไม้ (ถ้าไม่มีให้ใช้คำแก้ขัดเพื่อไม่ให้การ์ดขาวโพลน)
          const treeName = item["ชื่อต้นไม้(ไทย) *"] || item["ชื่อต้นไม้"] || "ไม่ระบุชื่อ";

          return {
            // รันรหัสต้นไม้ TMR-001, TMR-002 ตามลำดับแถวอัตโนมัติ
            code: `TMR-${String(index + 1).padStart(3, "0")}`, 
            name: treeName,
            sci: item["ชื่อวิทยาศาสตร์"] || "-",
            type: treeType,
            zone: item["บริเวณที่พบ *"] || item["บริเวณ"] || "ไม่ระบุบริเวณ",
            
            // 3. ดึงค่าตัวเลขความสูงและเส้นรอบวง แปลงจากข้อความให้เป็นตัวเลขทศนิยม
            height: parseFloat(item["ความสูงโดยประมาณ (เมตร) *"] || item["ความสูง"]) || 0, 
            girth: parseFloat(item["เส้นรอบวงลำต้นที่ 1.30 ม. (ซม.) *"] || item["เส้นรอบวง"]) || 0, 
            
            health: healthKey,
            surveyor: item["ผู้สำรวจ *"] || item["ผู้สำรวจ"] || "ไม่ระบุนาม",
            note: item["บันทึกเพิ่มเติม"] || "-",
            icon: ICONS[treeType] || "🌳"
          };
        });
        
        console.log("🔄 ซิงค์ข้อมูลคลาวด์กลับเข้าหน้าเว็บสำเร็จ จำนวน:", trees.length);
        refresh(); // 💡 สั่งรันคำสั่งวาดการ์ด วาดสถิติ และกราฟสรุปผลใหม่ทันทีด้วยข้อมูลจริง!
      }
    })
    .catch(error => {
      console.error("เกิดข้อผิดพลาดในการโหลดข้อมูลกลับหน้าเว็บ:", error);
    });
}

/* ===== สถิติ Hero ===== */
function renderStats(){
  const total = trees.length;
  const species = new Set(trees.map(t=>t.name)).size;
  const carbon = trees.reduce((s,t)=>s+co2(t.girth,t.height),0);
  const good = trees.filter(t=>t.health==="good").length;
  animate(document.getElementById("stTotal"), total);
  animate(document.getElementById("stSpecies"), species);
  animate(document.getElementById("stCarbon"), Math.round(carbon));
  document.getElementById("stHealth").textContent = (total ? Math.round(good/total*100) : 0) + "%";
}
function animate(el,target){
  if (!el) return;
  let n=0, step=Math.max(1,Math.ceil(target/30));
  const id=setInterval(()=>{ n+=step; if(n>=target){n=target;clearInterval(id);} el.textContent=n.toLocaleString();},30);
}
// =========================================================
// 🌳 ส่วนที่ 2: ระบบแสดงผลฟอร์มและตัวกรอง (ครึ่งล่าง)
// =========================================================

/* ===== การ์ดฐานข้อมูล ===== */
function renderTrees(){
  const searchEl = document.getElementById("searchBox");
  if (!searchEl) return;
  const q = searchEl.value.trim().toLowerCase();
  const ty = document.getElementById("filterType").value;
  const he = document.getElementById("filterHealth").value;

  const list = trees.filter(t=>{
    const hit = (t.name+t.sci+t.code+t.zone).toLowerCase().includes(q);
    return hit && (!ty || t.type===ty) && (!he || t.health===he);
  });

  document.getElementById("resultInfo").textContent = `พบข้อมูล ${list.length} ต้น จากทั้งหมด ${trees.length} ต้น`;
  const grid = document.getElementById("treeGrid");
  grid.innerHTML = list.length ? list.map(t=>`
    <article class="tree-card" data-code="${t.code}">
      <div class="tc-top"><span class="code">${t.code}</span>${t.icon}</div>
      <div class="tc-body">
        <h4>${t.name}</h4>
        <p class="sci">${t.sci}</p>
        <div class="meta"><span>📍 ${t.zone}</span><span>↕ ${t.height} ม.</span></div>
        <div class="meta"><span>🌲 ${t.type}</span><span>⌀ ${dbh(t.girth).toFixed(1)} ซม.</span></div>
        <span class="badge ${t.health}">${HEALTH_TH[t.health]}</span>
      </div>
    </article>`).join("") : `<p style="grid-column:1/-1;text-align:center;color:#889;padding:40px 0">😢 ไม่พบข้อมูล</p>`;

  grid.querySelectorAll(".tree-card").forEach(c=> c.onclick = ()=> openModal(c.dataset.code));
}

/* ===== Modal หน้าต่างป๊อปอัป ===== */
function openModal(code){
  const t = trees.find(x=>x.code===code); if(!t) return;
  document.getElementById("modalBody").innerHTML = `
    <div style="font-size:3rem;text-align:center">${t.icon}</div>
    <h3 style="text-align:center">${t.name}</h3>
    <p style="text-align:center;font-style:italic;color:#889;margin-bottom:18px">${t.sci}</p>
    <div class="info-line"><span>รหัสต้นไม้</span><b>${t.code}</b></div>
    <div class="info-line"><span>ประเภท</span><b>${t.type}</b></div>
    <div class="info-line"><span>บริเวณ</span><b>${t.zone}</b></div>
    <div class="info-line"><span>ความสูง</span><b>${t.height} เมตร</b></div>
    <div class="info-line"><span>เส้นรอบวง</span><b>${t.girth} ซม.</b></div>
    <div class="info-line"><span>DBH</span><b>${dbh(t.girth).toFixed(1)} ซม.</b></div>
    <div class="info-line"><span>CO₂ ที่กักเก็บ</span><b>${co2(t.girth,t.height).toFixed(1)} กก.</b></div>
    <div class="info-line"><span>สุขภาพ</span><b class="badge ${t.health}" style="margin:0">${HEALTH_TH[t.health]}</b></div>
    <div class="info-line"><span>ผู้สำรวจ</span><b>${t.surveyor}</b></div>
    <p style="margin-top:14px;font-size:.88rem;color:#556">📝 ${t.note}</p>`;
  document.getElementById("modal").classList.add("show");
}
document.getElementById("modalClose").onclick = ()=> document.getElementById("modal").classList.remove("show");
document.getElementById("modal").onclick = e=>{ if(e.target.id==="modal") e.currentTarget.classList.remove("show"); };

/* ===== Dashboard กราฟสรุปผล ===== */
function renderDash(){
  const chartZone = document.getElementById("chartZone"); if (!chartZone) return;
  const zones = {}; trees.forEach(t => zones[t.zone] = (zones[t.zone]||0)+1);
  const max = Math.max(1, ...Object.values(zones));
  chartZone.innerHTML = Object.entries(zones).map(([z,n])=>`
    <div class="bar-row"><div style="display:flex;justify-content:space-between"><span>${z}</span><b>${n} ต้น</b></div>
    <div class="bar-track"><div class="bar-fill" style="width:${n/max*100}%"></div></div></div>`).join("");

  const colors = {good:"#2e8b57",fair:"#e0a020",bad:"#d9534f"};
  document.getElementById("chartHealth").innerHTML = ["good","fair","bad"].map(h=>{
    const n = trees.filter(t=>t.health===h).length; const pct = trees.length ? (n/trees.length*100) : 0;
    return `<div class="bar-row"><div style="display:flex;justify-content:space-between"><span>${HEALTH_TH[h]}</span><b>${n} ต้น (${pct.toFixed(0)}%)</b></div>
    <div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${colors[h]}"></div></div></div>`; }).join("");
}

/* ===== ฟอร์มสำรวจ (ดักส่งค่าเข้า Google Sheets) ===== */
const form = document.getElementById("treeForm");
if (form) {
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
    let selectedHealth = "สมบูรณ์ดี";
    if (f.get("health") === "fair") selectedHealth = "ต้องเฝ้าระวัง";
    if (f.get("health") === "bad") selectedHealth = "ต้องดูแลด่วน";

    const record = {
     "timestamps": new Date().toLocaleString("th-TH"),
     "ชื่อต้นไม้(ไทย) *": f.get("name"),
     "ชื่อวิทยาศาสตร์": f.get("sci"),
     "ประเภท *": f.get("type"),           
     "บริเวณที่พบ *": f.get("zone"),       
     "ความสูงโดยประมาณ (เมตร) *": f.get("height"),  
     "เส้นรอบวงลำต้นที่ 1.30 ม. (ซม.) *": f.get("girth"),
     "dbh(เส้นผ่านศูนย์กลางเพียงอก)": dbh(+f.get("girth")).toFixed(1), 
     "มวลชีวภาพ": bio(+f.get("girth"), +f.get("height")).toFixed(1),
     "co2": co2(+f.get("girth"), +f.get("height")).toFixed(1),
     "สุขภาพต้นไม้ *": selectedHealth,    
     "ผู้สำรวจ *": f.get("surveyor"),     
     "บันทึกเพิ่มเติม": f.get("note")
    };

    const submitBtn = form.querySelector('button[type="submit"]');
    const oldText = submitBtn.innerHTML; submitBtn.disabled = true; submitBtn.innerHTML = "⏳ กำลังบันทึก...";

    data.images = JSON.stringify(treeImages);

    fetch(SHEETDB_URL, {
      method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" },
      body: JSON.stringify({ data: [record] })
    })
    .then(res => { if (!res.ok) throw new Error(); return res.json(); })
    .then(() => {
      alert(`🎉 บันทึกข้อมูลสำเร็จแล้ว!`); form.reset();
      treeImages = [];
renderPreview();

      ["cDbh","cBio","cCo2"].forEach(id => document.getElementById(id).textContent="– กก.");
      loadTreeData(); // รีโหลดเพื่อดึงข้อมูลใหม่มาโชว์ทันที
    })
    .catch(() => alert("❌ เกิดข้อผิดพลาด กรุณาเช็กสิทธิ์แชร์หรือลิ้งก์ API"))
    .finally(() => { submitBtn.disabled = false; submitBtn.innerHTML = oldText; });
  });
}

/* ===== ส่งออก CSV ===== */
if (document.getElementById("btnExport")) {
  document.getElementById("btnExport").onclick = ()=>{
    const head = "รหัส,ชื่อ,ชื่อวิทยาศาสตร์,ประเภท,บริเวณ,ความสูง(ม.),เส้นรอบวง(ซม.),DBH(ซม.),CO2(กก.),สุขภาพ,ผู้สำรวจ,หมายเหตุ";
    const rows = trees.map(t=>[t.code,t.name,t.sci,t.type,t.zone,t.height,t.girth,dbh(t.girth).toFixed(1),co2(t.girth,t.height).toFixed(1),HEALTH_TH[t.health],t.surveyor,(t.note||"").replace(/,/g,"；")].join(","));
    const blob = new Blob(["\uFEFF"+head+"\n"+rows.join("\n")],{type:"text/csv;charset=utf-8"});
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "ฐานข้อมูลต้นไม้_ท่าม่วง.csv"; a.click();
  };
}

/* ===== ควบคุมตัวกรองค้นหาเบื้องต้น ===== */
["searchBox","filterType","filterHealth"].forEach(id=>{
  const el = document.getElementById(id); if(el) el.addEventListener("input", renderTrees);
});
if (document.getElementById("btnReset")) {
  document.getElementById("btnReset").onclick = ()=>{
    document.getElementById("searchBox").value = ""; document.getElementById("filterType").selectedIndex = 0; document.getElementById("filterHealth").selectedIndex = 0; renderTrees();
  };
}

/* ============ ระบบอัปโหลดรูปภาพ ============ */
let treeImages = [];
const fileInput = document.getElementById('fileInput');
const uploadBox = document.getElementById('uploadBox');
const previewContainer = document.getElementById('previewContainer');

if (uploadBox) {
  uploadBox.addEventListener('click', () => fileInput.click());
  ['dragover','dragleave','drop'].forEach(ev =>
    uploadBox.addEventListener(ev, e => {
      e.preventDefault();
      uploadBox.classList.toggle('dragover', ev === 'dragover');
      if (ev === 'drop') handleFiles(e.dataTransfer.files);
    })
  );
  fileInput.addEventListener('change', e => handleFiles(e.target.files));
}

function handleFiles(files){
  [...files].forEach(file => {
    if (!file.type.startsWith('image/')) return;
    resizeImage(file, 400, 0.4).then(url => { treeImages.push(url); renderPreview(); });
  });
  fileInput.value = '';
}

function resizeImage(file, maxSize, quality){
  return new Promise(resolve => {
    const reader = new FileReader();
    reader.onload = e => {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height));
        const c = document.createElement('canvas');
        c.width = img.width * scale; c.height = img.height * scale;
        c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', quality));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function renderPreview(){
  previewContainer.innerHTML = treeImages.map((src, i) => `
    <div class="preview-item">
      <img src="${src}" alt="รูปต้นไม้ ${i+1}">
      <button type="button" onclick="removeImage(${i})">×</button>
    </div>`).join('');
}

function removeImage(i){ treeImages.splice(i, 1); renderPreview(); }

// เริ่มต้นระบบดึงข้อมูลทันทีเมื่อเปิดหน้าเว็บ
document.addEventListener("DOMContentLoaded", loadTreeData);
