/* ============================================================
   LectureNote — App logic (Capacitor + Web)
   ============================================================ */

// ── API base ───────────────────────────────────────────────
const DEFAULT_PROD_API = 'https://web-production-94071.up.railway.app';  // APK 기본값 (Railway)
const RENDER_API       = 'https://lecture-note-2cb6.onrender.com';

function resolveApiBase() {
  const proto = location.protocol;
  const host  = location.hostname;
  // APK / 로컬 파일: localStorage 우선 → 없으면 Railway 기본값
  if (proto === 'file:' || proto === 'capacitor:') {
    return (localStorage.getItem('LN_API_BASE') || DEFAULT_PROD_API).replace(/\/+$/, '');
  }
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8000';
  return '';  // Render 배포 시 상대경로
}
let API = resolveApiBase();
window.LN = {
  get API() { return API; },
  setAPI(u) { API = u.replace(/\/+$/, ''); localStorage.setItem('LN_API_BASE', API); },
};

// ── Capacitor bridge ───────────────────────────────────────
const isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const Cap = window.Capacitor;

async function initNativeChrome() {
  if (!isCapacitor) return;
  // APK에서만 서버 설정 버튼 및 프로필 메뉴 표시
  const btnSettings = $('btn-settings');
  if (btnSettings) btnSettings.style.display = 'inline-flex';
  const rowServer = $('profile-row-server');
  if (rowServer) rowServer.style.display = 'flex';
  _updateServerLabel();
  try {
    const { StatusBar } = Cap.Plugins;
    if (StatusBar) {
      await StatusBar.setBackgroundColor({ color: '#1A2D5E' });
      await StatusBar.setStyle({ style: 'DARK' });
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (e) { console.warn('StatusBar', e); }
  try {
    const SplashScreen = Cap.Plugins.SplashScreen;
    if (SplashScreen) setTimeout(() => SplashScreen.hide(), 200);
  } catch {}
  try {
    const App = Cap.Plugins.App;
    if (App) App.addListener('backButton', () => handleBackButton());
  } catch {}
}

// ── Auth state ─────────────────────────────────────────────
let gToken = null;
let gUser  = null;

function saveToken(token, persist) {
  gToken = token;
  if (persist) localStorage.setItem('LN_TOKEN', token);
  else sessionStorage.setItem('LN_TOKEN', token);
}

function loadToken() {
  return localStorage.getItem('LN_TOKEN') || sessionStorage.getItem('LN_TOKEN') || null;
}

function clearToken() {
  gToken = null;
  localStorage.removeItem('LN_TOKEN');
  sessionStorage.removeItem('LN_TOKEN');
}

// authFetch — injects Authorization header, handles 401 by logging out
async function authFetch(url, opts = {}) {
  if (gToken) {
    opts.headers = Object.assign({ 'Authorization': `Bearer ${gToken}` }, opts.headers || {});
  }
  const r = await fetch(url, opts);
  if (r.status === 401) {
    clearToken();
    gUser = null;
    showAuthScreen('onboarding');
    showAuthRoot(true);
    throw new Error('세션이 만료되었습니다. 다시 로그인해 주세요.');
  }
  return r;
}

// ── App/auth screen routing ────────────────────────────────
function showAuthRoot(show) {
  const root = $('auth-root');
  const app  = $('app');
  if (show) {
    root.classList.add('active');
    app.style.display = 'none';
  } else {
    root.classList.remove('active');
    app.style.display = '';
    $('btn-profile').style.display = 'inline-flex';
  }
}

function showAuthScreen(name) {
  ['onboarding', 'login', 'signup', 'find'].forEach(n => {
    const el = $(`screen-${n}`);
    if (el) el.style.display = n === name ? 'flex' : 'none';
  });
  if (name === 'signup') resetSignupForm();
  if (name === 'find') resetFindForm();
}
window.showAuthScreen = showAuthScreen;

// ── Login ──────────────────────────────────────────────────
async function doLogin() {
  const username = $('login-username').value.trim();
  const password = $('login-password').value;
  const autologin = $('login-autologin').checked;

  $('login-err').classList.remove('show');
  if (!username || !password) {
    $('login-err').textContent = '아이디와 비밀번호를 입력해주세요.';
    $('login-err').classList.add('show');
    return;
  }

  const btn = $('btn-login');
  btn.disabled = true;
  btn.textContent = '로그인 중...';
  try {
    const r = await fetch(`${API}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password }),
    });
    const d = await r.json();
    if (!r.ok) {
      $('login-err').textContent = d.detail || '로그인에 실패했습니다.';
      $('login-err').classList.add('show');
      return;
    }
    saveToken(d.token, autologin);
    gUser = d.user;
    onLoginSuccess();
  } catch (e) {
    $('login-err').textContent = '서버에 연결할 수 없습니다.';
    $('login-err').classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = '로그인';
  }
}
window.doLogin = doLogin;

// ── Password strength ──────────────────────────────────────
function calcPwStrength(pw) {
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[a-zA-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^a-zA-Z0-9]/.test(pw)) score++;
  return score; // 0-4
}

function updatePwStrength(inputId, barId) {
  const pw = $(inputId).value;
  const bar = $(barId);
  if (!bar) return;
  const barInner = bar.querySelector('.pw-strength-bar');
  const labelId = barId.replace('strength', 'strength-label');
  const label = $(labelId);
  const score = calcPwStrength(pw);
  const levels = ['', '약함', '보통', '강함', '매우 강함'];
  const colors = ['', '#e53e3e', '#f6ad55', '#4B82C5', '#38a169'];
  const pct = pw.length ? [0, 25, 50, 75, 100][score] : 0;
  if (barInner) { barInner.style.width = pct + '%'; barInner.style.background = colors[score] || '#e5e7eb'; }
  if (label) { label.textContent = pw.length ? levels[score] : ''; label.style.color = colors[score] || ''; }
  // Rules checklist (change-pw only)
  const rules = $('cp-pw-rules');
  if (rules && inputId === 'cp-new') {
    const set = (id, ok) => { const el = $(id); if (el) el.classList.toggle('ok', ok); };
    set('pr-len', pw.length >= 8);
    set('pr-eng', /[a-zA-Z]/.test(pw));
    set('pr-num', /[0-9]/.test(pw));
    set('pr-sym', /[^a-zA-Z0-9]/.test(pw));
  }
}
window.updatePwStrength = updatePwStrength;

// ── Terms ──────────────────────────────────────────────────
function toggleAllTerms(allCb) {
  document.querySelectorAll('#signup-step2 input[type=checkbox]').forEach(cb => { cb.checked = allCb.checked; });
  checkTermsReq();
}
function checkTermsReq() {
  const allReq = [...document.querySelectorAll('.terms-required')].every(cb => cb.checked);
  $('btn-signup-submit').disabled = !allReq;
  const allCb = $('terms-all');
  if (allCb) allCb.checked = [...document.querySelectorAll('#signup-step2 input[type=checkbox]:not(#terms-all)')].every(cb => cb.checked);
}
window.toggleAllTerms = toggleAllTerms;
window.checkTermsReq  = checkTermsReq;

// ── Find account ───────────────────────────────────────────
function resetFindForm() {
  ['find-name','find-school','find-pw-username'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  ['find-id-result','find-pw-result'].forEach(id => { const el = $(id); if (el) { el.textContent = ''; el.classList.remove('show'); } });
  switchFindTab('id');
}

function switchFindTab(tab) {
  $('find-id-form').style.display = tab === 'id' ? 'block' : 'none';
  $('find-pw-form').style.display = tab === 'pw' ? 'block' : 'none';
  $('find-tab-id').classList.toggle('active', tab === 'id');
  $('find-tab-pw').classList.toggle('active', tab === 'pw');
}
window.switchFindTab = switchFindTab;

async function doFindId() {
  const name   = $('find-name').value.trim();
  const school = $('find-school').value.trim();
  const res    = $('find-id-result');
  res.classList.remove('show');
  if (!name) { res.textContent = '이름을 입력해주세요.'; res.className = 'auth-err-banner show'; return; }
  try {
    const r = await fetch(`${API}/api/auth/find-id`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name: name, school }),
    });
    const d = await r.json();
    if (r.ok && d.username) {
      res.textContent = `아이디: ${d.username}`;
      res.className = 'auth-err-banner ok show';
    } else {
      res.textContent = d.detail || '일치하는 계정을 찾을 수 없습니다.';
      res.className = 'auth-err-banner show';
    }
  } catch {
    res.textContent = '서버에 연결할 수 없습니다.';
    res.className = 'auth-err-banner show';
  }
}
window.doFindId = doFindId;

async function doFindPw() {
  const username = $('find-pw-username').value.trim();
  const res = $('find-pw-result');
  res.classList.remove('show');
  if (!username) { res.textContent = '아이디를 입력해주세요.'; res.className = 'auth-err-banner show'; return; }
  try {
    const r = await fetch(`${API}/api/auth/find-pw`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username }),
    });
    const d = await r.json();
    if (r.ok) {
      res.textContent = d.message || '가입된 이메일로 임시 비밀번호를 전송했습니다.';
      res.className = 'auth-err-banner ok show';
    } else {
      res.textContent = d.detail || '계정을 찾을 수 없습니다.';
      res.className = 'auth-err-banner show';
    }
  } catch {
    res.textContent = '서버에 연결할 수 없습니다.';
    res.className = 'auth-err-banner show';
  }
}
window.doFindPw = doFindPw;

// ── Signup step 1 validation ───────────────────────────────
function signupStep1Next() {
  const username  = $('reg-username').value.trim();
  const password  = $('reg-password').value;
  const password2 = $('reg-password2').value;
  const errBanner = $('signup-err');
  errBanner.classList.remove('show');
  $('reg-username-hint').classList.remove('show');
  $('reg-pw-hint').classList.remove('show');

  if (username.length < 3) {
    $('reg-username-hint').textContent = '아이디는 3자 이상이어야 합니다.';
    $('reg-username-hint').classList.add('show');
    return;
  }
  if (password.length < 4) {
    errBanner.textContent = '비밀번호는 4자 이상이어야 합니다.';
    errBanner.classList.add('show');
    return;
  }
  if (password !== password2) {
    $('reg-pw-hint').textContent = '비밀번호가 일치하지 않습니다.';
    $('reg-pw-hint').classList.add('show');
    return;
  }
  // advance to step 2
  $('signup-step1').style.display = 'none';
  $('signup-step2').style.display = 'block';
  $('sp-dot-1').classList.remove('active'); $('sp-dot-1').classList.add('done');
  $('sp-line-1').classList.add('done');
  $('sp-dot-2').classList.add('active');
  $('signup-header-title').textContent = '추가 정보';
  $('signup-header-sub').textContent = '약관 동의 후 가입을 완료하세요.';
  checkTermsReq();
}
window.signupStep1Next = signupStep1Next;

function signupBack() {
  if ($('signup-step2').style.display === 'block') {
    $('signup-step2').style.display = 'none';
    $('signup-step1').style.display = 'block';
    $('sp-dot-1').classList.add('active'); $('sp-dot-1').classList.remove('done');
    $('sp-line-1').classList.remove('done');
    $('sp-dot-2').classList.remove('active');
    $('signup-header-title').textContent = '회원가입';
    $('signup-header-sub').textContent = '계정 정보를 입력해 주세요';
  } else {
    showAuthScreen('onboarding');
  }
}
window.signupBack = signupBack;

function resetSignupForm() {
  ['reg-username','reg-email','reg-password','reg-password2','reg-display-name','reg-school','reg-major'].forEach(id => { const el = $(id); if (el) el.value = ''; });
  ['terms-all','terms-use','terms-privacy','terms-mkt'].forEach(id => { const el = $(id); if (el) el.checked = false; });
  $('btn-signup-submit').disabled = true;
  const pwBar = $('reg-pw-strength')?.querySelector('.pw-strength-bar'); if (pwBar) pwBar.style.width = '0';
  const pwLbl = $('reg-pw-strength-label'); if (pwLbl) pwLbl.textContent = '';
  $('signup-step1').style.display = 'block';
  $('signup-step2').style.display = 'none';
  $('sp-dot-1').className = 'signup-step-dot active';
  $('sp-line-1').className = 'signup-step-line';
  $('sp-dot-2').className = 'signup-step-dot';
  $('signup-header-title').textContent = '회원가입';
  $('signup-header-sub').textContent = '계정 정보를 입력해 주세요';
  $('signup-err').classList.remove('show');
}

async function doRegister() {
  const username    = $('reg-username').value.trim();
  const password    = $('reg-password').value;
  const email       = $('reg-email').value.trim() || null;
  const displayName = $('reg-display-name').value.trim();
  const school      = $('reg-school').value.trim();
  const major       = $('reg-major').value.trim();

  const errBanner = $('signup-err');
  errBanner.classList.remove('show');

  const btn = $('btn-signup-submit');
  btn.disabled = true;
  btn.textContent = '가입 중...';
  try {
    const r = await fetch(`${API}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username, password, email, display_name: displayName || null, school: school || null, major: major || null }),
    });
    const d = await r.json();
    if (!r.ok) {
      errBanner.textContent = d.detail || '가입에 실패했습니다.';
      errBanner.classList.add('show');
      return;
    }
    saveToken(d.token, true);
    gUser = d.user;
    onLoginSuccess();
  } catch (e) {
    errBanner.textContent = '서버에 연결할 수 없습니다.';
    errBanner.classList.add('show');
  } finally {
    btn.disabled = false;
    btn.textContent = '가입 완료';
  }
}
window.doRegister = doRegister;

function onLoginSuccess() {
  showAuthRoot(false);
  updateAppbarUser();
  showToast(`반갑습니다, ${gUser.display_name || gUser.username}님!`, 'ok');
}

function updateAppbarUser() {
  if (gUser) {
    $('btn-profile').style.display = 'inline-flex';
  }
}

async function doLogout() {
  try {
    await authFetch(`${API}/api/auth/logout`, { method: 'POST' });
  } catch {}
  clearToken();
  gUser = null;
  $('btn-profile').style.display = 'none';
  showAuthRoot(true);
  showAuthScreen('onboarding');
  closeProfile();
  showToast('로그아웃 되었습니다.', 'info');
}
window.doLogout = doLogout;

// ── Password visibility toggle ─────────────────────────────
function togglePw(inputId, btn) {
  const inp = $(inputId);
  const isHidden = inp.type === 'password';
  inp.type = isHidden ? 'text' : 'password';
  const use = btn.querySelector('use');
  if (use) use.setAttribute('href', isHidden ? '#i-eye-off' : '#i-eye');
}
window.togglePw = togglePw;

// ── Profile screen ─────────────────────────────────────────
async function openProfile() {
  // Refresh user data
  try {
    const r = await authFetch(`${API}/api/auth/me`);
    if (r.ok) gUser = await r.json();
  } catch {}

  if (!gUser) return;
  renderProfileHeader();

  // Load stats
  try {
    const r = await authFetch(`${API}/api/auth/stats`);
    if (r.ok) {
      const s = await r.json();
      $('profile-stat-lectures').textContent = s.lecture_count ?? '—';
      $('profile-stat-notes').textContent    = s.note_count ?? '—';
      $('profile-stat-week').textContent     = s.notes_this_week ?? '—';
    }
  } catch {}

  $('profile-screen').classList.add('active');
}
window.openProfile = openProfile;

function closeProfile() {
  $('profile-screen').classList.remove('active');
  closeEditProfile();
  closeChangePw();
  closeAccountInfo();
  closePlanScreen();
  closeLanguageScreen();
}
window.closeProfile = closeProfile;

function renderProfileHeader() {
  const u = gUser;
  if (!u) return;
  const initial = (u.display_name || u.username || '?')[0].toUpperCase();
  $('profile-avatar-initial').textContent = initial;
  $('profile-display-name').textContent = u.display_name || u.username;
  $('profile-username').textContent = `@${u.username}`;
  const planLabel = { pro: 'Pro', team: 'Team' }[u.plan] || 'Free';
  $('profile-plan-text').textContent = planLabel;
  $('profile-plan-badge').classList.toggle('pro', !!u.plan && u.plan !== 'free');
  $('profile-row-name').textContent = [u.display_name, u.school, u.major].filter(Boolean).join(' · ') || '편집하기';
  $('profile-row-plan').textContent = planLabel;
  $('profile-dark-value').textContent = `현재: ${document.body.classList.contains('dark') ? '다크' : '라이트'}`;
  const langNames = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文(简体)' };
  $('profile-row-lang').textContent = langNames[u.locale || 'ko'] || '한국어';
}

function openEditProfile() {
  const u = gUser;
  if (u) {
    $('ep-display-name').value = u.display_name || '';
    $('ep-school').value = u.school || '';
    $('ep-major').value  = u.major  || '';
  }
  $('edit-profile-screen').classList.add('active');
}
window.openEditProfile = openEditProfile;

function closeEditProfile() {
  $('edit-profile-screen').classList.remove('active');
}
window.closeEditProfile = closeEditProfile;

async function saveProfile() {
  const display_name = $('ep-display-name').value.trim() || null;
  const school       = $('ep-school').value.trim() || null;
  const major        = $('ep-major').value.trim() || null;
  const errEl = $('edit-profile-err');
  errEl.classList.remove('show');
  try {
    const r = await authFetch(`${API}/api/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ display_name, school, major }),
    });
    if (!r.ok) {
      const d = await r.json().catch(() => ({}));
      errEl.textContent = d.detail || '저장에 실패했습니다.';
      errEl.classList.add('show');
      return;
    }
    gUser = await r.json();
    renderProfileHeader();
    closeEditProfile();
    showToast('프로필이 저장되었습니다.', 'ok');
  } catch (e) {
    errEl.textContent = '서버 오류가 발생했습니다.';
    errEl.classList.add('show');
  }
}
window.saveProfile = saveProfile;

function openChangePassword() {
  ['cp-current','cp-new','cp-new2'].forEach(id => $(id).value = '');
  $('change-pw-err').classList.remove('show');
  $('cp-hint').classList.remove('show');
  $('change-pw-screen').classList.add('active');
}
window.openChangePassword = openChangePassword;

function closeChangePw() {
  $('change-pw-screen').classList.remove('active');
}
window.closeChangePw = closeChangePw;

async function doChangePassword() {
  const current = $('cp-current').value;
  const newPw   = $('cp-new').value;
  const newPw2  = $('cp-new2').value;
  const errEl   = $('change-pw-err');
  const hint    = $('cp-hint');
  errEl.classList.remove('show');
  hint.classList.remove('show');

  if (newPw !== newPw2) {
    hint.textContent = '새 비밀번호가 일치하지 않습니다.';
    hint.classList.add('show');
    return;
  }
  try {
    const r = await authFetch(`${API}/api/auth/password`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ current_password: current, new_password: newPw }),
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) {
      errEl.textContent = d.detail || '변경에 실패했습니다.';
      errEl.classList.add('show');
      return;
    }
    // Session invalidated — re-login
    clearToken();
    gUser = null;
    closeProfile();
    showAuthRoot(true);
    showAuthScreen('login');
    showToast('비밀번호가 변경되었습니다. 다시 로그인해 주세요.', 'ok');
  } catch (e) {
    errEl.textContent = '서버 오류가 발생했습니다.';
    errEl.classList.add('show');
  }
}
window.doChangePassword = doChangePassword;

function openDeleteAccount() {
  const inp = $('del-confirm-input');
  if (inp) inp.value = '';
  const btn = $('btn-del-confirm');
  if (btn) btn.disabled = true;
  $('del-modal-mask').classList.add('show');
}
function closeDeleteAccount() {
  $('del-modal-mask').classList.remove('show');
}
function checkDelConfirm(inp) {
  const btn = $('btn-del-confirm');
  if (btn) btn.disabled = inp.value !== '탈퇴합니다';
}
window.openDeleteAccount  = openDeleteAccount;
window.closeDeleteAccount = closeDeleteAccount;
window.checkDelConfirm    = checkDelConfirm;

// ── Account Info screen ────────────────────────────────────
async function openAccountInfo() {
  if (!gUser) return;
  $('ai-username').textContent = gUser.username || '—';
  $('ai-email').textContent    = gUser.email    || '미등록';
  $('ai-joined').textContent   = gUser.created_at || '—';
  try {
    const r = await authFetch(`${API}/api/auth/stats`);
    if (r.ok) {
      const s = await r.json();
      $('ai-lectures').textContent = s.lecture_count ?? '—';
      $('ai-notes').textContent    = s.note_count ?? '—';
    }
  } catch {}
  $('account-info-screen').classList.add('active');
}
function closeAccountInfo() { $('account-info-screen').classList.remove('active'); }
window.openAccountInfo  = openAccountInfo;
window.closeAccountInfo = closeAccountInfo;

// ── Plan screen ────────────────────────────────────────────
function openPlanScreen() {
  const cur = gUser?.plan || 'free';
  ['free','pro','team'].forEach(p => {
    const card = $(`plan-${p}`);
    if (card) card.classList.toggle('selected', p === cur);
  });
  $('plan-screen').classList.add('active');
}
function closePlanScreen() { $('plan-screen').classList.remove('active'); }
function selectPlan(plan) {
  ['free','pro','team'].forEach(p => { const c = $(`plan-${p}`); if (c) c.classList.toggle('selected', p === plan); });
  if (plan === 'free') { showToast('현재 플랜입니다.', 'info'); return; }
  showToast(`${plan.toUpperCase()} 플랜 결제 기능은 준비 중입니다.`, 'info');
}
window.openPlanScreen  = openPlanScreen;
window.closePlanScreen = closePlanScreen;
window.selectPlan      = selectPlan;

// ── Language screen ────────────────────────────────────────
const LANG_NAMES = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文(简体)' };
function openLanguageScreen() {
  const cur = gUser?.locale || 'ko';
  ['ko','en','ja','zh'].forEach(l => {
    const el = $(`lang-${l}`);
    if (!el) return;
    el.classList.toggle('active', l === cur);
    const check = el.querySelector('.lang-check');
    if (check) check.style.display = l === cur ? '' : 'none';
  });
  $('language-screen').classList.add('active');
}
function closeLanguageScreen() { $('language-screen').classList.remove('active'); }
async function setLanguage(locale) {
  ['ko','en','ja','zh'].forEach(l => {
    const el = $(`lang-${l}`);
    if (!el) return;
    el.classList.toggle('active', l === locale);
    const check = el.querySelector('.lang-check');
    if (check) check.style.display = l === locale ? '' : 'none';
  });
  try {
    const r = await authFetch(`${API}/api/auth/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ locale }),
    });
    if (r.ok) {
      gUser = await r.json();
      renderProfileHeader();
      showToast(`언어가 ${LANG_NAMES[locale]}로 설정되었습니다.`, 'ok');
    }
  } catch { showToast('설정 저장에 실패했습니다.', 'err'); }
}
window.openLanguageScreen  = openLanguageScreen;
window.closeLanguageScreen = closeLanguageScreen;
window.setLanguage = setLanguage;

async function doDeleteAccount() {
  try {
    await authFetch(`${API}/api/auth/me`, { method: 'DELETE' });
  } catch {}
  clearToken();
  gUser = null;
  closeDeleteAccount();
  closeProfile();
  showAuthRoot(true);
  showAuthScreen('onboarding');
  showToast('계정이 삭제되었습니다.', 'info');
}
window.doDeleteAccount = doDeleteAccount;

// ── App state ──────────────────────────────────────────────
let gLectureId = null;
let gOutputId  = null;
let gRecBlob   = null;
let gRecMime   = 'audio/webm';
let mediaRec   = null;
let recChunks  = [];
let recTimerId = null;
let recSecs    = 0;

let loadElapsed  = 0;
let loadTimerId  = null;
let pipelineSteps = [];

let streamAutoScroll = false;

let currentTab = 't0';
let tabHistory = ['t0'];

const TAB_LABELS = { t0: '강의 등록', tn: '노트 생성', th: '노트 조회' };

// ── DOM helpers ────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function icon(id, cls = 'icon-16') { return `<svg class="${cls}"><use href="#${id}"/></svg>`; }

// ── Tab switching ──────────────────────────────────────────
function showTab(id, viaBack) {
  if (!['t0','tn','th'].includes(id)) return;
  ['t0','tn','th'].forEach(t => {
    $(`tab-${t}`).style.display = t === id ? 'block' : 'none';
    $(`nav-${t}`).classList.toggle('active', t === id);
  });
  $('appbar-page').textContent = TAB_LABELS[id] || '';
  if (id !== currentTab && !viaBack) {
    tabHistory.push(id);
    if (tabHistory.length > 6) tabHistory.shift();
  }
  currentTab = id;
  $('content').scrollTop = 0;
  if (id === 'tn') loadLectures();
  if (id === 'th') loadThLectures();
}
window.showTab = showTab;

function handleBackButton() {
  // Profile sub-screens (deeper → shallower)
  if ($('language-screen')?.classList.contains('active'))    { closeLanguageScreen(); return; }
  if ($('plan-screen')?.classList.contains('active'))        { closePlanScreen(); return; }
  if ($('settings-sheet-mask')?.classList.contains('show'))   { closeSettings(); return; }
  if ($('account-info-screen')?.classList.contains('active')){ closeAccountInfo(); return; }
  if ($('change-pw-screen').classList.contains('active'))    { closeChangePw(); return; }
  if ($('edit-profile-screen').classList.contains('active')) { closeEditProfile(); return; }
  if ($('profile-screen').classList.contains('active'))      { closeProfile(); return; }
  // Note edit
  if (currentTab === 'th' && $('th-note-edit').style.display === 'block') { cancelEditNote(); return; }
  // Auth screens
  if ($('auth-root').classList.contains('active')) {
    const loginVisible = $('screen-login').style.display === 'flex';
    const signupVisible = $('screen-signup').style.display === 'flex';
    if (loginVisible || signupVisible) { showAuthScreen('onboarding'); return; }
    return;
  }
  // Tab navigation
  if (tabHistory.length > 1) {
    tabHistory.pop();
    showTab(tabHistory[tabHistory.length - 1], true);
  } else {
    if (isCapacitor && Cap.Plugins.App && confirm('앱을 종료할까요?')) Cap.Plugins.App.exitApp();
  }
}

// ── Toast ──────────────────────────────────────────────────
let toastTimer = null;
function showToast(msg, type = 'info') {
  const el = $('toast');
  const iconId = type === 'ok' ? 'i-check' : type === 'err' ? 'i-x' : 'i-bolt';
  el.innerHTML = `${icon(iconId, 'icon-16')}<span>${escHtml(msg)}</span>`;
  el.className = `show ${type}`;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { el.className = type; }, 3000);
}

// ── Gen banner (background note generation) ───────────────
let genBannerElapsed = 0;
let genBannerTimer   = null;
let genBannerNoteText = '';
let genBannerOutputId = null;

function showGenBanner(title, sub, steps) {
  genBannerElapsed = 0;
  clearInterval(genBannerTimer);
  genBannerNoteText = '';
  genBannerOutputId = null;
  $('gen-banner-title').textContent = title;
  $('gen-banner-sub').textContent   = sub;
  $('gen-banner-time').textContent  = '0초';
  $('gen-banner-btn').style.display = 'none';
  const b = $('gen-banner');
  b.className = 'gen-banner';
  b.style.display = 'none'; // 배너는 모달 최소화 시 등장
  genBannerTimer = setInterval(() => {
    genBannerElapsed++;
    const el = $('gen-banner-time');
    if (el) el.textContent = genBannerElapsed + '초';
    const gmEl = $('gm-timer-num');
    if (gmEl) gmEl.textContent = genBannerElapsed;
  }, 1000);
  // Show gen modal with pipeline steps
  const gmSteps = $('gm-steps');
  if (gmSteps) {
    if (steps && steps.length) {
      gmSteps.innerHTML = buildPipelineHTML(steps);
      gmSteps.style.display = 'flex';
    } else {
      gmSteps.style.display = 'none';
    }
  }
  const gmTitle = $('gm-title'); if (gmTitle) gmTitle.textContent = title;
  const gmSub   = $('gm-sub');   if (gmSub)   gmSub.textContent   = sub || '';
  const gmNum   = $('gm-timer-num'); if (gmNum) gmNum.textContent = '0';
  const gmBg    = $('btn-gm-bg');   if (gmBg)   gmBg.style.display   = 'flex';
  const gmView  = $('btn-gm-view'); if (gmView) gmView.style.display = 'none';
  const gmPrev  = $('gm-preview');
  if (gmPrev) { gmPrev.textContent = ''; gmPrev.style.display = 'none'; }
  const modal = $('gen-modal');
  if (modal) modal.classList.add('show');
}

function updateGenBanner(title, sub, stepId) {
  $('gen-banner-title').textContent = title;
  $('gen-banner-sub').textContent   = sub || '';
  const gmTitle = $('gm-title');
  const gmSub   = $('gm-sub');
  if (gmTitle) gmTitle.textContent = title;
  if (gmSub)   gmSub.textContent   = sub || '';
  if (stepId)  advanceGenStep(stepId);
}

function advanceGenStep(stepId) {
  const container = $('gm-steps');
  if (!container) return;
  const wraps = container.querySelectorAll('.pipeline-step-wrap');
  let foundIdx = -1;
  wraps.forEach((el, i) => { if (el.dataset.step === stepId) foundIdx = i; });
  if (foundIdx < 0) return;
  wraps.forEach((el, i) => {
    const inner = el.querySelector('.pipeline-step');
    el.classList.toggle('done',   i <= foundIdx);
    el.classList.toggle('active', i === foundIdx + 1);
    if (inner) {
      inner.classList.toggle('done',   i <= foundIdx);
      inner.classList.toggle('active', i === foundIdx + 1);
    }
  });
}

function completeGenBanner() {
  clearInterval(genBannerTimer);
  const completedText = `${genBannerElapsed}초 · ${genBannerNoteText.length.toLocaleString()}자`;
  updateGenBanner('노트 생성 완료', completedText);
  $('gen-banner').classList.add('done');
  $('gen-banner-btn').style.display = 'inline-flex';
  // Update modal: mark all steps done, show 보기 button
  const container = $('gm-steps');
  if (container) {
    container.querySelectorAll('.pipeline-step-wrap, .pipeline-step').forEach(el => {
      el.classList.add('done');
      el.classList.remove('active');
    });
  }
  $('btn-gm-bg').style.display   = 'none';
  $('btn-gm-view').style.display = 'inline-flex';
  // 모달이 최소화 상태였다면 배너도 완료 표시
  if ($('gen-banner').style.display !== 'none') {
    $('gen-banner').classList.add('done');
    $('gen-banner-btn').style.display = 'inline-flex';
  }
}

function errorGenBanner(msg) {
  clearInterval(genBannerTimer);
  updateGenBanner('생성 실패', msg || '오류가 발생했습니다.');
  $('gen-banner').classList.add('error');
  const bgBtn = $('btn-gm-bg');
  if (bgBtn) { bgBtn.textContent = '닫기'; bgBtn.style.display = 'flex'; }
}

function hideGenModal() {
  $('gen-modal').classList.remove('show');
  $('gen-banner').style.display = 'flex'; // 모달 최소화 → 배너 등장
}
function openGenModal() { $('gen-modal').classList.add('show'); }
window.hideGenModal = hideGenModal;
window.openGenModal = openGenModal;

// ── API Settings sheet (APK URL 전환) ──────────────────────
function openSettings() {
  const inp = $('settings-api');
  if (inp) inp.value = API;
  const sheet = $('settings-sheet-mask');
  if (sheet) sheet.classList.add('show');
}
function closeSettings() {
  const sheet = $('settings-sheet-mask');
  if (sheet) sheet.classList.remove('show');
}
function applySettings() {
  const v = ($('settings-api')?.value || '').trim();
  if (v) window.LN.setAPI(v);
  closeSettings();
  _updateServerLabel();
}
function _updateServerLabel() {
  const el = $('profile-server-value');
  if (!el) return;
  if (API.includes('railway')) el.textContent = 'Railway';
  else if (API.includes('onrender')) el.textContent = 'Render';
  else el.textContent = new URL(API).hostname;
}
function resetSettings() {
  window.LN.setAPI(DEFAULT_PROD_API);
  const inp = $('settings-api'); if (inp) inp.value = DEFAULT_PROD_API;
}
window.openSettings  = openSettings;
window.closeSettings = closeSettings;
window.applySettings = applySettings;
window.resetSettings = resetSettings;

function jumpToNoteResult() {
  showTab('tn');
  const res = $('res-tn');
  if (res && res.classList.contains('show')) {
    setTimeout(() => res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 100);
  }
}
window.jumpToNoteResult = jumpToNoteResult;

// ── Note in-page search ────────────────────────────────────
let noteSearchMarks = [];
let noteSearchIdx   = -1;

function _noteContainer(tab) {
  return tab === 'tn' ? $('view-tn') : $('th-note-view');
}

function toggleNoteSearch(tab) {
  const bar = $(`${tab}-search-bar`);
  if (!bar) return;
  const showing = bar.style.display !== 'none';
  if (showing) {
    closeNoteSearch(tab);
  } else {
    bar.style.display = 'flex';
    const inp = $(`${tab}-search-input`);
    if (inp) { inp.value = ''; inp.focus(); }
  }
}

function doNoteSearch(tab) {
  const inp       = $(`${tab}-search-input`);
  const container = _noteContainer(tab);
  if (!inp || !container) return;
  const query = inp.value.trim();

  // Restore original markdown rendering before re-searching
  if (container.dataset.raw) renderMd(container, container.dataset.raw);
  noteSearchMarks = [];
  noteSearchIdx   = -1;

  if (!query) { _updateSearchCount(tab); return; }

  const lq = query.toLowerCase();
  const nodes = [];
  const walker = document.createTreeWalker(container, NodeFilter.SHOW_TEXT, null);
  while (walker.nextNode()) nodes.push(walker.currentNode);

  for (const node of nodes) {
    const text  = node.textContent;
    const lower = text.toLowerCase();
    if (!lower.includes(lq)) continue;
    const frag = document.createDocumentFragment();
    let pos = 0, idx;
    while ((idx = lower.indexOf(lq, pos)) !== -1) {
      if (idx > pos) frag.appendChild(document.createTextNode(text.slice(pos, idx)));
      const mark = document.createElement('mark');
      mark.className = 'search-mark';
      mark.textContent = text.slice(idx, idx + query.length);
      frag.appendChild(mark);
      noteSearchMarks.push(mark);
      pos = idx + query.length;
    }
    if (pos < text.length) frag.appendChild(document.createTextNode(text.slice(pos)));
    node.parentNode.replaceChild(frag, node);
  }

  if (noteSearchMarks.length) { noteSearchIdx = 0; _scrollToMark(); }
  _updateSearchCount(tab);
}

function searchNav(tab, dir) {
  if (!noteSearchMarks.length) return;
  noteSearchIdx = (noteSearchIdx + dir + noteSearchMarks.length) % noteSearchMarks.length;
  _scrollToMark();
  _updateSearchCount(tab);
}

function closeNoteSearch(tab) {
  const bar = $(`${tab}-search-bar`);
  if (bar) bar.style.display = 'none';
  const container = _noteContainer(tab);
  if (container && container.dataset.raw) renderMd(container, container.dataset.raw);
  noteSearchMarks = [];
  noteSearchIdx   = -1;
  _updateSearchCount(tab);
}

function _scrollToMark() {
  noteSearchMarks.forEach((m, i) =>
    m.classList.toggle('search-mark-current', i === noteSearchIdx)
  );
  if (noteSearchMarks[noteSearchIdx]) {
    noteSearchMarks[noteSearchIdx].scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
}

function _updateSearchCount(tab) {
  const el  = $(`${tab}-search-count`);
  const inp = $(`${tab}-search-input`);
  if (!el) return;
  const hasQuery = inp && inp.value.trim();
  if (!hasQuery) { el.textContent = ''; return; }
  el.textContent = noteSearchMarks.length
    ? `${noteSearchIdx + 1} / ${noteSearchMarks.length}`
    : '없음';
}

window.toggleNoteSearch = toggleNoteSearch;
window.doNoteSearch     = doNoteSearch;
window.searchNav        = searchNav;
window.closeNoteSearch  = closeNoteSearch;

// ── Pipeline A loading overlay ─────────────────────────────
const PIPELINE_NOTE_AUDIO = [
  { id: 'ingest', label: '소스 수집',              sub: 'PDF, 녹음 파일 읽는 중' },
  { id: 'stt',    label: 'Gemini STT 변환',        sub: '음성 → 텍스트 변환 중...' },
  { id: 'agg',    label: '자료 통합',              sub: 'STT + PDF + 필기 병합 중' },
  { id: 'ctx',    label: '컨텍스트 주입',          sub: 'Step 0 분석 결과 연결 중' },
  { id: 'gen',    label: '노트 생성 (LLM)',        sub: 'Gemini가 노트를 작성하는 중...' },
];
const PIPELINE_NOTE_NOAUDIO = [
  { id: 'ingest', label: '소스 수집',    sub: '업로드 파일 읽는 중' },
  { id: 'agg',    label: '자료 통합',    sub: 'PDF + 필기 병합 중' },
  { id: 'ctx',    label: '컨텍스트 주입', sub: 'Step 0 연결 중' },
  { id: 'gen',    label: '노트 생성',    sub: 'Gemini가 노트를 작성하는 중...' },
];
const PIPELINE_STEP0 = [
  { id: 'parse',   label: '강의계획서 파싱',   sub: '파일에서 텍스트 추출 중' },
  { id: 'analyze', label: 'Step 0 분석',       sub: 'Gemini 분석 중...' },
  { id: 'meta',    label: '과목 정보 추출',    sub: '제목 · 과목명 확인 중' },
  { id: 'save',    label: '강의 등록',         sub: 'DB에 저장 중' },
];

function buildPipelineHTML(steps) {
  return steps.map((s, i) => `
    <div class="pipeline-step-wrap${i === 0 ? ' active' : ''}" data-step="${s.id}">
      <div class="pipeline-step${i === 0 ? ' active' : ''}">
        <div class="step-bullet">${icon('i-check', 'icon-14')}</div>
        <div class="pipeline-step-info">
          <div class="pipeline-step-label">${escHtml(s.label)}</div>
          <div class="pipeline-step-sub">${escHtml(s.sub || '')}</div>
        </div>
      </div>
    </div>
  `).join('');
}

function showLoad(text, sub, steps) {
  pipelineSteps = (steps || []).slice();
  $('load-text').textContent = text || '처리 중...';
  $('load-sub').textContent  = sub  || '';
  $('load-timer-num').textContent = '0';
  const stepsEl = $('load-steps');
  stepsEl.innerHTML = buildPipelineHTML(pipelineSteps);
  stepsEl.style.display = pipelineSteps.length ? 'flex' : 'none';
  $('loading').classList.add('show');

  loadElapsed = 0;
  clearInterval(loadTimerId);
  loadTimerId = setInterval(() => {
    loadElapsed++;
    const numEl = $('load-timer-num');
    if (numEl) numEl.textContent = loadElapsed;
  }, 1000);
}

function advanceStep(stepId) {
  const wraps = document.querySelectorAll('.pipeline-step-wrap');
  let foundIdx = -1;
  wraps.forEach((el, i) => { if (el.dataset.step === stepId) foundIdx = i; });
  if (foundIdx < 0) return;
  wraps.forEach((el, i) => {
    const inner = el.querySelector('.pipeline-step');
    el.classList.toggle('done',   i <= foundIdx);
    el.classList.toggle('active', i === foundIdx + 1);
    if (inner) {
      inner.classList.toggle('done',   i <= foundIdx);
      inner.classList.toggle('active', i === foundIdx + 1);
    }
  });
}

function hideLoad() {
  $('loading').classList.remove('show');
  clearInterval(loadTimerId);
}

// ── Dark mode ──────────────────────────────────────────────
function applyDark(dark) {
  document.body.classList.toggle('dark', dark);
  $('icon-dark').style.display  = dark ? 'block' : 'none';
  $('icon-light').style.display = dark ? 'none'  : 'block';
  const val = $('profile-dark-value');
  if (val) val.textContent = `현재: ${dark ? '다크' : '라이트'}`;
}
function toggleDark() {
  const next = !document.body.classList.contains('dark');
  localStorage.setItem('LN_DARK', next ? '1' : '0');
  applyDark(next);
}
window.toggleDark = toggleDark;

// ── Helpers ────────────────────────────────────────────────
function showErr(id, msg) { const el = $(id); el.textContent = msg; el.classList.add('show'); }
function hideErr(id) { $(id).classList.remove('show'); }

function renderMd(el, text) {
  if (window.marked) el.innerHTML = marked.parse(text || '');
  else el.textContent = text || '';
}

function wireFile(inputId, displayId, dropId) {
  const inp  = $(inputId);
  const disp = $(displayId);
  const dz   = $(dropId);
  inp.addEventListener('change', () => {
    if (inp.files[0]) {
      disp.innerHTML = `${icon('i-check', 'icon-16')}<span>${escHtml(inp.files[0].name)}</span>`;
      disp.classList.add('show');
    }
  });
  dz.addEventListener('dragover',  e => { e.preventDefault(); dz.classList.add('over'); });
  dz.addEventListener('dragleave', () => dz.classList.remove('over'));
  dz.addEventListener('drop', e => {
    e.preventDefault(); dz.classList.remove('over');
    if (e.dataTransfer.files[0]) {
      inp.files = e.dataTransfer.files;
      inp.dispatchEvent(new Event('change'));
    }
  });
}

// ── Step 0: 강의 등록 ──────────────────────────────────────
async function doStep0() {
  hideErr('err-t0');
  const file = $('f-syllabus').files[0];
  if (!file) { showErr('err-t0', '강의계획서 파일을 업로드해주세요.'); return; }

  const fd = new FormData();
  fd.append('syllabus_file', file);

  showLoad('강의 등록 중', 'Gemini가 강의계획서를 분석하고 있습니다.', PIPELINE_STEP0);
  $('btn-t0').disabled = true;
  setTimeout(() => advanceStep('parse'), 800);
  setTimeout(() => advanceStep('analyze'), 2200);

  try {
    const r = await authFetch(`${API}/api/create-step0`, { method: 'POST', body: fd });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || `오류 ${r.status}`);
    }
    advanceStep('meta');
    const d = await r.json();
    advanceStep('save');
    gLectureId = d.lecture_id;
    const res = $('res-t0');
    res.classList.add('show');
    $('meta-t0').innerHTML = `<strong>${escHtml(d.title)}</strong> · ${escHtml(d.subject)} <span style="color:var(--muted)">(ID: ${d.lecture_id})</span>`;
    renderMd($('view-t0'), d.step0_analysis);
    setTimeout(() => res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
    showToast(`"${d.title}" 등록 완료`, 'ok');
  } catch (e) {
    showErr('err-t0', e.message || '요청 중 오류가 발생했습니다.');
    showToast('등록 중 오류가 발생했습니다.', 'err');
  } finally {
    hideLoad();
    $('btn-t0').disabled = false;
  }
}
window.doStep0 = doStep0;

// ── Lecture list (Tab 2) ───────────────────────────────────
async function loadLectures() {
  const list = $('lecture-list');
  list.innerHTML = '<div class="lecture-empty">불러오는 중...</div>';
  try {
    const r = await authFetch(`${API}/api/lectures`);
    const lectures = await r.json();
    if (!lectures.length) {
      list.innerHTML = `<div class="lecture-empty">등록된 강의가 없습니다.<br><span style="font-size:0.78rem;color:var(--muted)">강의 등록 탭에서 강의계획서를 업로드하세요.</span></div>`;
      return;
    }
    list.innerHTML = lectures.map(l => `
      <div class="lecture-card${gLectureId === l.id ? ' selected' : ''}" id="lc-${l.id}"
           onclick="selectLecture(${l.id}, '${escHtml(l.title)}', '${escHtml(l.subject)}')">
        <div class="lc-body">
          <div class="lc-title">${escHtml(l.title)}</div>
          <div class="lc-meta">${escHtml(l.subject)} · ID ${l.id} · ${escHtml(l.created_at)}</div>
        </div>
        <button class="btn-del" onclick="deleteLecture(event,${l.id})">${icon('i-trash','icon-14')}삭제</button>
      </div>
    `).join('');
  } catch {
    list.innerHTML = `<div class="lecture-empty">강의 목록을 불러오지 못했습니다.<br><span style="font-size:0.74rem">서버 연결을 확인해주세요.</span></div>`;
  }
}
window.loadLectures = loadLectures;

function selectLecture(id, title, subject) {
  gLectureId = id;
  document.querySelectorAll('#lecture-list .lecture-card').forEach(el => el.classList.remove('selected'));
  const card = $(`lc-${id}`);
  if (card) card.classList.add('selected');
  $('selected-name').textContent = `${title}  (ID: ${id})`;
  $('selected-banner').classList.add('show');
}
window.selectLecture = selectLecture;

async function deleteLecture(e, id) {
  e.stopPropagation();
  if (!confirm('이 강의와 연결된 모든 노트가 삭제됩니다. 계속할까요?')) return;
  try {
    await authFetch(`${API}/api/lectures/${id}`, { method: 'DELETE' });
    if (gLectureId === id) { gLectureId = null; $('selected-banner').classList.remove('show'); }
    loadLectures();
    showToast('강의가 삭제되었습니다.', 'info');
  } catch { showToast('삭제 중 오류가 발생했습니다.', 'err'); }
}
window.deleteLecture = deleteLecture;

// ── Step 2: 노트 생성 (SSE 스트리밍) ───────────────────────
async function doGenNote() {
  hideErr('err-tn');
  const lid = gLectureId;
  if (!lid) { showErr('err-tn', '위에서 강의를 먼저 선택해주세요.'); return; }

  const fd = new FormData();
  fd.append('lecture_id', lid);
  const week = parseInt($('tn-week').value) || 1;
  fd.append('week', week);

  const pdfFile   = $('f-pdf').files[0];
  const audioFile = $('f-audio').files[0];
  const noteText  = $('tn-note').value.trim();

  if (pdfFile) fd.append('pdf_file', pdfFile);

  let hasAudio = false;
  if (gRecBlob) { fd.append('audio_file', gRecBlob, 'recording.webm'); hasAudio = true; }
  else if (audioFile) { fd.append('audio_file', audioFile); hasAudio = true; }
  if (noteText) fd.append('note_text', noteText);

  // Start banner + modal (non-blocking — user can navigate tabs during generation)
  const genPipeline = hasAudio ? PIPELINE_NOTE_AUDIO : PIPELINE_NOTE_NOAUDIO;
  showGenBanner(
    hasAudio ? '음성 처리 중' : '자료 처리 중',
    hasAudio ? '음성을 텍스트로 변환하고 있습니다.' : '업로드된 자료를 정리하고 있습니다.',
    genPipeline
  );
  if (hasAudio) setTimeout(() => advanceGenStep('stt'), 400);
  $('btn-gen').disabled = true;

  const res    = $('res-tn');
  const viewEl = $('view-tn');
  $('tn-ok-badge').style.display  = 'none';
  $('tn-result-label').textContent = '노트 생성 중...';
  ['btn-dl-tn','btn-pdf-tn','btn-goto-th'].forEach(id => $(id).style.display = 'none');
  viewEl.innerHTML = '';
  res.classList.remove('show');

  let noteText2 = '';
  let firstChunk = true;

  try {
    const r = await authFetch(`${API}/api/generate-note`, { method: 'POST', body: fd });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || `오류 ${r.status}`);
    }
    updateGenBanner('자료 통합 중', 'STT + PDF + 필기 병합 중...', 'agg');

    const reader  = r.body.getReader();
    const decoder = new TextDecoder();
    let buf = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buf += decoder.decode(value, { stream: true });
      const lines = buf.split('\n');
      buf = lines.pop();
      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        let d;
        try { d = JSON.parse(line.slice(6)); } catch { continue; }

        if (d.t === 'c') {
          if (firstChunk) {
            firstChunk = false;
            updateGenBanner('노트 생성 중 (LLM)', 'Gemini가 노트를 작성하는 중...', 'gen');
            res.classList.add('show');
            streamAutoScroll = true;
            // gm-preview 표시
            const gmPrev = $('gm-preview');
            if (gmPrev) gmPrev.style.display = 'block';
            if (currentTab === 'tn') {
              setTimeout(() => res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
            }
          }
          noteText2 += d.v;
          genBannerNoteText = noteText2;
          viewEl.style.whiteSpace = 'pre-wrap';
          viewEl.textContent = noteText2;
          // 모달 내 실시간 미리보기 스크롤
          const gmPrev = $('gm-preview');
          if (gmPrev) { gmPrev.textContent = noteText2; gmPrev.scrollTop = gmPrev.scrollHeight; }
          // Tab2 자동스크롤 (모달 최소화 후 탭에서 볼 때)
          if (currentTab === 'tn') streamScrollToBottom();
        } else if (d.t === 'd') {
          gOutputId = d.id;
          genBannerOutputId = d.id;
          viewEl.style.whiteSpace = '';
          renderMd(viewEl, noteText2);
          $('meta-tn').innerHTML = `강의 ID: ${d.lid}  ·  노트 ID: ${d.id}  ·  ${noteText2.length.toLocaleString()}자`;
          $('tn-ok-badge').style.display = 'inline-flex';
          $('tn-result-label').textContent = '노트 생성 완료';
          ['btn-dl-tn','btn-pdf-tn','btn-goto-th','btn-search-tn'].forEach(id => $(id).style.display = 'inline-flex');
          viewEl.dataset.raw   = noteText2;
          viewEl.dataset.title = `${week}주차 노트`;
          completeGenBanner();
          showToast('노트 생성이 완료되었습니다', 'ok');
        } else if (d.t === 'err') {
          throw new Error(d.msg || '서버 오류');
        }
      }
    }
  } catch (e) {
    errorGenBanner(e.message || '요청 중 오류가 발생했습니다.');
    showErr('err-tn', e.message || '요청 중 오류가 발생했습니다.');
    showToast('노트 생성 중 오류가 발생했습니다.', 'err');
  } finally {
    $('btn-gen').disabled = false;
  }
}
window.doGenNote = doGenNote;

// ── Download ───────────────────────────────────────────────
function openInNewTab(url) {
  if (isCapacitor && Cap.Plugins.Browser) Cap.Plugins.Browser.open({ url });
  else window.open(url, '_blank');
}
function downloadUrl(outputId) {
  const url = `${API}/api/download-note/${outputId}`;
  return gToken ? `${url}?token=${encodeURIComponent(gToken)}` : url;
}
function doDownload()   { if (gOutputId)  openInNewTab(downloadUrl(gOutputId)); }
function doDownloadTh() { if (thOutputId) openInNewTab(downloadUrl(thOutputId)); }
window.doDownload   = doDownload;
window.doDownloadTh = doDownloadTh;

// ── PDF export ─────────────────────────────────────────────
function buildPrintableHtml(title, mdText) {
  const html = window.marked ? marked.parse(mdText || '') : `<pre>${escHtml(mdText)}</pre>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
  body { font-family:"Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif;color:#1C1C1E;padding:28px 36px;line-height:1.65;max-width:720px;margin:0 auto; }
  h1 { color:#1A2D5E;border-bottom:2px solid #E5E7EB;padding-bottom:6px;margin:1em 0 0.5em;font-size:1.45em; }
  h2 { color:#1A2D5E;margin:0.9em 0 0.35em;font-size:1.15em; }
  h3 { color:#3F3F44;margin:0.7em 0 0.25em;font-size:1.02em; }
  p { margin:0.4em 0; }
  ul,ol { padding-left:1.4em;margin:0.3em 0; }
  li { margin:0.18em 0; }
  table { border-collapse:collapse;width:100%;margin:0.7em 0;font-size:0.92em; }
  th,td { border:1px solid #E5E7EB;padding:6px 9px;text-align:left; }
  th { background:#F0F2F7; }
  code { background:#F0F2F7;padding:1px 4px;border-radius:4px; }
  pre { background:#F0F2F7;padding:10px;border-radius:6px;overflow-x:auto; }
  blockquote { border-left:3px solid #4B82C5;padding-left:12px;color:#3F3F44;margin:0.5em 0; }
  .pdf-title-bar { background:#1A2D5E;color:#fff;padding:18px 24px;border-radius:10px;margin-bottom:22px; }
  .pdf-title-bar .brand { font-size:0.78em;color:#4B82C5;font-weight:700;letter-spacing:0.08em; }
  .pdf-title-bar .ttl { font-size:1.4em;font-weight:700;margin-top:4px; }
  .pdf-meta { font-size:0.78em;color:#6E6E73;margin-top:4px; }
</style></head><body>
<div class="pdf-title-bar">
  <div class="brand">LECTURENOTE</div>
  <div class="ttl">${escHtml(title)}</div>
  <div class="pdf-meta">생성일: ${new Date().toLocaleDateString('ko-KR')}</div>
</div>${html}</body></html>`;
}

async function exportNoteToPdf(rawMd, title) {
  if (!rawMd) { showToast('내보낼 노트 내용이 없습니다.', 'err'); return; }
  const html = buildPrintableHtml(title || '강의 노트', rawMd);
  if (isCapacitor && Cap.Plugins.Filesystem) {
    try {
      showToast('PDF 생성 중...', 'info');
      const pdfBlob = await renderHtmlToPdf(html, title);
      const b64 = await blobToBase64(pdfBlob);
      const filename = `${(title || 'note').replace(/[^\w가-힣\-]/g, '_')}_${Date.now()}.pdf`;
      const writeRes = await Cap.Plugins.Filesystem.writeFile({ path: filename, data: b64, directory: 'DOCUMENTS', recursive: true });
      if (Cap.Plugins.Share) await Cap.Plugins.Share.share({ title: title || '강의 노트', url: writeRes.uri, dialogTitle: '노트 공유' });
      else showToast(`Documents/${filename} 저장됨`, 'ok');
    } catch (e) { showToast('PDF 저장 중 오류: ' + (e.message || ''), 'err'); }
    return;
  }
  try {
    const w = window.open('', '_blank');
    if (!w) { showToast('팝업 차단을 해제해주세요.', 'err'); return; }
    w.document.write(html); w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  } catch (e) { showToast('PDF 내보내기 실패: ' + (e.message || ''), 'err'); }
}

async function renderHtmlToPdf(html, title) {
  if (!window.html2pdf) throw new Error('html2pdf 라이브러리가 로드되지 않았습니다.');
  const container = document.createElement('div');
  container.style.cssText = 'position:fixed;left:-99999px;top:0;width:794px';
  container.innerHTML = html;
  document.body.appendChild(container);
  const opts = {
    margin: [12,12,14,12],
    filename: `${(title||'note').replace(/[^\w가-힣\-]/g,'_')}.pdf`,
    image: { type:'jpeg', quality:0.95 },
    html2canvas: { scale:2, useCORS:true, backgroundColor:'#ffffff' },
    jsPDF: { unit:'mm', format:'a4', orientation:'portrait' },
  };
  const pdfBlob = await window.html2pdf().set(opts).from(container).outputPdf('blob');
  container.remove();
  return pdfBlob;
}

function blobToBase64(blob) {
  return new Promise((res, rej) => {
    const fr = new FileReader();
    fr.onload = () => res(String(fr.result).split(',')[1]);
    fr.onerror = rej;
    fr.readAsDataURL(blob);
  });
}

function exportCurrentNotePdf() {
  const viewEl = $('view-tn');
  exportNoteToPdf(viewEl.dataset.raw, viewEl.dataset.title || '강의 노트');
}
function exportThNotePdf() {
  const viewEl = $('th-note-view');
  exportNoteToPdf(viewEl.dataset.raw, viewEl.dataset.title || '강의 노트');
}
window.exportCurrentNotePdf = exportCurrentNotePdf;
window.exportThNotePdf      = exportThNotePdf;

// ── Recording ──────────────────────────────────────────────
async function startRec() {
  try {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    recChunks = []; gRecBlob = null;
    const mimes = ['audio/webm;codecs=opus','audio/webm','audio/ogg;codecs=opus','audio/mp4'];
    gRecMime = mimes.find(m => MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(m)) || '';
    mediaRec = new MediaRecorder(stream, gRecMime ? { mimeType: gRecMime } : {});
    mediaRec.ondataavailable = e => { if (e.data.size > 0) recChunks.push(e.data); };
    mediaRec.onstop = () => {
      gRecBlob = new Blob(recChunks, { type: gRecMime || 'audio/webm' });
      stream.getTracks().forEach(t => t.stop());
      const kb = Math.round(gRecBlob.size / 1024);
      const el = $('rec-result');
      el.innerHTML = `${icon('i-check','icon-16')}<span>녹음 완료 — ${fmtTime(recSecs)} · ${kb.toLocaleString()} KB · 노트 생성 시 자동 업로드됨</span>`;
      el.classList.add('show');
      $('rec-status').textContent = '녹음 완료';
    };
    mediaRec.start(1000);
    $('btn-rec').style.display = 'none';
    $('btn-stop').classList.add('show');
    $('rec-timer').classList.add('show');
    $('rec-status').textContent = '녹음 중...';
    $('rec-result').classList.remove('show');
    recSecs = 0;
    recTimerId = setInterval(() => { recSecs++; $('rec-timer').textContent = fmtTime(recSecs); }, 1000);
  } catch (e) {
    alert('마이크 접근 권한이 필요합니다. 앱 설정에서 권한을 허용해주세요.');
  }
}
window.startRec = startRec;

function stopRec() {
  if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
  clearInterval(recTimerId);
  $('btn-rec').style.display = 'inline-flex';
  $('btn-stop').classList.remove('show');
  $('rec-timer').classList.remove('show');
}
window.stopRec = stopRec;

function fmtTime(s) {
  return String(Math.floor(s/60)).padStart(2,'0') + ':' + String(s%60).padStart(2,'0');
}

// ── Tab 3: 노트 조회 ───────────────────────────────────────
let thLectureId = null;
let thOutputId  = null;

async function loadThLectures() {
  const list = $('th-lecture-list');
  list.innerHTML = '<div class="lecture-empty">불러오는 중...</div>';
  try {
    const r = await authFetch(`${API}/api/lectures`);
    const lectures = await r.json();
    if (!lectures.length) {
      list.innerHTML = '<div class="lecture-empty">등록된 강의가 없습니다.</div>';
      return;
    }
    list.innerHTML = lectures.map(l => `
      <div class="lecture-card${thLectureId === l.id ? ' selected' : ''}" id="thlc-${l.id}"
           onclick="loadThNotes(${l.id}, '${escHtml(l.title)}', '${escHtml(l.subject)}')">
        <div class="lc-body">
          <div class="lc-title">${escHtml(l.title)}</div>
          <div class="lc-meta">${escHtml(l.subject)} · ${escHtml(l.created_at)}</div>
        </div>
      </div>
    `).join('');
  } catch {
    list.innerHTML = '<div class="lecture-empty">목록을 불러오지 못했습니다.</div>';
  }
}
window.loadThLectures = loadThLectures;

async function loadThNotes(lectureId, title) {
  thLectureId = lectureId;
  document.querySelectorAll('#th-lecture-list .lecture-card').forEach(el => el.classList.remove('selected'));
  const card = $(`thlc-${lectureId}`);
  if (card) card.classList.add('selected');

  const notesCard = $('th-notes-card');
  const notesList = $('th-notes-list');
  $('th-notes-title').textContent = `${title} — 생성된 노트`;
  notesCard.style.display = 'block';
  notesList.innerHTML = '<div class="lecture-empty">불러오는 중...</div>';
  $('th-note-view-card').classList.remove('show');

  try {
    const r = await authFetch(`${API}/api/lectures/${lectureId}/notes`);
    const notes = await r.json();
    if (!notes.length) {
      notesList.innerHTML = '<div class="lecture-empty">아직 생성된 노트가 없습니다.</div>';
      return;
    }
    notesList.innerHTML = notes.map((n, i) => {
      const weekLabel = n.week ? `${n.week}주차` : `${i + 1}주차`;
      return `
      <div class="note-item${thOutputId === n.id ? ' selected' : ''}" id="thni-${n.id}"
           onclick="loadThNote(${n.id}, '${escHtml(weekLabel)}')">
        <div class="note-item-body">
          <div class="note-item-title">${escHtml(weekLabel)} 노트</div>
          <div class="note-item-meta">${escHtml(n.created_at)} · ID: ${n.id}</div>
        </div>
        <button class="btn-del" onclick="deleteNote(event, ${n.id})">${icon('i-trash','icon-14')}삭제</button>
      </div>`;
    }).join('');
  } catch {
    notesList.innerHTML = '<div class="lecture-empty">노트 목록을 불러오지 못했습니다.</div>';
  }
}
window.loadThNotes = loadThNotes;

async function loadThNote(outputId, weekLabel) {
  thOutputId = outputId;
  closeNoteSearch('th');
  document.querySelectorAll('#th-notes-list .note-item').forEach(el => el.classList.remove('selected'));
  const item = $(`thni-${outputId}`);
  if (item) item.classList.add('selected');

  showLoad('노트 불러오는 중', '서버에서 노트를 가져오고 있습니다.', []);
  try {
    const r = await authFetch(`${API}/api/notes/${outputId}`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const viewCard = $('th-note-view-card');
    viewCard.classList.add('show');
    $('th-note-view-title').innerHTML = `
      <span class="ok-badge">${icon('i-check','icon-14')}</span>
      ${escHtml(weekLabel)} 노트
      <span style="font-weight:400;font-size:0.76rem;color:var(--muted);margin-left:6px">${escHtml(d.created_at)}</span>`;
    const v = $('th-note-view');
    v.dataset.raw   = d.note;
    v.dataset.title = `${weekLabel} 노트`;
    renderMd(v, d.note);
    setTimeout(() => viewCard.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
  } catch {
    showToast('노트를 불러오지 못했습니다.', 'err');
  } finally {
    hideLoad();
  }
}
window.loadThNote = loadThNote;

async function deleteNote(e, id) {
  e.stopPropagation();
  if (!confirm('이 노트를 삭제할까요?')) return;
  try {
    await authFetch(`${API}/api/notes/${id}`, { method: 'DELETE' });
    if (thOutputId === id) { thOutputId = null; $('th-note-view-card').classList.remove('show'); }
    loadThNotes(thLectureId, $('th-notes-title').textContent.replace(' — 생성된 노트', ''));
    showToast('노트가 삭제되었습니다.', 'info');
  } catch { showToast('삭제 중 오류가 발생했습니다.', 'err'); }
}
window.deleteNote = deleteNote;

function startEditNote() {
  const raw = $('th-note-view').dataset.raw || '';
  $('th-note-textarea').value = raw;
  $('th-note-view').style.display = 'none';
  $('th-note-edit').style.display = 'block';
  $('btn-edit-note').style.display = 'none';
}
function cancelEditNote() {
  $('th-note-view').style.display = '';
  $('th-note-edit').style.display = 'none';
  $('btn-edit-note').style.display = 'inline-flex';
}
async function saveEditNote() {
  const newContent = $('th-note-textarea').value.trim();
  if (!newContent) return;
  try {
    const r = await authFetch(`${API}/api/notes/${thOutputId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ summary: newContent }),
    });
    if (!r.ok) throw new Error();
    const v = $('th-note-view');
    v.dataset.raw = newContent;
    renderMd(v, newContent);
    cancelEditNote();
    showToast('노트가 저장되었습니다.', 'ok');
  } catch { showToast('저장 중 오류가 발생했습니다.', 'err'); }
}
window.startEditNote  = startEditNote;
window.cancelEditNote = cancelEditNote;
window.saveEditNote   = saveEditNote;

// ── Streaming auto-scroll ──────────────────────────────────
function initStreamScroll() {
  const content = $('content');
  content.addEventListener('scroll', () => {
    if (!streamAutoScroll) return;
    const distFromBottom = content.scrollHeight - content.scrollTop - content.clientHeight;
    if (distFromBottom > 60) streamAutoScroll = false;
  }, { passive: true });
}

function streamScrollToBottom() {
  if (!streamAutoScroll) return;
  const content = $('content');
  content.scrollTop = content.scrollHeight;
}

// ── Init ───────────────────────────────────────────────────
async function init() {
  wireFile('f-syllabus', 'fn-syllabus', 'dz-syllabus');
  wireFile('f-audio',    'fn-audio',    'dz-audio');
  wireFile('f-pdf',      'fn-pdf',      'dz-pdf');
  initStreamScroll();
  initNativeChrome();
  applyDark(localStorage.getItem('LN_DARK') === '1');

  // Try to restore session (keep splash until resolved, max 2.5s)
  const splashTimeout = setTimeout(() => $('boot-splash').classList.add('hide'), 2500);

  const savedToken = loadToken();
  if (savedToken) {
    gToken = savedToken;
    try {
      const r = await fetch(`${API}/api/auth/me`, {
        headers: { 'Authorization': `Bearer ${savedToken}` },
      });
      if (r.ok) {
        gUser = await r.json();
        clearTimeout(splashTimeout);
        $('boot-splash').classList.add('hide');
        showAuthRoot(false);
        return;
      }
    } catch {}
    clearToken();
  }

  // No valid session — show auth screens
  clearTimeout(splashTimeout);
  $('boot-splash').classList.add('hide');
  showAuthRoot(true);
  showAuthScreen('onboarding');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
