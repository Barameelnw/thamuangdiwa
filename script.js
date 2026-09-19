// =========================================================
// 🌳 ส่วนที่ 1: ระบบจัดการข้อมูลคลาวด์และแสดงผลคลาวด์
// =========================================================

// 💡 แมปช่องลิงก์ API สำหรับดึงข้อมูลจริงกลับมาวาดพรีวิวบนหน้าจอเว็บ
const SHEETDB_URL = "https://sheetdb.io/api/v1/m7x855pegxfiw";

// ⚠️ เว็บแอป URL ของ Google Apps Script ปัจจุบันของคุณ (ตรงล็อกเป๊ะ!)
const GAS_WEB_APP_URL = "https://script.google.com/macros/s/AKfycbzcfcRyi69xIR1YICOvTFnWAsdRDDhA3M7lkxGxwIN7X33FcQaj4zn2vsjhE5C-TJyM/exec";

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
          const hValue = item["สุขภาพต้นไม้ *"] || "";
          if (hValue.includes("เฝ้าระวัง")) healthKey = "fair";
          if (hValue.includes("ด่วน") || hValue.includes("ผุ")) healthKey = "bad";

          const treeType = item["ประเภท *"] || "ไม้ยืนต้น";
          const treeName = item["ชื่อต้นไม้(ไทย) *"] || "ไม่ระบุชื่อ";

          return {
            // ให้การ์ดหน้าเว็บแสดงรหัสตามข้อมูลลำดับแถวพรีวิว
            code: `TMR-${String(index + 1).padStart(3, "0")}`, 
            name: treeName,
            sci: item["ชื่อวิทยาศาสตร์"] || "-",
            type: treeType,
            zone: item["บริเวณที่พบ *"] || "ไม่ระบุบริเวณ",
            
            height: parseFloat(item["ความสูงโดยประมาณ (เมตร) *"] || 0), 
            girth: parseFloat(item["เส้นรอบวงลำต้นที่ 1.30 ม. (ซม.) *"]) || 0, 
            
            health: healthKey,
            surveyor: item["ผู้สำรวจ *"] || "ไม่ระบุนาม",
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
// 🧮 ส่วนที่ 2: ระบบคำนวณเรียลไทม์, พรีวิว และส่งข้อมูลเข้าคลาวด์
// =========================================================
 
const form = document.getElementById("treeForm");
const fileInput = document.getElementById("fileInput");
const uploadBox = document.getElementById("uploadBox");

if (form) {
  // คำนวณค่า DBH และคาร์บอนแบบพิมพ์ไปขึ้นโชว์ไปอัตโนมัติ
  form.addEventListener("input", ()=>{
    const g = +form.girth.value, h = +form.height.value;
    if(g>0 && h>0){
      document.getElementById("cDbh").textContent = dbh(g).toFixed(1)+" ซม.";
      document.getElementById("cBio").textContent = bio(g,h).toFixed(1)+" กก.";
      document.getElementById("cCo2").textContent = co2(g,h).toFixed(1)+" กก.";
    } else {
      document.getElementById("cDbh").textContent = "– ซม.";
      document.getElementById("cBio").textContent = "– กก.";
      document.getElementById("cCo2").textContent = "– กก.";
    }
  });
}

// 💡 แก้ไขบั๊กสั่งเปิดช่องเลือกไฟล์: ผูกเหตุการณ์กดที่กล่องบราวเซอร์ให้เรียกใช้ fileInput ชัดเจน
uploadBox?.addEventListener("click", () => {
  if (fileInput) fileInput.click();
});

// ✨ ระบบดึงรูปขึ้นพรีวิวตามคลาสแผ่นการ์ดจริงใน style.css (.preview-item) 
fileInput?.addEventListener("change", () => {
  const previewContainer = document.getElementById("previewContainer");
  if (!previewContainer) return;
  
  previewContainer.innerHTML = ""; // ล้างค่ารูปพรีวิวเก่าออกก่อนเมื่อมีการเลือกรูปใหม่

  if (fileInput.files && fileInput.files.length > 0) {
    const file = fileInput.files[0]; // 💡 แก้บั๊กการดึงไฟล์เดี่ยวลำดับแรกสุด
    
    // แปลงขนาดไฟล์ภาพดิบจริงจากคอมฯ/มือถือ ให้เป็น Megabytes (MB)
    const fileSizeMB = (file.size / (1024 * 1024)).toFixed(2);
    
    const reader = new FileReader();
    reader.onload = function(e) {
      // วาดภาพลงล็อกตามโครงสร้างคลาส (.preview-item) ใน CSS ของคุณ พร้อมแจ้งสเปกขนาดรูปใต้กล่อง
      previewContainer.innerHTML = `
        <div style="width: 100%;">
          <div class="preview-item">
            <img src="${e.target.result}" alt="Preview ต้นไม้">
            <button type="button" onclick="clearSelectedImage()">✕</button>
          </div>
          <div style="margin-top: 8px; font-size: 0.82rem; color: #556; line-height: 1.4;">
            <span style="color: var(--green2); font-weight: 600;">📸 เลือกสำเร็จ:</span> ${file.name}
            <br><span style="color: #778;">ขนาดไฟล์ต้นฉบับ: ${fileSizeMB} MB</span>
            <span style="color: #007bff; font-weight: 600;">(ระบบจะช่วยบีบอัดไฟล์ภาพให้เซฟข้อมูลไวขึ้นอัตโนมัติ)</span>
          </div>
        </div>
      `;
    };
    reader.readAsDataURL(file);
  }
});

// ฟังก์ชันสำหรับปุ่มกากบาท (✕) บนตัวรูปพรีวิวเพื่อล้างรูปที่เลือกทิ้ง
function clearSelectedImage() {
  if(fileInput) fileInput.value = ""; 
  const previewContainer = document.getElementById("previewContainer");
  if(previewContainer) previewContainer.innerHTML = ""; 
}

// =========================================================
// 💾 ส่วนที่ 3: จัดส่งฟอร์ม บีบอัดภาพ และบันทึกข้อมูล 14 คอลัมน์
// =========================================================
form?.addEventListener("submit", async function(e) {
  e.preventDefault(); 
  
  const submitBtn = form.querySelector('button[type="submit"]');
  const oldText = submitBtn.innerHTML; 
  submitBtn.disabled = true; 
  submitBtn.innerHTML = "⏳ กำลังบันทึก...";

  const f = new FormData(form);
  
  let selectedHealth = "สมบูรณ์ดี";
  if (f.get("health") === "fair") selectedHealth = "ต้องเฝ้าระวัง";
  if (f.get("health") === "bad") selectedHealth = "ต้องดูแลด่วน";

  const dbhText = document.getElementById("cDbh").textContent.replace(" ซม.", "").trim();
  const co2Text = document.getElementById("cCo2").textContent.replace(" กก.", "").trim();

  // ดักจับไฟล์รูปภาพจากหน้าจอ
  if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
    alert("❌ กรุณาเลือกรูปภาพต้นไม้ก่อนกดบันทึกข้อมูลด้วยครับสหาย!");
    submitBtn.disabled = false; 
    submitBtn.innerHTML = oldText;
    return;
  }

  // --- เริ่มกระบวนการย่อสเกลรูปภาพจากกล้องถ่ายมือถือลดขนาดไฟล์ ---
  const reader = new FileReader();
  reader.readAsDataURL(fileInput.files[0]); // 💡 ปรับการส่งดึงข้อมูลรูปแรกให้สอดคล้องกัน
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

      const compressedBase64 = canvas.toDataURL("image/jpeg", 0.75);
      
      // 💡 จุดแกะเอาข้อความ Base64 แท้ ๆ ตำแหน่ง [1] เพื่อป้องกันบั๊กวัตถุ Blob
      const base64String = compressedBase64.split(",")[1]; 

      // ผูก Payload ห่อข้อมูลนำส่งแยก 14 ตัวแปรเข้าหลังบ้าน
            // 💡 ผูก Payload ห่อข้อมูลนำส่งแยก 14 ตัวแปรเข้าหลังบ้านให้ตรงแถวตารางพอดีเป๊ะ
      const payload = {
        treeName: f.get("name") || "",
        scienceName: f.get("sci") || "-",
        treeType: f.get("type") || "",
        locationFound: f.get("zone") || "",
        approxHeight: f.get("height") || "0",
        girthSize: f.get("girth") || "0",
        dbh: dbhText,
        co2: co2Text,
        treeHealth: selectedHealth,
        coordinator: f.get("surveyor") || "",
        note: f.get("note") || "-",
        
        // ❌ ของเดิม: imageBase64: base64String,
        //  ของใหม่ที่แก้ไข (เติม [1] ข้างหลังเพื่อดึงรหัสตัวหนังสือแท้ๆ ไปแก้บั๊ก Blob):
        imageBase64: base64String[1], 
        
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
});

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
    document.getElementById("searchBox").value = ""; 
    document.getElementById("filterType").selectedIndex = 0; 
    document.getElementById("filterHealth").selectedIndex = 0; 
    renderTrees();
  };
}

// เริ่มต้นโหลดข้อมูลแสดงผลการ์ดทันทีเมื่อเปิดหน้าเว็บครั้งแรก
window.addEventListener("DOMContentLoaded", loadTreeData);
