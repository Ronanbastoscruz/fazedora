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

// 1. Trello -> ChatGPT
document.getElementById('btn-trello-gpt').addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab.url.includes('trello.com')) {
        setStatus('❌ Abra o Trello primeiro!', 'error'); return;
    }
    setStatus('⏳ Fase 1: Coletando Trello -> ChatGPT...', 'running');
    const res = await sendToContent('start_trello_automation', tab.id);
    if (res.error) setStatus('❌ Erro: ' + res.error, 'error');
    else setStatus('✅ Coleta iniciada!', 'success');
});

// 2. ChatGPT -> Site
document.getElementById('btn-gpt-site').addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab.url.includes('chatgpt.com')) {
        setStatus('❌ Abra o ChatGPT com as respostas!', 'error'); return;
    }
    setStatus('⏳ Fase 2: Extraindo dados e abrindo site...', 'running');
    const res = await sendToContent('extract_gpt_and_open_site', tab.id);
    if (res.error) setStatus('❌ Erro: ' + res.error, 'error');
    else setStatus('✅ Dados salvos! Abrindo site...', 'success');
});

// 3. Site -> Paste
document.getElementById('btn-site-paste').addEventListener('click', async () => {
    const tab = await getActiveTab();
    setStatus('⏳ Fase 3: Iniciando colagem no site...', 'running');
    const res = await sendToContent('start_site_sequence', tab.id);
    if (res.error) setStatus('❌ Erro: ' + res.error, 'error');
    else setStatus('✅ Sequência iniciada no editor!', 'success');
});

// Executar Tudo
document.getElementById('btn-all').addEventListener('click', async () => {
    const tab = await getActiveTab();
    if (!tab.url.includes('trello.com')) {
        setStatus('❌ Comece pelo Trello!', 'error'); return;
    }
    setStatus('⏳ Iniciando processo completo...', 'running');
    const res = await sendToContent('start_trello_automation', tab.id);
    if (res.error) setStatus('❌ Erro: ' + res.error, 'error');
    else setStatus('✅ Processo completo iniciado!', 'success');
});
