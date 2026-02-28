// ─── DATABASE (localStorage) ───
const DB = {
  get: (k) => { try { return JSON.parse(localStorage.getItem(k)) || null; } catch { return null; } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
  getUsers: () => DB.get('el_users') || [],
  saveUsers: (u) => DB.set('el_users', u),
  getBookings: () => DB.get('el_bookings') || [],
  saveBookings: (b) => DB.set('el_bookings', b),
  getCurrentUser: () => DB.get('el_current_user'),
  setCurrentUser: (u) => DB.set('el_current_user', u),
  clearCurrentUser: () => localStorage.removeItem('el_current_user'),
};

// ─── STATE ───
let currentStep = 1;
let booking = { location: null, machine: null, date: null, time: null };
let cancelTarget = null;
let currentQRData = null;

// ─── DATA ───
const locations = [
  { id: 1, name: 'МУИС — 3-р байр', icon: '🏛️', machines: 6, free: 3 },
  { id: 2, name: 'ШУТИС — А байр', icon: '⚙️', machines: 4, free: 2 },
  { id: 3, name: 'МУБИС — 1-р байр', icon: '📚', machines: 4, free: 4 },
  { id: 4, name: 'ХААИС — Дотуур байр', icon: '🌾', machines: 3, free: 1 },
  { id: 5, name: 'Лайм угаалга — Хан-Уул', icon: '🍋', machines: 8, free: 5 },
  { id: 6, name: 'Клин угаалга — Баянзүрх', icon: '✨', machines: 6, free: 3 },
];

const machines = [
  { id: 1, name: 'Машин #1 — Samsung 7кг', status: 'free', progress: 0 },
  { id: 2, name: 'Машин #2 — LG 8кг', status: 'busy', progress: 65, remaining: '38 мин' },
  { id: 3, name: 'Машин #3 — Samsung 7кг', status: 'soon', progress: 85, remaining: '15 мин' },
  { id: 4, name: 'Машин #4 — Haier 6кг', status: 'free', progress: 0 },
];

const timeSlots = ['08:00','08:30','09:00','09:30','10:00','10:30','11:00','11:30','13:00','13:30','14:00','14:30','15:00','15:30','16:00','16:30'];
const takenSlots = ['09:00','10:30','13:00','15:00'];

const today = new Date();
const dates = Array.from({ length: 5 }, (_, i) => {
  const d = new Date(today);
  d.setDate(today.getDate() + i);
  return d;
});

function formatDate(d) {
  const days = ['Ня', 'Да', 'Мя', 'Лх', 'Пү', 'Ба', 'Бя'];
  return `${days[d.getDay()]} ${d.getDate()}/${d.getMonth() + 1}`;
}

// ─── PAGE TRANSITION ───
function triggerTransition(callback) {
  const pt = document.getElementById('pageTransition');
  pt.classList.add('in');
  setTimeout(() => {
    if (callback) callback();
    pt.classList.remove('in');
    pt.classList.add('out');
    setTimeout(() => pt.classList.remove('out'), 600);
  }, 500);
}

function smoothNav(hash) {
  const el = document.querySelector(hash);
  if (!el) return;
  const pt = document.getElementById('pageTransition');
  pt.style.opacity = '0.3';
  pt.classList.add('in');
  setTimeout(() => {
    el.scrollIntoView({ behavior: 'smooth' });
    pt.classList.remove('in');
    pt.style.opacity = '';
    pt.classList.add('out');
    setTimeout(() => pt.classList.remove('out'), 400);
  }, 200);
}

// ─── QR GENERATION ───
function generateQR(containerId, text, size = 128) {
  const el = document.getElementById(containerId);
  if (!el) return;
  el.innerHTML = '';
  try {
    new QRCode(el, {
      text: text,
      width: size,
      height: size,
      colorDark: '#080E2A',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) {
    el.innerHTML = `<div style="width:${size}px;height:${size}px;background:#EEF2FF;border-radius:8px;display:flex;align-items:center;justify-content:center;font-size:.7rem;color:#8B93B8;text-align:center;padding:8px;">QR код үүсгэхэд алдаа гарлаа</div>`;
  }
}

function showQRModal(code, title, desc) {
  document.getElementById('qrModalTitle').textContent = title;
  document.getElementById('qrModalDesc').textContent = desc;
  document.getElementById('qrModalCode').textContent = code;
  document.getElementById('qrModalContainer').innerHTML = '';
  currentQRData = { code, title };
  try {
    new QRCode(document.getElementById('qrModalContainer'), {
      text: `https://easy-laundry.mn/verify/${code}`,
      width: 200,
      height: 200,
      colorDark: '#080E2A',
      colorLight: '#FFFFFF',
      correctLevel: QRCode.CorrectLevel.M
    });
  } catch (e) {}
  document.getElementById('qrModal').classList.add('open');
}

function closeQRModal() {
  document.getElementById('qrModal').classList.remove('open');
}

function downloadQRModal() {
  const canvas = document.querySelector('#qrModalContainer canvas');
  if (!canvas) return showToast('QR код олдсонгүй', 'error');
  const link = document.createElement('a');
  link.download = `easy-laundry-qr-${currentQRData?.code || 'code'}.png`;
  link.href = canvas.toDataURL();
  link.click();
  showToast('QR код хадгалагдлаа! 📥');
}

function showAppQR(platform) {
  const names = { ios: 'App Store', android: 'Google Play' };
  showQRModal(
    platform.toUpperCase() + '-DOWNLOAD',
    `📲 ${names[platform]}-аас татах`,
    `QR кодыг уншуулж аппыг татаж авна уу`
  );
  return false;
}

// ─── CURSOR ───
const cursor = document.getElementById('cursor');
const ring = document.getElementById('cursorRing');
document.addEventListener('mousemove', e => {
  cursor.style.left = e.clientX - 5 + 'px';
  cursor.style.top = e.clientY - 5 + 'px';
  ring.style.left = e.clientX - 18 + 'px';
  ring.style.top = e.clientY - 18 + 'px';
});
document.addEventListener('mousedown', () => {
  cursor.style.transform = 'scale(1.5)';
  ring.style.transform = 'scale(.8)';
});
document.addEventListener('mouseup', () => {
  cursor.style.transform = 'scale(1)';
  ring.style.transform = 'scale(1)';
});

// ─── TOAST ───
function showToast(msg, type = 'success') {
  const t = document.getElementById('toast');
  t.innerHTML = (type === 'success' ? '✅' : '❌') + ' ' + msg;
  t.className = 'toast ' + type + ' show';
  setTimeout(() => t.classList.remove('show'), 3500);
}

// ─── MODALS ───
function openModal(id) { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// ─── AUTH ───
let activeTab = 'login';

function switchTab(tab) {
  activeTab = tab;
  document.getElementById('login-form').style.display = tab === 'login' ? 'block' : 'none';
  document.getElementById('register-form').style.display = tab === 'register' ? 'block' : 'none';
  document.querySelectorAll('.modal-tab').forEach((t, i) => {
    t.classList.toggle('active', (i === 0 && tab === 'login') || (i === 1 && tab === 'register'));
  });
}

function validateEmail(e) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
}

function handleLogin() {
  const email = document.getElementById('login-email').value.trim();
  const pass = document.getElementById('login-pass').value;
  let ok = true;
  if (!validateEmail(email)) { showErr('login-email-err', 'login-email'); ok = false; }
  if (!pass) { showErr('login-pass-err', 'login-pass'); ok = false; }
  if (!ok) return;
  const user = DB.getUsers().find(u => u.email === email && u.password === pass);
  if (!user) {
    showErr('login-email-err', 'login-email', 'Имэйл эсвэл нууц үг буруу байна');
    return showToast('Нэвтрэх мэдээлэл буруу байна', 'error');
  }
  DB.setCurrentUser(user);
  closeModal('authModal');
  updateUserUI(user);
  showToast(`Тавтай морилно уу, ${user.fname}! 🎉`);
  renderMyBookings();
}

function handleGoogleAuth() {
  const mockUser = {
    fname: 'Google', lname: 'Хэрэглэгч',
    email: 'google@gmail.com', university: 'МУИС',
    id: 'g_' + Date.now()
  };
  DB.setCurrentUser(mockUser);
  closeModal('authModal');
  updateUserUI(mockUser);
  showToast('Google-ээр амжилттай нэвтэрлээ! 🎉');
}

function handleRegister() {
  const fname = document.getElementById('reg-fname').value.trim();
  const email = document.getElementById('reg-email').value.trim();
  const univ = document.getElementById('reg-univ').value;
  const pass = document.getElementById('reg-pass').value;
  let ok = true;
  if (!fname) { showErr('reg-fname-err', 'reg-fname'); ok = false; }
  if (!validateEmail(email)) { showErr('reg-email-err', 'reg-email'); ok = false; }
  if (!univ) { showErr('reg-univ-err', 'reg-univ'); ok = false; }
  if (pass.length < 8) { showErr('reg-pass-err', 'reg-pass', '8-аас дээш тэмдэгт оруулна уу'); ok = false; }
  if (!ok) return;
  const users = DB.getUsers();
  if (users.find(u => u.email === email)) return showToast('Энэ имэйл аль хэдийн бүртгэлтэй байна', 'error');
  const user = {
    id: Date.now().toString(),
    fname,
    lname: document.getElementById('reg-lname').value.trim(),
    email,
    university: univ,
    password: pass,
    createdAt: new Date().toISOString()
  };
  users.push(user);
  DB.saveUsers(users);
  DB.setCurrentUser(user);
  closeModal('authModal');
  updateUserUI(user);
  showToast(`Бүртгэл амжилттай! Тавтай морилно уу, ${fname}! 🎉`);
}

function showErr(errId, inputId, msg) {
  const el = document.getElementById(errId);
  const inp = document.getElementById(inputId);
  if (msg) el.textContent = msg;
  el.classList.add('show');
  inp.classList.add('error');
  setTimeout(() => { el.classList.remove('show'); inp.classList.remove('error'); }, 3000);
}

function logout() {
  DB.clearCurrentUser();
  document.getElementById('userInfoBar').classList.remove('show');
  document.getElementById('loginBtn').style.display = '';
  document.getElementById('myBookingsSection').style.display = 'none';
  showToast('Амжилттай гарлаа');
}

function updateUserUI(user) {
  document.getElementById('userInfoBar').classList.add('show');
  document.getElementById('loginBtn').style.display = 'none';
  document.getElementById('userName').textContent = user.fname;
  document.getElementById('userAvatar').textContent = user.fname.charAt(0).toUpperCase();
  document.getElementById('myBookingsSection').style.display = 'block';
  renderMyBookings();
}

// ─── BOOKING FLOW ───
function animatePanel(callback) {
  const panel = document.getElementById('bookingPanel');
  panel.classList.add('transitioning');
  setTimeout(() => {
    if (callback) callback();
    panel.classList.remove('transitioning');
  }, 300);
}

function renderStep1() {
  return `<div class="booking-panel-title">📍 Байршил сонгоно уу</div>
<div class="booking-panel-sub">Та угаалга хийх байр эсвэл угаалгийн газрыг сонгоно уу</div>
<div class="location-grid">
${locations.map(l => `<div class="loc-card${booking.location?.id === l.id ? ' selected' : ''}" onclick="selectLocation(${l.id})">
  <div class="loc-icon">${l.icon}</div>
  <div class="loc-name">${l.name}</div>
  <div class="loc-info">Нийт ${l.machines} машин</div>
  <div class="loc-avail">● ${l.free} чөлөөтэй</div>
  <button class="loc-qr-btn" onclick="event.stopPropagation();showLocQR(${l.id})">📱 QR харах</button>
</div>`).join('')}
</div>
<button class="btn-next" onclick="goToStep(2)" ${!booking.location ? 'disabled' : ''}>Үргэлжлүүлэх →</button>`;
}

function showLocQR(id) {
  const loc = locations.find(l => l.id === id);
  if (!loc) return;
  showQRModal(
    `LOC-${id.toString().padStart(4, '0')}`,
    `${loc.icon} ${loc.name}`,
    `Энэ байршлын мэдээллийг харах QR код`
  );
}

function renderStep2() {
  return `<div class="booking-panel-title">🫧 Машин сонгоно уу</div>
<div class="booking-panel-sub">${booking.location?.name || ''} — Чөлөөтэй машин сонгоно уу</div>
<div class="machine-select-grid">
${machines.map(m => `<div class="mach-card${booking.machine?.id === m.id ? ' selected' : ''}${m.status === 'busy' ? ' unavail' : ''}" onclick="${m.status !== 'busy' ? `selectMachine(${m.id})` : ''}">
  <div class="mach-header">
    <span class="mach-name2">🫧 ${m.name}</span>
    <span class="tag ${m.status === 'free' ? 'tag-free' : m.status === 'busy' ? 'tag-busy' : 'tag-soon'}">${m.status === 'free' ? 'Чөлөөтэй' : m.status === 'busy' ? 'Ашиглагдаж байна' : 'Удахгүй'}</span>
  </div>
  <div class="mach-body">${m.status === 'free' ? 'Одоо захиалах боломжтой' : `${m.remaining} дараа чөлөөлөгдөнө`}</div>
  <div class="mach-prog-wrap"><div class="mach-prog ${m.status}" style="width:${m.progress}%"></div></div>
</div>`).join('')}
</div>
<button class="btn-next" onclick="goToStep(3)" ${!booking.machine ? 'disabled' : ''}>Үргэлжлүүлэх →</button>`;
}

function renderStep3() {
  return `<div class="booking-panel-title">⏰ Цаг сонгоно уу</div>
<div class="booking-panel-sub">${booking.machine?.name || ''} — Тохиромжтой цагаа сонгоно уу</div>
<div class="time-date-row">
${dates.map((d, i) => `<button class="date-btn${(booking.date === formatDate(d) || (!booking.date && i === 0)) ? ' active' : ''}" onclick="selectDate('${formatDate(d)}')">${i === 0 ? 'Өнөөдөр' : formatDate(d)}</button>`).join('')}
</div>
<div class="time-grid">
${timeSlots.map(t => `<button class="time-slot${booking.time === t ? ' active' : ''}${takenSlots.includes(t) ? ' taken' : ''}" onclick="${!takenSlots.includes(t) ? `selectTime('${t}')` : ''}">${t}${takenSlots.includes(t) ? '<br/><span style="font-size:.65rem;">Дүүрэн</span>' : ''}</button>`).join('')}
</div>
<button class="btn-next" onclick="goToStep(4)" ${!booking.time ? 'disabled' : ''}>Үргэлжлүүлэх →</button>`;
}

function renderStep4() {
  return `<div class="booking-panel-title">✅ Захиалга баталгаажуулах</div>
<div class="booking-panel-sub">Доорх мэдээллээ шалгаад захиалгаа батлаарай</div>
<div class="confirm-summary">
  <div class="confirm-row"><span class="confirm-key">📍 Байршил</span><span class="confirm-val">${booking.location?.name || '—'}</span></div>
  <div class="confirm-row"><span class="confirm-key">🫧 Машин</span><span class="confirm-val">${booking.machine?.name || '—'}</span></div>
  <div class="confirm-row"><span class="confirm-key">📅 Огноо</span><span class="confirm-val">${booking.date || 'Өнөөдөр'}</span></div>
  <div class="confirm-row"><span class="confirm-key">⏰ Цаг</span><span class="confirm-val">${booking.time || '—'}</span></div>
</div>
<p class="confirm-note">⚠️ Захиалсан цагаасаа 10 минутын өмнөөс ирж машинаа ашиглана уу. Цагаасаа хоцорсон тохиолдолд захиалга цуцлагдаж болно.</p>
<div class="confirm-actions">
  <button class="btn-cancel" onclick="resetBooking()">Буцах</button>
  <button class="btn-confirm" onclick="confirmBooking()">🎯 Захиалга батлах</button>
</div>`;
}

function renderSuccess(code) {
  setTimeout(() => {
    generateQR('bookingQR', `https://easy-laundry.mn/verify/${code}`, 160);
  }, 100);
  return `<div class="booking-success">
    <div class="success-anim">✓</div>
    <h3>Захиалга амжилттай!</h3>
    <p>Таны захиалга баталгаажлаа. QR кодоороо машинаа нэвтэрнэ үү.</p>
    <div class="booking-code">${code}</div>
    <div class="qr-section">
      <h4>📱 Машин нэвтрэх QR код</h4>
      <div id="bookingQR"></div>
      <p class="qr-hint">Машины уншигч дээр QR кодыг уншуулна уу</p>
      <button class="btn-download-qr" onclick="downloadBookingQR('${code}')">⬇ QR код хадгалах</button>
    </div>
    <button class="btn-primary" onclick="newBooking()">+ Шинэ захиалга</button>
  </div>`;
}

function downloadBookingQR(code) {
  const canvas = document.querySelector('#bookingQR canvas');
  if (!canvas) return showToast('QR код олдсонгүй', 'error');
  const link = document.createElement('a');
  link.download = `easy-laundry-${code}.png`;
  link.href = canvas.toDataURL();
  link.click();
  showToast('QR код хадгалагдлаа! 📥');
}

function renderCurrentStep() {
  animatePanel(() => {
    const panel = document.getElementById('bookingPanel');
    if (currentStep === 1) panel.innerHTML = renderStep1();
    else if (currentStep === 2) panel.innerHTML = renderStep2();
    else if (currentStep === 3) panel.innerHTML = renderStep3();
    else if (currentStep === 4) panel.innerHTML = renderStep4();
    updateStepNav();
  });
}

function updateStepNav() {
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step-nav-${i}`);
    el.classList.remove('active', 'done');
    if (i === currentStep) el.classList.add('active');
    if (i < currentStep) el.classList.add('done');
  }
}

function goToStep(step) {
  if (step > currentStep && !canProceed(step)) return;
  currentStep = step;
  renderCurrentStep();
}

function canProceed(step) {
  if (step === 2 && !booking.location) { showToast('Байршил сонгоно уу', 'error'); return false; }
  if (step === 3 && !booking.machine) { showToast('Машин сонгоно уу', 'error'); return false; }
  if (step === 4 && !booking.time) { showToast('Цаг сонгоно уу', 'error'); return false; }
  return true;
}

function selectLocation(id) { booking.location = locations.find(l => l.id === id); renderCurrentStep(); }
function selectMachine(id) { booking.machine = machines.find(m => m.id === id); renderCurrentStep(); }
function selectDate(d) { booking.date = d; renderCurrentStep(); }
function selectTime(t) { booking.time = t; renderCurrentStep(); }

function confirmBooking() {
  const user = DB.getCurrentUser();
  if (!user) { showToast('Нэвтрэн орно уу', 'error'); openModal('authModal'); return; }
  const code = 'EL-' + Math.random().toString(36).substr(2, 6).toUpperCase();
  const b = {
    id: Date.now().toString(),
    userId: user.id,
    code,
    location: booking.location?.name,
    machine: booking.machine?.name,
    date: booking.date || 'Өнөөдөр',
    time: booking.time,
    status: 'upcoming',
    createdAt: new Date().toISOString()
  };
  const bookings = DB.getBookings();
  bookings.push(b);
  DB.saveBookings(bookings);
  animatePanel(() => {
    document.getElementById('bookingPanel').innerHTML = renderSuccess(code);
  });
  for (let i = 1; i <= 4; i++) {
    const el = document.getElementById(`step-nav-${i}`);
    el.classList.remove('active');
    el.classList.add('done');
  }
  renderMyBookings();
  showToast('Захиалга амжилттай баталгаажлаа! 🎉');
}

function newBooking() {
  booking = { location: null, machine: null, date: null, time: null };
  currentStep = 1;
  renderCurrentStep();
}

function resetBooking() {
  currentStep = Math.max(1, currentStep - 1);
  renderCurrentStep();
}

// ─── MY BOOKINGS ───
function renderMyBookings() {
  const user = DB.getCurrentUser();
  if (!user) return;
  const bookings = DB.getBookings().filter(b => b.userId === user.id || b.userId === undefined);
  const list = document.getElementById('bookingList');
  if (bookings.length === 0) {
    list.innerHTML = '<div style="text-align:center;padding:24px;color:var(--muted);font-size:.9rem;">Одоогоор захиалга байхгүй байна</div>';
    return;
  }
  list.innerHTML = bookings.reverse().map(b => `
    <div class="booking-item">
      <div class="bi-left">
        <div class="bi-icon">🫧</div>
        <div>
          <div class="bi-title">${b.location} — ${b.machine}</div>
          <div class="bi-info">${b.date} • ${b.time} • Код: <strong>${b.code}</strong></div>
        </div>
      </div>
      <div class="bi-actions">
        <span class="bi-status ${b.status}">${b.status === 'upcoming' ? 'Хүлээгдэж байна' : b.status === 'active' ? 'Идэвхтэй' : b.status === 'done' ? 'Дууссан' : 'Цуцлагдсан'}</span>
        <button class="btn-qr-small" onclick="showQRModal('${b.code}','📱 Захиалгын QR код','Машин нэвтрэх QR код — ${b.code}')">📱 QR</button>
        ${b.status === 'upcoming' ? `<button class="btn-cancel-booking" onclick="cancelBookingConfirm('${b.id}')">Цуцлах</button>` : ''}
      </div>
    </div>`).join('');
}

function toggleMyBookings() {
  document.getElementById('myBookingsSection').style.display = 'none';
}

function cancelBookingConfirm(id) {
  cancelTarget = id;
  openModal('cancelModal');
}

function confirmCancel() {
  if (!cancelTarget) return;
  const bookings = DB.getBookings();
  const idx = bookings.findIndex(b => b.id === cancelTarget);
  if (idx !== -1) { bookings[idx].status = 'cancelled'; DB.saveBookings(bookings); }
  cancelTarget = null;
  closeModal('cancelModal');
  renderMyBookings();
  showToast('Захиалга цуцлагдлаа');
}

function selectMachineFromHero(num) {
  scrollToBooking();
  setTimeout(() => {
    booking.location = locations[0];
    booking.machine = machines.find(m => m.id === num && m.status !== 'busy');
    currentStep = 3;
    renderCurrentStep();
  }, 600);
}

// ─── CONTACT ───
function sendContact() {
  const name = document.getElementById('cf-name').value.trim();
  const contact = document.getElementById('cf-contact').value.trim();
  const msg = document.getElementById('cf-msg').value.trim();
  if (!name || !contact || !msg) return showToast('Бүх талбарыг бөглөнө үү', 'error');
  const btn = document.querySelector('.btn-send');
  btn.textContent = 'Илгээж байна...';
  btn.classList.add('loading');
  setTimeout(() => {
    btn.textContent = '✓ Амжилттай илгээгдлээ';
    btn.style.background = '#22C55E';
    showToast('Таны мессеж амжилттай илгээгдлээ! 🎉');
    setTimeout(() => {
      btn.textContent = 'Илгээх →';
      btn.style.background = '';
      btn.classList.remove('loading');
    }, 3000);
  }, 1400);
}

// ─── NAV ───
function scrollToBooking() {
  document.getElementById('booking').scrollIntoView({ behavior: 'smooth' });
}

function toggleMobile() {
  document.getElementById('mobileMenu').classList.toggle('open');
}

function closeMobile() {
  document.getElementById('mobileMenu').classList.remove('open');
}

window.addEventListener('scroll', () => {
  const nav = document.getElementById('mainNav');
  nav.classList.toggle('scrolled', window.scrollY > 30);
  const sections = ['home', 'services', 'how', 'booking', 'about', 'app-download', 'contact'];
  let current = '';
  sections.forEach(id => {
    const el = document.getElementById(id);
    if (el && window.scrollY >= el.offsetTop - 120) current = id;
  });
  document.querySelectorAll('.nav-links a').forEach(a => {
    const onclick = a.getAttribute('onclick');
    if (onclick && onclick.includes('#' + current)) a.classList.add('active');
    else a.classList.remove('active');
  });
});

// ─── REVEAL OBSERVER ───
const revealObs = new IntersectionObserver((entries) => {
  entries.forEach((entry, i) => {
    if (entry.isIntersecting) {
      setTimeout(() => entry.target.classList.add('show'), i * 60);
    }
  });
}, { threshold: 0.08 });
document.querySelectorAll('.rv').forEach(el => revealObs.observe(el));

// ─── COUNTER ANIMATION ───
function animateCount(el, target) {
  let cur = 0;
  const step = target / 60;
  const timer = setInterval(() => {
    cur = Math.min(cur + step, target);
    el.textContent = (cur >= 1000 ? Math.round(cur / 1000) + 'K+' : Math.round(cur) + (target >= 10 && target < 100 ? '+' : ''));
    if (cur >= target) clearInterval(timer);
  }, 16);
}

const countObs = new IntersectionObserver((entries) => {
  entries.forEach(e => {
    if (e.isIntersecting) {
      animateCount(e.target, parseInt(e.target.dataset.count));
      countObs.unobserve(e.target);
    }
  });
}, { threshold: 0.5 });
document.querySelectorAll('[data-count]').forEach(el => countObs.observe(el));

// ─── INIT ───
renderCurrentStep();
const u = DB.getCurrentUser();
if (u) updateUserUI(u);

window.addEventListener('load', () => {
  generateQR('contactQR', 'https://easy-laundry.mn/contact-redirect.html', 100);
});

// ─── MODAL BACKDROP CLOSE ───
document.querySelectorAll('.modal-overlay, .qr-modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => {
    if (e.target === overlay) overlay.classList.remove('open');
  });
});

document.addEventListener('click', e => {
  const menu = document.getElementById('mobileMenu');
  if (menu.classList.contains('open') && !menu.contains(e.target) && !e.target.closest('.hamburger')) closeMobile();
});

// ─── MACHINE PROGRESS SIMULATION ───
setInterval(() => {
  document.querySelectorAll('.mach-prog.busy').forEach(p => {
    let w = parseFloat(p.style.width) || 65;
    if (w < 100) { w += 0.1; p.style.width = w + '%'; }
  });
}, 1000);

// ─── SWIPE TO CLOSE MOBILE MENU ───
let touchStartX = 0;
let touchEndX = 0;

document.addEventListener('touchstart', e => {
  touchStartX = e.changedTouches[0].screenX;
}, { passive: true });

document.addEventListener('touchend', e => {
  touchEndX = e.changedTouches[0].screenX;
  const menu = document.getElementById('mobileMenu');
  if (!menu.classList.contains('open')) return;
  if (touchEndX - touchStartX > 100) closeMobile();
}, { passive: true });

window.addEventListener('load', () => {
  generateQR('contactQR', 'https://zundui966-cyber.github.io.github.io', 100);
});