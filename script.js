// =========================================================
// 🌳 ส่วนที่ 1: ระบบจัดการข้อมูลคลาวด์และแสดงผล
// =========================================================

// 💡 แก้ไขบั๊กตัวสะกดคืนลิงก์ดึงข้อมูลจริงกลับมาแสดงพรีวิวบนหน้าเว็บ
const SHEETDB_URL = "https://sheetdb.io/api/v1/m7x855pegxfiw";

// ⚠️ เว็บแอป URL ของ Google Apps Script (ตรวจสอบและใช้ลิงก์ปัจจุบันของคุณ)
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbwlbBqIkNleNEw_BHYL19p1YhUPmzJaxF5u3WTZMtMFP5C3uiu9mPBmYd71j63xD6O_/exec";

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
        trees = data.map((item, index) => {
          let healthKey = "good";
          const hValue = item["สุขภาพต้นไม้*"] || item["สุขภาพต้นไม้ *"] || item["สุขภาพ"] || "";
          if (hValue.includes("เฝ้าระวัง")) healthKey = "fair";
          if (hValue.includes("ด่วน") || hValue.includes("ผุ")) healthKey = "bad";

          const treeType = item["ประเภท*"] || item["ประเภท *"] || item["ประเภท"] || "ไม้ยืนต้น";
          const treeName = item["ชื่อต้นไม้(ไทย)*"] || item["ชื่อต้นไม้(ไทย) *"] || item["ชื่อต้นไม้"] || "ไม่ระบุชื่อ";

          return {
            code: item["นิทรรศการยุค"] || `TMR-${String(index + 1).padStart(3, "0")}`, 
            name: treeName,
            sci: item["ชื่อวิทยาศาสตร์"] || "-",
            type: treeType,
            zone: item["บริเวณที่พบ*"] || item["บริเวณที่พบ *"] || "ไม่ระบุบริเวณ",
            
            height: parseFloat(item["ความสูงโดยประมาณ(เมตร)*"] || item["ความสูงโดยประมาณ (เมตร) *"] || 0), 
            girth: parseFloat(item["เส้นรอบวงลำต้นที่ 1.30 ม. (ซม.) *"] || item["เส้นรอบวงลำต้นที่ 1.30 ม."]) || 0, 
            
            health: healthKey,
            surveyor: item["ผู้สำรวจ*"] || item["ผู้สำรวจ *"] || "ไม่ระบุนาม",
            note: item["บันทึกเพิ่มเติม"] || "-",
            icon: ICONS[treeType] || "🌳"
          };
        });
        
        console.log("🔄 ซิงค์ข้อมูลสำเร็จ จำนวน:", trees.length);
        refresh(); 
      }
    })
    .catch(error => console.error("เกิดข้อผิดพลาดในการโหลดข้อมูล:", error));
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
  
  const healthEl = document.getElementById("stHealth");
  if(healthEl) healthEl.textContent = (total ? Math.round(good/total*100) : 0) + "%";
}

function animate(el,target){
  if (!el) return;
  let n=0, step=Math.max(1,Math.ceil(target/30));
  const id=setInterval(()=>{ n+=step; if(n>=target){n=target;clearInterval(id);} el.textContent=n.toLocaleString();},30);
}

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
// =========================================================
  // --- เริ่มกระบวนการย่อสเกลรูปภาพจากกล้องถ่ายมือถือลดขนาดไฟล์ ---
  const reader = new FileReader();
  reader.readAsDataURL(files[0]); // ล็อกให้ดึงไฟล์ภาพแรกสุดที่ถูกต้อง
  reader.onload = function (event) {
    const img = new Image();
    img.src = event.target.result;
    img.onload = async function () {
      const canvas = document.createElement("canvas");
      const MAX_WIDTH = 1000; 
      let width = img.width;
      let height = img.height;

      if (width > MAX_WIDTH) {
        height *= MAX_WIDTH / width;
        width = MAX_WIDTH;
      }
      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);

      // ย่อขนาดไฟล์และคุณภาพภาพ
      const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
      
      // 💡 ปรับการดึงรหัสตรงนี้ใหม่: แยกหัวข้อล้าง metadata แล้วดึง text บริสุทธิ์ลำดับที่ 1 แบบชัวร์ๆ
      const base64Parts = compressedBase64.split(",");
      const pureBase64Text = base64Parts[1]; 

      // ผูก Payload ห่อข้อมูลนำส่งแยก 15 ตัวแปร
      const payload = {
        treeNumber: treeNumber,
        treeName: f.get("name") || "",
        scienceName: f.get("sci") || "-",
        treeType: f.get("type") || "",
        locationFound: f.get("zone") || "",
        approxHeight: f.get("height") || "0",
        girthSize: f.get("girth") || "0",
        dbh: dbhText,
        biomass: bioText,
        co2: co2Text,
        treeHealth: selectedHealth,
        coordinator: f.get("surveyor") || "",
        note: f.get("note") || "-",
        imageBase64: pureBase64Text, // 💡 ส่งตัวหนังสือข้อความแท้ๆ ไม่ส่งอะเรย์ติดไป
        imageType: "image/jpeg"
      };

      try {
        const response = await fetch(GAS_WEB_APP_URL, {
          method: "POST",
          body: JSON.stringify(payload)
        });

        const result = await response.json();

        if (result.status === "success") {
          alert("🎉 บันทึกข้อมูลและอัปโหลดรูปภาพลง Google Sheets สำเร็จ!");
          form.reset();
          const preview = document.getElementById("previewContainer");
          if(preview) preview.innerHTML = "";
          ["cDbh","cBio","cCo2"].forEach(id => document.getElementById(id).textContent="– กก.");
          loadTreeData(); 
        } else {
          alert("เกิดข้อผิดพลาดจากเซิร์ฟเวอร์: " + result.message);
        }
      } catch (error) {
        console.error(error);
        alert("❌ การเชื่อมต่อล้มเหลว กรุณาตรวจสอบอินเทอร์เน็ตหรือลิงก์ Web App");
      } finally {
        submitBtn.disabled = false; 
        submitBtn.innerHTML = oldText;
      }
    };
  };
