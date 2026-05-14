/* ============================================================
   LectureNote — App logic (Capacitor + Web)
   ============================================================ */

// ── API base URL (configurable) ────────────────────────────
// Order of resolution:
//   1. localStorage.LN_API_BASE  (user-overridden via Settings sheet)
//   2. window.__LN_API_BASE__    (compiled-in default from capacitor.config)
//   3. Auto-detect:
//        - if running inside Capacitor (file:// or capacitor://) → production URL
//        - if hostname is localhost / 127.0.0.1                 → http://localhost:8000
//        - else → same-origin (empty string)
const DEFAULT_PROD_API = 'https://lecturenote.up.railway.app';

function resolveApiBase() {
  const stored = localStorage.getItem('LN_API_BASE');
  if (stored) return stored.replace(/\/+$/, '');
  if (window.__LN_API_BASE__) return window.__LN_API_BASE__.replace(/\/+$/, '');

  const proto = location.protocol;
  const host  = location.hostname;
  if (proto === 'file:' || proto === 'capacitor:') return DEFAULT_PROD_API;
  if (host === 'localhost' || host === '127.0.0.1') return 'http://localhost:8000';
  return '';
}

let API = resolveApiBase();
window.LN = { get API() { return API; }, setAPI(u) { API = u.replace(/\/+$/, ''); localStorage.setItem('LN_API_BASE', API); } };

// ── Capacitor bridge (feature-detected) ────────────────────
const isCapacitor = !!(window.Capacitor && window.Capacitor.isNativePlatform && window.Capacitor.isNativePlatform());
const Cap = window.Capacitor;

async function initNativeChrome() {
  if (!isCapacitor) return;
  try {
    const { StatusBar, Style } = Cap.Plugins.StatusBar ? { StatusBar: Cap.Plugins.StatusBar, Style: { Dark: 'DARK', Light: 'LIGHT' } } : {};
    if (StatusBar) {
      await StatusBar.setBackgroundColor({ color: '#1A2D5E' });
      await StatusBar.setStyle({ style: 'DARK' });   // light text on dark bg
      await StatusBar.setOverlaysWebView({ overlay: false });
    }
  } catch (e) { console.warn('StatusBar plugin not available', e); }

  try {
    const SplashScreen = Cap.Plugins.SplashScreen;
    if (SplashScreen) setTimeout(() => SplashScreen.hide(), 200);
  } catch (e) { /* noop */ }

  try {
    const App = Cap.Plugins.App;
    if (App) {
      App.addListener('backButton', ({ canGoBack }) => {
        handleBackButton();
      });
    }
  } catch (e) { /* noop */ }
}

// ── State ──────────────────────────────────────────────────
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
let currentStep  = 0;
let pipelineSteps = [];

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
  // close sheet first
  if ($('settings-sheet').classList.contains('show')) {
    closeSettings();
    return;
  }
  // close result/edit if active in current tab
  if (currentTab === 'th' && $('th-note-edit').style.display === 'block') {
    cancelEditNote();
    return;
  }
  // navigate back through tabs
  if (tabHistory.length > 1) {
    tabHistory.pop();
    const prev = tabHistory[tabHistory.length - 1];
    showTab(prev, /*viaBack*/ true);
  } else {
    // at root — confirm exit
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

// ── Loading overlay with pipeline ──────────────────────────
const PIPELINE_NOTE_AUDIO = [
  { id: 'ingest', label: '소스 수집' },
  { id: 'stt',    label: 'Gemini STT 변환' },
  { id: 'agg',    label: '자료 통합 (Aggregation)' },
  { id: 'ctx',    label: '컨텍스트 주입 (Step 0)' },
  { id: 'gen',    label: '노트 생성 (LLM)' },
];
const PIPELINE_NOTE_NOAUDIO = [
  { id: 'ingest', label: '소스 수집' },
  { id: 'agg',    label: '자료 통합 (Aggregation)' },
  { id: 'ctx',    label: '컨텍스트 주입 (Step 0)' },
  { id: 'gen',    label: '노트 생성 (LLM)' },
];
const PIPELINE_STEP0 = [
  { id: 'parse',  label: '강의계획서 파싱' },
  { id: 'analyze',label: 'Step 0 분석 (Gemini)' },
  { id: 'meta',   label: '과목·교수 정보 추출' },
  { id: 'save',   label: '강의 등록' },
];

function showLoad(text, sub, steps) {
  pipelineSteps = (steps || []).slice();
  currentStep = 0;
  $('load-text').textContent = text || '처리 중...';
  $('load-sub').textContent = sub || '';
  $('load-timer').textContent = '경과 0초';
  $('load-steps').innerHTML = pipelineSteps.map((s, i) => `
    <div class="load-step${i === 0 ? ' active' : ''}" data-step="${s.id}">
      <span class="step-bullet">${icon('i-check', 'step-check')}</span>
      <span>${escHtml(s.label)}</span>
    </div>
  `).join('');
  $('load-steps').style.display = pipelineSteps.length ? 'flex' : 'none';
  $('loading').classList.add('show');

  loadElapsed = 0;
  clearInterval(loadTimerId);
  loadTimerId = setInterval(() => {
    loadElapsed++;
    $('load-timer').textContent = `경과 ${loadElapsed}초`;
  }, 1000);
}

function advanceStep(stepId) {
  // mark all up to (and including) stepId as done, set next as active
  const steps = document.querySelectorAll('.load-step');
  let foundIdx = -1;
  steps.forEach((el, i) => {
    if (el.dataset.step === stepId) foundIdx = i;
  });
  if (foundIdx < 0) return;
  steps.forEach((el, i) => {
    el.classList.toggle('done',   i <= foundIdx);
    el.classList.toggle('active', i === foundIdx + 1);
  });
}

function hideLoad() {
  $('loading').classList.remove('show');
  clearInterval(loadTimerId);
}

// ── Settings sheet (API URL) ───────────────────────────────
function openSettings() {
  $('settings-api').value = API;
  $('settings-sheet').classList.add('show');
}
function closeSettings() { $('settings-sheet').classList.remove('show'); }
function saveSettings() {
  const v = $('settings-api').value.trim();
  if (!v) { showToast('URL을 입력해주세요.', 'err'); return; }
  window.LN.setAPI(v);
  showToast('API URL이 저장되었습니다.', 'ok');
  closeSettings();
  // refresh lists
  if (currentTab === 'tn') loadLectures();
  if (currentTab === 'th') loadThLectures();
}
function resetSettings() {
  localStorage.removeItem('LN_API_BASE');
  API = resolveApiBase();
  $('settings-api').value = API;
  showToast('기본값으로 복원됨', 'info');
}
window.openSettings = openSettings;
window.closeSettings = closeSettings;
window.saveSettings = saveSettings;
window.resetSettings = resetSettings;

// ── Error helpers ──────────────────────────────────────────
function showErr(id, msg) { const el = $(id); el.textContent = msg; el.classList.add('show'); }
function hideErr(id) { $(id).classList.remove('show'); }

// ── Markdown render ────────────────────────────────────────
function renderMd(el, text) {
  if (window.marked) el.innerHTML = marked.parse(text || '');
  else el.textContent = text || '';
}

// ── File input wiring ──────────────────────────────────────
function wireFile(inputId, displayId, dropId, labelText = '파일') {
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
      const ev = new Event('change');
      inp.dispatchEvent(ev);
    }
  });
}

// ── STEP 0: 강의 등록 ──────────────────────────────────────
async function doStep0() {
  hideErr('err-t0');
  const file = $('f-syllabus').files[0];
  if (!file) { showErr('err-t0', '강의계획서 파일을 업로드해주세요.'); return; }

  const fd = new FormData();
  fd.append('syllabus_file', file);

  showLoad('강의 등록 중', 'Gemini가 강의계획서를 분석하고 있습니다.', PIPELINE_STEP0);
  $('btn-t0').disabled = true;

  // simulate pipeline progression while server processes
  setTimeout(() => advanceStep('parse'), 800);
  setTimeout(() => advanceStep('analyze'), 2200);

  try {
    const r = await fetch(`${API}/api/create-step0`, { method: 'POST', body: fd });
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
    res.scrollTop = 0;
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
    const r = await fetch(`${API}/api/lectures`);
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
    list.innerHTML = `<div class="lecture-empty">강의 목록을 불러오지 못했습니다.<br><span style="font-size:0.74rem">API URL을 확인해주세요 (우측 상단 ⚙)</span></div>`;
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
    await fetch(`${API}/api/lectures/${id}`, { method: 'DELETE' });
    if (gLectureId === id) {
      gLectureId = null;
      $('selected-banner').classList.remove('show');
    }
    loadLectures();
    showToast('강의가 삭제되었습니다.', 'info');
  } catch { showToast('삭제 중 오류가 발생했습니다.', 'err'); }
}
window.deleteLecture = deleteLecture;

// ── STEP 2: 노트 생성 (SSE 스트리밍) ───────────────────────
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
  if (gRecBlob) {
    fd.append('audio_file', gRecBlob, 'recording.webm');
    hasAudio = true;
  } else if (audioFile) {
    fd.append('audio_file', audioFile);
    hasAudio = true;
  }
  if (noteText) fd.append('note_text', noteText);

  const pipeline = hasAudio ? PIPELINE_NOTE_AUDIO : PIPELINE_NOTE_NOAUDIO;
  showLoad(hasAudio ? '음성 처리 중' : '자료 처리 중',
           hasAudio ? '음성을 텍스트로 변환하고 있습니다.' : '업로드된 자료를 정리하고 있습니다.',
           pipeline);
  setTimeout(() => advanceStep('ingest'), 600);
  if (hasAudio) setTimeout(() => advanceStep('stt'), 2200);

  $('btn-gen').disabled = true;

  // Reset result panel
  const res = $('res-tn');
  const viewEl = $('view-tn');
  $('tn-ok-badge').style.display = 'none';
  $('tn-result-label').textContent = '노트 생성 중...';
  $('btn-dl-tn').style.display = 'none';
  $('btn-pdf-tn').style.display = 'none';
  $('btn-goto-th').style.display = 'none';
  viewEl.innerHTML = '';
  res.classList.remove('show');

  let noteText2 = '';
  let firstChunk = true;

  try {
    const r = await fetch(`${API}/api/generate-note`, { method: 'POST', body: fd });
    if (!r.ok) {
      const e = await r.json().catch(() => ({}));
      throw new Error(e.detail || `오류 ${r.status}`);
    }
    if (hasAudio) advanceStep('stt');
    advanceStep('agg');
    advanceStep('ctx');

    const reader = r.body.getReader();
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
            advanceStep('gen');
            hideLoad();
            res.classList.add('show');
            setTimeout(() => res.scrollIntoView({ behavior: 'smooth', block: 'nearest' }), 50);
          }
          noteText2 += d.v;
          viewEl.style.whiteSpace = 'pre-wrap';
          viewEl.textContent = noteText2;
        } else if (d.t === 'd') {
          gOutputId = d.id;
          viewEl.style.whiteSpace = '';
          renderMd(viewEl, noteText2);
          $('meta-tn').innerHTML = `강의 ID: ${d.lid}  ·  노트 ID: ${d.id}  ·  ${noteText2.length.toLocaleString()}자`;
          $('tn-ok-badge').style.display = 'inline-flex';
          $('tn-result-label').textContent = '노트 생성 완료';
          $('btn-dl-tn').style.display = 'inline-flex';
          $('btn-pdf-tn').style.display = 'inline-flex';
          $('btn-goto-th').style.display = 'inline-flex';
          // store raw for PDF
          viewEl.dataset.raw = noteText2;
          viewEl.dataset.title = `${week}주차 노트`;
          showToast('노트 생성이 완료되었습니다', 'ok');
        } else if (d.t === 'err') {
          throw new Error(d.msg || '서버 오류');
        }
      }
    }
  } catch (e) {
    hideLoad();
    showErr('err-tn', e.message || '요청 중 오류가 발생했습니다.');
    showToast('노트 생성 중 오류가 발생했습니다.', 'err');
  } finally {
    hideLoad();
    $('btn-gen').disabled = false;
  }
}
window.doGenNote = doGenNote;

// ── Download (server-side HTML) ────────────────────────────
function openInNewTab(url) {
  if (isCapacitor && Cap.Plugins.Browser) {
    Cap.Plugins.Browser.open({ url });
  } else {
    window.open(url, '_blank');
  }
}

function doDownload() {
  if (!gOutputId) return;
  openInNewTab(`${API}/api/download-note/${gOutputId}`);
}
function doDownloadTh() {
  if (!thOutputId) return;
  openInNewTab(`${API}/api/download-note/${thOutputId}`);
}
window.doDownload = doDownload;
window.doDownloadTh = doDownloadTh;

// ── PDF export (client-side via html2pdf.js) ───────────────
function buildPrintableHtml(title, mdText) {
  const html = window.marked ? marked.parse(mdText || '') : `<pre>${escHtml(mdText)}</pre>`;
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escHtml(title)}</title>
<style>
  body { font-family: "Pretendard","Apple SD Gothic Neo","Malgun Gothic",sans-serif; color: #1C1C1E; padding: 28px 36px; line-height: 1.65; max-width: 720px; margin: 0 auto; }
  h1 { color: #1A2D5E; border-bottom: 2px solid #E5E7EB; padding-bottom: 6px; margin: 1em 0 0.5em; font-size: 1.45em; }
  h2 { color: #1A2D5E; margin: 0.9em 0 0.35em; font-size: 1.15em; }
  h3 { color: #3F3F44; margin: 0.7em 0 0.25em; font-size: 1.02em; }
  p  { margin: 0.4em 0; }
  ul, ol { padding-left: 1.4em; margin: 0.3em 0; }
  li { margin: 0.18em 0; }
  table { border-collapse: collapse; width: 100%; margin: 0.7em 0; font-size: 0.92em; }
  th, td { border: 1px solid #E5E7EB; padding: 6px 9px; text-align: left; }
  th { background: #F0F2F7; }
  code { background: #F0F2F7; padding: 1px 4px; border-radius: 4px; }
  pre { background: #F0F2F7; padding: 10px; border-radius: 6px; overflow-x: auto; }
  blockquote { border-left: 3px solid #4B82C5; padding-left: 12px; color: #3F3F44; margin: 0.5em 0; }
  .pdf-title-bar {
    background: #1A2D5E; color: #fff; padding: 18px 24px; border-radius: 10px;
    margin-bottom: 22px;
  }
  .pdf-title-bar .brand { font-size: 0.78em; color: #4B82C5; font-weight: 700; letter-spacing: 0.08em; }
  .pdf-title-bar .ttl { font-size: 1.4em; font-weight: 700; margin-top: 4px; }
  .pdf-meta { font-size: 0.78em; color: #6E6E73; margin-top: 4px; }
  hr { border: none; border-top: 1px solid #E5E7EB; margin: 1em 0; }
</style></head><body>
<div class="pdf-title-bar">
  <div class="brand">LECTURENOTE</div>
  <div class="ttl">${escHtml(title)}</div>
  <div class="pdf-meta">생성일: ${new Date().toLocaleDateString('ko-KR')}</div>
</div>
${html}
</body></html>`;
}

async function exportNoteToPdf(rawMd, title) {
  if (!rawMd) { showToast('내보낼 노트 내용이 없습니다.', 'err'); return; }
  const html = buildPrintableHtml(title || '강의 노트', rawMd);

  // Capacitor native: write file & share
  if (isCapacitor && Cap.Plugins.Filesystem) {
    try {
      showToast('PDF 생성 중...', 'info');
      const pdfBlob = await renderHtmlToPdf(html, title);
      const b64 = await blobToBase64(pdfBlob);
      const filename = `${(title || 'note').replace(/[^\w가-힣\-]/g, '_')}_${Date.now()}.pdf`;
      const writeRes = await Cap.Plugins.Filesystem.writeFile({
        path: filename,
        data: b64,
        directory: 'DOCUMENTS',
        recursive: true,
      });
      if (Cap.Plugins.Share) {
        await Cap.Plugins.Share.share({
          title: title || '강의 노트',
          url: writeRes.uri,
          dialogTitle: '노트 공유',
        });
      } else {
        showToast(`Documents/${filename} 저장됨`, 'ok');
      }
    } catch (e) {
      console.error(e);
      showToast('PDF 저장 중 오류: ' + (e.message || ''), 'err');
    }
    return;
  }

  // Web fallback: open print window
  try {
    const w = window.open('', '_blank');
    if (!w) { showToast('팝업 차단을 해제해주세요.', 'err'); return; }
    w.document.write(html);
    w.document.close();
    setTimeout(() => { w.focus(); w.print(); }, 400);
  } catch (e) {
    showToast('PDF 내보내기 실패: ' + (e.message || ''), 'err');
  }
}

async function renderHtmlToPdf(html, title) {
  // Uses html2pdf.js (bundled). Renders an offscreen container then exports.
  if (!window.html2pdf) throw new Error('html2pdf 라이브러리가 로드되지 않았습니다.');
  const container = document.createElement('div');
  container.style.position = 'fixed';
  container.style.left = '-99999px';
  container.style.top = '0';
  container.style.width = '794px';   // ~A4 width @ 96dpi
  container.innerHTML = html;
  document.body.appendChild(container);

  const opts = {
    margin:       [12, 12, 14, 12],
    filename:     `${(title || 'note').replace(/[^\w가-힣\-]/g, '_')}.pdf`,
    image:        { type: 'jpeg', quality: 0.95 },
    html2canvas:  { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' },
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
window.exportThNotePdf = exportThNotePdf;

// ── Recording (mic) ────────────────────────────────────────
async function ensureMicPermission() {
  if (isCapacitor) {
    // permission is requested implicitly by getUserMedia within the WebView;
    // AndroidManifest.xml must declare RECORD_AUDIO
    return true;
  }
  return true;
}

async function startRec() {
  try {
    await ensureMicPermission();
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
      el.innerHTML = `${icon('i-check', 'icon-16')}<span>녹음 완료 — ${fmtTime(recSecs)} · ${kb.toLocaleString()} KB · 노트 생성 시 자동 업로드됨</span>`;
      el.classList.add('show');
      $('rec-status').textContent = '녹음 완료';
    };
    mediaRec.start(1000);

    $('btn-rec').style.display  = 'none';
    $('btn-stop').classList.add('show');
    $('rec-timer').classList.add('show');
    $('rec-status').textContent = '녹음 중...';
    $('rec-result').classList.remove('show');

    recSecs = 0;
    recTimerId = setInterval(() => {
      recSecs++;
      $('rec-timer').textContent = fmtTime(recSecs);
    }, 1000);
  } catch (e) {
    console.error(e);
    alert('마이크 접근 권한이 필요합니다. 앱 설정에서 권한을 허용해주세요.');
  }
}
window.startRec = startRec;

function stopRec() {
  if (mediaRec && mediaRec.state !== 'inactive') mediaRec.stop();
  clearInterval(recTimerId);
  $('btn-rec').style.display  = 'inline-flex';
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
    const r = await fetch(`${API}/api/lectures`);
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
    const r = await fetch(`${API}/api/lectures/${lectureId}/notes`);
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
  document.querySelectorAll('#th-notes-list .note-item').forEach(el => el.classList.remove('selected'));
  const item = $(`thni-${outputId}`);
  if (item) item.classList.add('selected');

  showLoad('노트 불러오는 중', '서버에서 노트를 가져오고 있습니다.', []);
  try {
    const r = await fetch(`${API}/api/notes/${outputId}`);
    if (!r.ok) throw new Error();
    const d = await r.json();
    const viewCard = $('th-note-view-card');
    viewCard.classList.add('show');
    $('th-note-view-title').innerHTML = `
      <span class="ok-badge">${icon('i-check', 'icon-14')}</span>
      ${escHtml(weekLabel)} 노트
      <span style="font-weight:400;font-size:0.76rem;color:var(--muted);margin-left:6px">${escHtml(d.created_at)}</span>`;
    const v = $('th-note-view');
    v.dataset.raw = d.note;
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
    await fetch(`${API}/api/notes/${id}`, { method: 'DELETE' });
    if (thOutputId === id) {
      thOutputId = null;
      $('th-note-view-card').classList.remove('show');
    }
    loadThNotes(thLectureId, $('th-notes-title').textContent.replace(' — 생성된 노트', ''));
    showToast('노트가 삭제되었습니다.', 'info');
  } catch {
    showToast('삭제 중 오류가 발생했습니다.', 'err');
  }
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
    const r = await fetch(`${API}/api/notes/${thOutputId}`, {
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
window.startEditNote = startEditNote;
window.cancelEditNote = cancelEditNote;
window.saveEditNote = saveEditNote;

// ── Init ───────────────────────────────────────────────────
function init() {
  wireFile('f-syllabus', 'fn-syllabus', 'dz-syllabus');
  wireFile('f-audio',    'fn-audio',    'dz-audio');
  wireFile('f-pdf',      'fn-pdf',      'dz-pdf');

  initNativeChrome();

  // Hide boot splash after first paint
  setTimeout(() => $('boot-splash').classList.add('hide'), 350);

  // Show current API URL hint if it's the demo default
  if (API === DEFAULT_PROD_API && !localStorage.getItem('LN_API_BASE')) {
    setTimeout(() => {
      showToast('API URL: ' + API, 'info');
    }, 1100);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
