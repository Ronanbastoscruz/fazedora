// popup.js
const statusBox = document.getElementById('status');
const toggleActive = document.getElementById('toggle-active');

function setStatus(msg, type = '') {
    statusBox.textContent = msg;
    statusBox.className = 'status-box ' + type;
}

// Carrega o estado atual do toggle ao abrir o popup
chrome.storage.local.get(['fazedoraActive'], (res) => {
    toggleActive.checked = !!res.fazedoraActive;
    updateButtonStates();
});

// Salva o estado ao mudar o toggle
toggleActive.addEventListener('change', () => {
    const isActive = toggleActive.checked;
    chrome.storage.local.set({ fazedoraActive: isActive });
    updateButtonStates();
    setStatus(isActive ? 'Automação Ativada.' : 'Automação Desativada.', isActive ? 'success' : '');
});

function updateButtonStates() {
    const isActive = toggleActive.checked;
    document.querySelectorAll('.btn-all, .btn-phase').forEach(btn => {
        btn.disabled = !isActive;
    });
}

function setStatus(msg, type = '') {
    statusBox.textContent = msg;
    statusBox.className = 'status-box ' + type;
}

async function getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
}

async function sendToContent(action, tabId) {
    return new Promise((resolve) => {
        chrome.tabs.sendMessage(tabId, { action }, (response) => {
            if (chrome.runtime.lastError) {
                resolve({ error: chrome.runtime.lastError.message });
            } else {
                resolve(response || {});
            }
        });
    });
}

// Fase 1: Trello
document.getElementById('btn-fase1').addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab.url.includes('trello.com')) {
        setStatus('❌ Abra o Trello primeiro!', 'error'); return;
    }
    setStatus('⏳ Fase 1: Coletando dados do Trello...', 'running');
    const res = await sendToContent('start_trello_automation', tab.id);
    if (res.error) setStatus('❌ Erro: ' + res.error, 'error');
    else setStatus('✅ Fase 1 iniciada! Veja o console do Trello.', 'success');
});

// Fase 2: ChatGPT
document.getElementById('btn-fase2').addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab.url.includes('chatgpt.com')) {
        setStatus('❌ Abra o ChatGPT primeiro!', 'error'); return;
    }
    setStatus('⏳ Fase 2: Iniciando sequência no ChatGPT...', 'running');
    const res = await sendToContent('start_chatgpt_automation', tab.id);
    if (res.error) setStatus('❌ Erro: ' + res.error, 'error');
    else setStatus('✅ Fase 2 iniciada! Veja o console do ChatGPT.', 'success');
});

// Fase 3: Site do cliente
document.getElementById('btn-fase3').addEventListener('click', async () => {
    const tab = await getActiveTab();
    setStatus('⏳ Fase 3: Ativando automação no site do cliente...', 'running');
    const res = await sendToContent('start_site_automation', tab.id);
    if (res.error) setStatus('❌ Erro: ' + res.error, 'error');
    else setStatus('✅ Fase 3 iniciada! Veja o console do site.', 'success');
});

// Executar Tudo
document.getElementById('btn-all').addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab.url.includes('trello.com')) {
        setStatus('❌ Abra o Trello primeiro para executar tudo!', 'error'); return;
    }
    setStatus('⏳ Iniciando fluxo completo...', 'running');
    const res = await sendToContent('start_trello_automation', tab.id);
    if (res.error) setStatus('❌ Erro ao iniciar: ' + res.error, 'error');
    else setStatus('✅ Fluxo completo iniciado! Acompanhe o console.', 'success');
});
