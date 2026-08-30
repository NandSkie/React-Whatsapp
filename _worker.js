// _worker.js - Full Cloudflare Worker untuk NandReact

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    };

    // Handle CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    // API: Handshake
    if (path === '/api/handshake' && request.method === 'POST') {
      try {
        const result = await handleHandshake();
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // API: React
    if (path === '/api/react' && request.method === 'POST') {
      try {
        const body = await request.json();
        const result = await handleReact(body.url, body.reactions, body.token);
        return new Response(JSON.stringify(result), {
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      } catch (error) {
        return new Response(JSON.stringify({ success: false, error: error.message }), {
          status: 500,
          headers: { 'Content-Type': 'application/json', ...corsHeaders }
        });
      }
    }

    // Serve HTML untuk root
    if (path === '/' || path === '/index.html' || path === '') {
      const html = getHTML();
      return new Response(html, {
        headers: {
          'Content-Type': 'text/html; charset=utf-8',
          ...corsHeaders
        }
      });
    }

    // 404
    return new Response('Not Found', { status: 404 });
  }
};

// ============================================================
//  API Handlers
// ============================================================

const BASE_API = "https://satriareact.satriadeveloperz.workers.dev";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36";

async function fetchWithRetry(url, options, retries = 3) {
  for (let i = 0; i < retries; i++) {
    try {
      const response = await fetch(url, {
        ...options,
        headers: {
          'User-Agent': UA,
          'Origin': BASE_API,
          'Referer': BASE_API + '/',
          'Content-Type': 'application/json',
          ...options.headers
        }
      });
      
      if (response.status === 502 && i < retries - 1) {
        await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        continue;
      }
      
      return response;
    } catch (error) {
      if (i === retries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}

async function handleHandshake() {
  const response = await fetchWithRetry(BASE_API + '/api/handshake', {
    method: 'POST',
    body: JSON.stringify({})
  });

  const data = await response.json();
  
  if (response.status === 200 && data.success) {
    return {
      success: true,
      token: data.token,
      clientId: data.clientId,
      username: data.step1?.username || data.username,
      expiresInMs: data.expiresInMs || 60000
    };
  }
  
  throw new Error(`Handshake failed: ${response.status} - ${JSON.stringify(data)}`);
}

async function handleReact(url, reactions, token) {
  if (!token) {
    const handshake = await handleHandshake();
    token = handshake.token;
  }

  const response = await fetchWithRetry(BASE_API + '/api/react', {
    method: 'POST',
    body: JSON.stringify({
      url: url,
      reactions: reactions,
      token: token
    })
  });

  const data = await response.json();
  
  if (response.status === 200 && data.success) {
    return {
      success: true,
      count: data.count || reactions.length,
      message: data.message,
      task: data.task?.status,
      vip: data.vip?.packageName
    };
  }

  // Token expired - retry with new token
  if (response.status === 401 || response.status === 403) {
    const handshake = await handleHandshake();
    return handleReact(url, reactions, handshake.token);
  }

  throw new Error(`React failed: ${response.status} - ${JSON.stringify(data)}`);
}

// ============================================================
//  HTML Template
// ============================================================

function getHTML() {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>NandReact - WhatsApp Channel React</title>
  <style>
    :root {
      --bg-color: #fef08a;
      --card-bg: #ffffff;
      --border-color: #000000;
      --primary-btn: #a855f7;
      --secondary-btn: #3b82f6;
      --accent-yellow: #fde047;
      --accent-red: #ef4444;
      --shadow-val: 5px 5px 0px #000000;
    }

    * {
      box-sizing: border-box;
      font-family: 'Courier New', Courier, monospace;
      font-weight: bold;
    }

    body {
      background-color: var(--bg-color);
      margin: 0;
      padding: 20px 12px;
      display: flex;
      justify-content: center;
      align-items: center;
      min-height: 100vh;
    }

    .container {
      width: 100%;
      max-width: 500px;
      background: var(--card-bg);
      border: 4px solid var(--border-color);
      box-shadow: 8px 8px 0px #000000;
      border-radius: 12px;
      padding: 20px;
    }

    h1 {
      margin: 0 0 4px 0;
      font-size: 28px;
      text-transform: lowercase;
      letter-spacing: -1px;
    }
    
    .subtitle {
      font-size: 12px;
      color: #666;
      margin-bottom: 16px;
      font-weight: normal;
    }

    .badge {
      display: inline-block;
      background: #22c55e;
      color: #000;
      padding: 2px 10px;
      border: 2px solid #000;
      border-radius: 4px;
      font-size: 10px;
      margin-bottom: 12px;
      box-shadow: 2px 2px 0px #000;
    }

    .sub-link {
      display: inline-block;
      margin-bottom: 20px;
      color: #000;
      text-decoration: none;
      background: var(--accent-yellow);
      border: 2px solid var(--border-color);
      padding: 4px 8px;
      border-radius: 6px;
      box-shadow: 3px 3px 0px #000;
      font-size: 13px;
      cursor: pointer;
    }

    .form-group {
      margin-bottom: 18px;
    }

    label {
      display: block;
      margin-bottom: 6px;
      font-size: 14px;
    }

    input[type="text"],
    input[type="number"],
    select {
      width: 100%;
      padding: 10px;
      border: 3px solid var(--border-color);
      border-radius: 6px;
      background-color: #fff;
      font-size: 14px;
      outline: none;
      box-shadow: var(--shadow-val);
    }

    input[type="text"]:focus,
    select:focus {
      background-color: #f0fdf4;
    }

    .emoji-picker {
      border: 3px solid var(--border-color);
      border-radius: 8px;
      padding: 10px;
      background: #f8fafc;
      box-shadow: var(--shadow-val);
      display: grid;
      grid-template-columns: repeat(5, 1fr);
      gap: 8px;
    }

    .emoji-btn {
      background: #fff;
      border: 2px solid var(--border-color);
      font-size: 20px;
      padding: 6px;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 2px 2px 0px #000;
      transition: transform 0.05s;
      user-select: none;
    }

    .emoji-btn:active {
      transform: translate(2px, 2px);
      box-shadow: 0px 0px 0px #000;
    }

    .emoji-btn.selected {
      background: var(--accent-yellow);
      transform: translate(2px, 2px);
      box-shadow: 0px 0px 0px #000;
    }

    .emoji-btn:disabled {
      opacity: 0.4;
      cursor: not-allowed;
      transform: none;
      box-shadow: 2px 2px 0px #000;
    }

    .selected-box {
      display: flex;
      align-items: center;
      gap: 10px;
      margin-top: 10px;
      font-size: 14px;
      flex-wrap: wrap;
    }

    .btn-clear {
      background: var(--accent-red);
      color: white;
      border: 2px solid var(--border-color);
      padding: 4px 10px;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: 2px 2px 0px #000;
    }

    .custom-emoji-row {
      display: flex;
      gap: 8px;
    }

    .btn-add {
      background: #22c55e;
      color: #000;
      border: 3px solid var(--border-color);
      padding: 0 16px;
      border-radius: 6px;
      cursor: pointer;
      box-shadow: var(--shadow-val);
      white-space: nowrap;
    }

    .inline-row {
      display: flex;
      gap: 12px;
    }

    .inline-row .form-group {
      flex: 1;
    }

    .btn-submit {
      width: 100%;
      background: var(--primary-btn);
      color: #fff;
      border: 3px solid var(--border-color);
      padding: 14px;
      border-radius: 8px;
      font-size: 16px;
      cursor: pointer;
      box-shadow: var(--shadow-val);
      margin-top: 10px;
      transition: all 0.1s;
    }

    .btn-submit:disabled {
      opacity: 0.6;
      cursor: not-allowed;
    }

    .btn-submit:active:not(:disabled) {
      transform: translate(3px, 3px);
      box-shadow: 0px 0px 0px #000;
    }

    .btn-join {
      width: 100%;
      background: var(--secondary-btn);
      color: #fff;
      border: 3px solid var(--border-color);
      padding: 12px;
      border-radius: 8px;
      font-size: 14px;
      cursor: pointer;
      box-shadow: var(--shadow-val);
      margin-top: 12px;
      transition: all 0.1s;
    }

    .btn-join:active {
      transform: translate(3px, 3px);
      box-shadow: 0px 0px 0px #000;
    }

    .status-box {
      margin-top: 20px;
      background: #e0f2fe;
      border: 3px solid var(--border-color);
      padding: 12px;
      border-radius: 8px;
      font-size: 13px;
      box-shadow: var(--shadow-val);
      min-height: 60px;
      max-height: 200px;
      overflow-y: auto;
      white-space: pre-wrap;
      word-wrap: break-word;
      font-weight: normal;
      line-height: 1.5;
    }

    .status-box.success {
      background: #bbf7d0;
      border-color: #22c55e;
    }

    .status-box.error {
      background: #fecaca;
      border-color: #ef4444;
    }

    .status-box.info {
      background: #bfdbfe;
      border-color: #3b82f6;
    }

    .status-box.warning {
      background: #fde68a;
      border-color: #f59e0b;
    }

    .spinner {
      display: inline-block;
      width: 16px;
      height: 16px;
      border: 3px solid rgba(255,255,255,0.3);
      border-radius: 50%;
      border-top-color: #fff;
      animation: spin 0.6s linear infinite;
      vertical-align: middle;
      margin-right: 8px;
    }

    @keyframes spin {
      to { transform: rotate(360deg); }
    }

    .stats {
      display: flex;
      gap: 12px;
      margin-top: 8px;
      font-size: 11px;
      color: #666;
      font-weight: normal;
    }

    @media (max-width: 480px) {
      .container {
        padding: 16px;
      }
      .emoji-picker {
        grid-template-columns: repeat(4, 1fr);
      }
      .inline-row {
        flex-direction: column;
        gap: 0;
      }
    }
  </style>
</head>
<body>

  <div class="container">
    <h1>⎚ NandReact</h1>
    <div class="subtitle">⚡ WhatsApp Channel Reaction Sender</div>
    <span class="badge">✦ via Cloudflare Worker</span>

    <div class="form-group">
      <label for="wa-link">🔗 Link Channel WA:</label>
      <input type="text" id="wa-link" value="https://whatsapp.com/channel/0029VbBahyW545uyYpFcAn38/2304">
    </div>

    <div class="form-group">
      <label>😊 Pilih Emoji (max 4):</label>
      <div class="emoji-picker">
        <button class="emoji-btn" data-emoji="🔥">🔥</button>
        <button class="emoji-btn" data-emoji="❤️">❤️</button>
        <button class="emoji-btn" data-emoji="😂">😂</button>
        <button class="emoji-btn" data-emoji="😮">😮</button>
        <button class="emoji-btn" data-emoji="😢">😢</button>
        <button class="emoji-btn" data-emoji="🙏">🙏</button>
        <button class="emoji-btn" data-emoji="🎉">🎉</button>
        <button class="emoji-btn" data-emoji="👏">👏</button>
        <button class="emoji-btn" data-emoji="🥰">🥰</button>
        <button class="emoji-btn" data-emoji="😍">😍</button>
        <button class="emoji-btn" data-emoji="🤣">🤣</button>
        <button class="emoji-btn" data-emoji="😭">😭</button>
        <button class="emoji-btn" data-emoji="💯">💯</button>
        <button class="emoji-btn" data-emoji="✨">✨</button>
        <button class="emoji-btn" data-emoji="👍">👍</button>
      </div>
      <div class="selected-box">
        <span id="selectedEmojis">Terpilih: -</span>
        <button class="btn-clear" id="clearEmojis">✕ clear</button>
      </div>
    </div>

    <div class="form-group">
      <label for="custom-emoji">✏️ Custom emoji (pisah koma):</label>
      <div class="custom-emoji-row">
        <input type="text" id="custom-emoji" placeholder="🔥, ❤️, 🥶">
        <button class="btn-add" id="addCustomEmoji">+ add</button>
      </div>
    </div>

    <div class="inline-row">
      <div class="form-group">
        <label for="jumlah">🔢 Jumlah:</label>
        <input type="number" id="jumlah" value="1" min="1" max="100">
      </div>
      <div class="form-group">
        <label for="delay">⏱️ Delay:</label>
        <select id="delay">
          <option value="100">100ms</option>
          <option value="300" selected>300ms</option>
          <option value="500">500ms</option>
          <option value="1000">1000ms</option>
          <option value="2000">2000ms</option>
        </select>
      </div>
    </div>

    <button class="btn-submit" id="submitBtn">🚀 kirim reaksi</button>
    <button class="btn-join" id="joinBtn">📱 JOIN OUR CHANNEL</button>

    <div class="status-box" id="statusBox">⏳ Siap mengirim reaksi...</div>
    <div class="stats" id="statsBox"></div>
  </div>

  <script>
    // ============================================================
    //  Frontend - Fully client-side
    // ============================================================

    const MAX_EMOJIS = 4;
    const API_BASE = window.location.origin;

    // ---------- DOM Elements ----------
    const DOM = {
      waLink: document.getElementById('wa-link'),
      jumlah: document.getElementById('jumlah'),
      delay: document.getElementById('delay'),
      statusBox: document.getElementById('statusBox'),
      statsBox: document.getElementById('statsBox'),
      submitBtn: document.getElementById('submitBtn'),
      joinBtn: document.getElementById('joinBtn'),
      selectedEmojis: document.getElementById('selectedEmojis'),
      clearEmojis: document.getElementById('clearEmojis'),
      addCustomEmoji: document.getElementById('addCustomEmoji'),
      customEmoji: document.getElementById('custom-emoji'),
      emojiBtns: document.querySelectorAll('.emoji-btn')
    };

    let selectedEmojis = [];
    let totalSent = 0;

    // ---------- Emoji Validation ----------
    const EMOJI_REGEX = /[\\u{1F300}-\\u{1FAFF}\\u{2600}-\\u{27BF}\\u{FE0F}]/u;
    const TEXT_OK = new Set([
      "santuy", "sad", "nice", "siap", "ok", "good", "wow", "keren",
      "marempu", "mantap", "ganteng", "cantik", "anjay", "mantul", "limit",
      "by", "tenkyu", "dengerin", "sell", "gajelas", "kepo", "jelek"
    ]);

    function isEmoji(s) {
      const v = String(s || "").trim();
      if (!v) return false;
      return v.length <= 8 && (EMOJI_REGEX.test(v) || TEXT_OK.has(v.toLowerCase()));
    }

    // ---------- API Calls ----------
    async function apiCall(endpoint, data = null) {
      const url = API_BASE + endpoint;
      const options = {
        method: data ? 'POST' : 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      };
      
      if (data) {
        options.body = JSON.stringify(data);
      }
      
      const response = await fetch(url, options);
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || \`HTTP \${response.status}\`);
      }
      
      return result;
    }

    // ---------- Send Reactions ----------
    async function sendReactions() {
      const url = DOM.waLink.value.trim();
      if (!url) {
        setStatus('❌ Masukkan link channel WhatsApp!', 'error');
        return;
      }

      if (selectedEmojis.length === 0) {
        setStatus('❌ Pilih minimal 1 emoji!', 'error');
        return;
      }

      const count = parseInt(DOM.jumlah.value) || 1;
      if (count < 1 || count > 100) {
        setStatus('❌ Jumlah harus antara 1-100', 'error');
        return;
      }

      const delay = parseInt(DOM.delay.value) || 300;

      setLoading(true);
      setStatus('⏳ Handshake dengan server...', 'info');
      updateStats('Connecting...');

      try {
        // Handshake
        const handshake = await apiCall('/api/handshake');
        if (!handshake.success) {
          throw new Error(handshake.error || 'Handshake gagal');
        }
        
        setStatus(\`✅ Handshake berhasil! Token: \${handshake.token.slice(0, 16)}...\`, 'success');
        updateStats('Token: ' + handshake.token.slice(0, 20) + '...');

        let total = 0;
        const reactions = [...selectedEmojis];

        for (let i = 0; i < count; i++) {
          setStatus(\`⏳ Mengirim reaksi \${i + 1}/\${count}...\`, 'info');
          
          const result = await apiCall('/api/react', {
            url: url,
            reactions: reactions,
            token: handshake.token
          });
          
          total += result.count || reactions.length;
          totalSent += result.count || reactions.length;
          
          setStatus(
            \`✅ #\${i + 1}: \${result.count || reactions.length} reaksi terkirim (task: \${result.task || 'OK'})\`,
            'success'
          );
          updateStats(\`Total: \${totalSent} reaksi | Last: \${result.count || reactions.length}\`);
          
          if (i < count - 1 && delay > 0) {
            await new Promise(resolve => setTimeout(resolve, delay));
          }
        }

        setStatus(\`✅ Selesai! \${total} reaksi berhasil dikirim ke channel\`, 'success');
        updateStats(\`✅ Total reaksi terkirim: \${totalSent}\`);
      } catch (e) {
        setStatus(\`❌ Error: \${e.message}\`, 'error');
        console.error('Error:', e);
        updateStats('❌ ' + e.message);
      } finally {
        setLoading(false);
      }
    }

    // ---------- UI Functions ----------
    function updateSelectedDisplay() {
      if (selectedEmojis.length === 0) {
        DOM.selectedEmojis.textContent = 'Terpilih: -';
      } else {
        DOM.selectedEmojis.textContent = \`Terpilih: \${selectedEmojis.join(' ')} (\${selectedEmojis.length}/\${MAX_EMOJIS})\`;
      }
      
      DOM.emojiBtns.forEach(btn => {
        const emoji = btn.dataset.emoji;
        btn.classList.toggle('selected', selectedEmojis.includes(emoji));
        btn.disabled = selectedEmojis.length >= MAX_EMOJIS && !selectedEmojis.includes(emoji);
      });
    }

    function toggleEmoji(emoji) {
      const idx = selectedEmojis.indexOf(emoji);
      if (idx >= 0) {
        selectedEmojis.splice(idx, 1);
      } else if (selectedEmojis.length < MAX_EMOJIS) {
        selectedEmojis.push(emoji);
      }
      updateSelectedDisplay();
      saveState();
    }

    function addCustomEmojis() {
      const input = DOM.customEmoji.value.trim();
      if (!input) return;
      
      const emojis = input.split(/[,，\\s]+/).filter(e => e.trim());
      let added = 0;
      
      for (const e of emojis) {
        const clean = e.trim();
        if (isEmoji(clean) && !selectedEmojis.includes(clean) && selectedEmojis.length < MAX_EMOJIS) {
          selectedEmojis.push(clean);
          added++;
        }
      }
      
      if (added > 0) {
        updateSelectedDisplay();
        DOM.customEmoji.value = '';
        setStatus(\`✅ Menambahkan \${added} emoji\`, 'success');
        saveState();
      } else {
        setStatus('⚠️ Tidak ada emoji valid yang ditambahkan', 'warning');
      }
    }

    function clearEmojis() {
      selectedEmojis = [];
      updateSelectedDisplay();
      setStatus('🧹 Emoji dibersihkan', 'info');
      saveState();
    }

    function setStatus(message, type = 'info') {
      DOM.statusBox.textContent = message;
      DOM.statusBox.className = 'status-box';
      if (type) DOM.statusBox.classList.add(type);
    }

    function updateStats(message) {
      DOM.statsBox.textContent = message;
    }

    function setLoading(loading) {
      if (loading) {
        DOM.submitBtn.disabled = true;
        DOM.submitBtn.innerHTML = '<span class="spinner"></span> Mengirim...';
      } else {
        DOM.submitBtn.disabled = false;
        DOM.submitBtn.textContent = '🚀 kirim reaksi';
      }
    }

    // ---------- Save/Load State ----------
    function saveState() {
      try {
        localStorage.setItem('nandreact_state', JSON.stringify({
          emojis: selectedEmojis,
          url: DOM.waLink.value,
          count: DOM.jumlah.value,
          delay: DOM.delay.value,
          total: totalSent
        }));
      } catch (e) {}
    }

    function loadSavedState() {
      try {
        const saved = localStorage.getItem('nandreact_state');
        if (saved) {
          const state = JSON.parse(saved);
          if (state.emojis && Array.isArray(state.emojis)) {
            selectedEmojis = state.emojis.filter(e => isEmoji(e)).slice(0, MAX_EMOJIS);
            updateSelectedDisplay();
          }
          if (state.url) DOM.waLink.value = state.url;
          if (state.count) DOM.jumlah.value = state.count;
          if (state.delay) DOM.delay.value = state.delay;
          if (state.total) totalSent = state.total;
          updateStats(\`Total reaksi terkirim: \${totalSent}\`);
        }
      } catch (e) {
        console.warn('Failed to load saved state:', e);
      }
    }

    // ---------- Event Listeners ----------
    DOM.emojiBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        toggleEmoji(btn.dataset.emoji);
      });
    });

    DOM.clearEmojis.addEventListener('click', clearEmojis);
    DOM.addCustomEmoji.addEventListener('click', addCustomEmojis);
    DOM.customEmoji.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') addCustomEmojis();
    });

    DOM.submitBtn.addEventListener('click', sendReactions);

    DOM.joinBtn.addEventListener('click', () => {
      const url = DOM.waLink.value.trim();
      if (url) {
        window.open(url, '_blank');
      } else {
        setStatus('❌ Masukkan link channel terlebih dahulu!', 'error');
      }
    });

    // Auto-save
    DOM.waLink.addEventListener('change', saveState);
    DOM.jumlah.addEventListener('change', saveState);
    DOM.delay.addEventListener('change', saveState);

    // Keyboard shortcut: Ctrl+Enter to send
    document.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        DOM.submitBtn.click();
      }
    });

    // ---------- Initialize ----------
    const defaultEmojis = ['😂', '😮', '😸'];
    defaultEmojis.forEach(e => {
      if (isEmoji(e) && selectedEmojis.length < MAX_EMOJIS) {
        selectedEmojis.push(e);
      }
    });

    loadSavedState();
    updateSelectedDisplay();
    setStatus('✅ Siap mengirim reaksi! Pilih emoji dan klik kirim.', 'info');
    updateStats(\`Total reaksi terkirim: \${totalSent} | Shortcut: Ctrl+Enter\`);

    console.log('🚀 NandReact ready!');
    console.log(\`📌 Channel: \${DOM.waLink.value}\`);
    console.log(\`📌 Emojis: \${selectedEmojis.join(', ')}\`);
    console.log(\`📌 Total sent: \${totalSent}\`);
  </script>

</body>
</html>`;
}
