// content_site.js
console.log("[Site Automator] Script ativo na URL:", window.location.href);

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Executa código no MAIN WORLD e AGUARDA a conclusão
function executeInMainWorld(code) {
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({ action: 'execute_in_main', code }, () => {
            resolve();
        });
    });
}

async function handleLogin() {
    console.log("[Site Automator] Login...");
    await wait(2000);
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    const form = document.querySelector('form');
    if (form) form.submit();
}

async function handlePanel() {
    const stored = await chrome.storage.local.get(['trelloData']);
    if (!stored.trelloData) return;
    const domain = stored.trelloData.domain;
    let base = domain.startsWith('http') ? domain : 'https://' + domain;
    base = base.replace(/\/+$/, '');
    window.location.href = `${base}/projetocontroler/editor/?page=1`;
}

// Simulador de Tecla
function simulateKey(key, count = 1) {
    for (let i = 0; i < count; i++) {
        document.activeElement.dispatchEvent(new KeyboardEvent('keydown', { key: key, bubbles: true }));
        document.activeElement.dispatchEvent(new KeyboardEvent('keypress', { key: key, bubbles: true }));
        document.activeElement.dispatchEvent(new KeyboardEvent('keyup', { key: key, bubbles: true }));
    }
}

async function handleEditor() {
    console.log("[Site Automator] Editor detectado! Iniciando fluxo...");
    const stored = await chrome.storage.local.get(['chatgptResults']);
    if (!stored.chatgptResults) {
        console.error("Dados do ChatGPT não encontrados no storage.");
        return;
    }
    const { csv1, csv2, texto_inst } = stored.chatgptResults;

    await wait(3000);

    // 0. Carregar o template
    console.log("[0/6] Chamando newtemplate()...");
    const templateUrl = 'https://m3rsistemas.com.br/projetocontroler/templates/psiversion.txt';
    await executeInMainWorld(`if(typeof newtemplate === 'function') newtemplate('${templateUrl}');`);
    console.log("[0/6] Aguardando template carregar...");
    await wait(5000);

    // 1. Configuração Inicial
    console.log("[1/6] varrerClasses...");
    await executeInMainWorld('if(typeof varrerClasses === "function") varrerClasses();');
    await wait(2000);
    console.log("[1/6] iniciarProcessoCSV...");
    await executeInMainWorld('if(typeof iniciarProcessoCSV === "function") iniciarProcessoCSV();');
    await wait(2000);

    // 2. CSV 1
    console.log("[2/6] Inserindo CSV 1...");
    for (let i = 0; i < 2; i++) {
        const next = document.activeElement?.nextElementSibling || document.querySelector('input, textarea, [contenteditable]');
        if (next) next.focus();
        await wait(300);
    }
    if (document.activeElement) {
        document.activeElement.value = csv1;
        document.activeElement.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await wait(1000);
    console.log("[2/6] processarCSVManual...");
    await executeInMainWorld('if(typeof processarCSVManual === "function") processarCSVManual();');
    await wait(1000);
    simulateKey('Enter');
    await wait(3000);

    // 3. Bloco Klick e Limpeza
    console.log("[3/6] editorm3r klickblock...");
    await executeInMainWorld("editorm3r('klickblock_934814906840445a80088286946306');");
    await wait(3000);

    const delButtons = document.querySelectorAll('.m3r_itm_del');
    console.log(`[3/6] Encontrados ${delButtons.length} botões de delete.`);
    for (const btn of delButtons) {
        btn.click();
        await wait(1000);
    }
    await wait(1500);

    // 4. CSV 2
    console.log("[4/6] Inserindo CSV 2...");
    const uploadBtn = document.querySelector('#card_csv_upload');
    if (uploadBtn) uploadBtn.click();
    await wait(2000);

    const csvArea = document.querySelector('#csvTextarea');
    if (csvArea) {
        csvArea.focus();
        csvArea.value = csv2;
        csvArea.dispatchEvent(new Event('input', { bubbles: true }));
    }
    await wait(1000);
    const importBtn = document.querySelector('#importCsvBtn');
    if (importBtn) importBtn.click();
    await wait(2000);

    // Fechar menu
    console.log("[4/6] Fechando menu...");
    const fechar = document.querySelector('.fecharmenu');
    if (fechar) fechar.click();
    await wait(2000);

    // 5. Bloco de Texto e TinyMCE
    console.log("[5/6] editorm3r texto...");
    await executeInMainWorld("editorm3r('texto521335283732795a98031030841022');");
    await wait(3000);

    // Procura o iframe do TinyMCE (pa1_ifr até pa10_ifr)
    let tinyDoc = null;
    for (let i = 1; i <= 10; i++) {
        const ifr = document.getElementById(`pa${i}_ifr`);
        if (ifr && ifr.contentDocument) {
            tinyDoc = ifr.contentDocument;
            console.log(`[5/6] Iframe pa${i}_ifr encontrado!`);
            break;
        }
    }

    if (tinyDoc) {
        const tinyBody = tinyDoc.getElementById('tinymce');
        if (tinyBody) {
            tinyBody.innerHTML = texto_inst.replace(/\n/g, '<br>');
            console.log("[5/6] Texto institucional inserido no TinyMCE.");
        }
    } else {
        console.error("[5/6] Iframe do TinyMCE não encontrado.");
    }

    await wait(2000);
    console.log("[6/6] Fechando menu final...");
    const fecharFim = document.querySelector('.fecharmenu');
    if (fecharFim) fecharFim.click();

    console.log("=== AUTOMAÇÃO CONCLUÍDA COM SUCESSO! ===");
}

async function startSiteAutomation() {
    // Só roda se a extensão estiver ativada
    const flags = await chrome.storage.local.get(['fazedoraActive']);
    if (!flags.fazedoraActive) {
        console.log("[Site Automator] Extensão desativada. Ignorando.");
        return;
    }

    const url = window.location.href;
    const stored = await chrome.storage.local.get(['trelloData']);
    if (!stored.trelloData) return;

    const domain = stored.trelloData.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');

    if (url.includes(domain + '/login') || url.includes('login')) {
        await handleLogin();
    } else if (url.includes('/painel/my-pages/')) {
        await handlePanel();
    } else if (url.includes('/projetocontroler/editor/')) {
        await handleEditor();
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_site_automation") {
        startSiteAutomation();
        sendResponse({ status: "started" });
    }
});

// Auto-execução só se ativada
chrome.storage.local.get(['fazedoraActive'], (res) => {
    if (res.fazedoraActive) startSiteAutomation();
});
