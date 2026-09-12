/* ===== ข้อมูลต้นไม้ตั้งต้น (ว่างเปล่าพร้อมเริ่มใช้งานจริง) ===== */
const SEED = []; 

const KEY = "***_***********_**";
let trees = load();

function load(){
  try{ const s = localStorage.getItem(KEY); return s ? JSON.parse(s) : [...SEED]; }
  catch(e){ return [...SEED]; }
}
function save(){ localStorage.setItem(KEY, JSON.stringify(trees)); }

/* ===== (ส่วนอื่นๆ ของโค้ดคงเดิมทั้งหมด ตั้งแต่สูตรคำนวณ จนถึง renderMap) ===== */
/* ... วางโค้ดเดิมของคุณตั้งแต่บรรทัด "const dbh = ..." จนถึง "renderMap();" ไว้ตรงนี้ครับ ... */

/* ===== แก้ไขการ์ดฐานข้อมูลให้แสดงข้อความเวลาว่าง ===== */
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
    : `<div style="grid-column:1/-1;text-align:center;padding:60px 20px;color:#666;">
        <div style="font-size:3rem;margin-bottom:10px">🌱</div>
        <h3>ยังไม่มีข้อมูลในระบบ</h3>
        <p>เริ่มทำการสำรวจต้นไม้ต้นแรกของคุณโดยกรอกข้อมูลที่เมนู "บันทึกการสำรวจ"</p>
      </div>`;

  grid.querySelectorAll(".tree-card").forEach(c=>
    c.onclick = ()=> openModal(c.dataset.code));
}

/* ... วางโค้ดที่เหลือต่อจากนี้จนจบไฟล์ได้เลยครับ ... */
