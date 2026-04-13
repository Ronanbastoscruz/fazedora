// content_chatgpt.js
console.log("[ChatGPT Automator] Script carregado na URL:", window.location.href);

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function waitForSelector(selector, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const el = document.querySelector(selector);
        if (el) return el;
        await wait(500);
    }
    return null;
}

async function loadPromptFile(filename) {
    const url = chrome.runtime.getURL(filename);
    const response = await fetch(url);
    if (!response.ok) throw new Error(`Arquivo não encontrado: ${filename}`);
    return (await response.text()).trim();
}

async function typeIntoChat(text) {
    const input = document.querySelector('#prompt-textarea');
    if (!input) {
        console.error("[ChatGPT] Campo de texto não encontrado!");
        return false;
    }
    input.focus();
    input.innerHTML = '';
    await navigator.clipboard.writeText(text).catch(() => {});
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    input.dispatchEvent(new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
    }));
    await wait(800);
    console.log("[ChatGPT] Texto inserido.");
    return true;
}

async function clickSend() {
    await wait(500);
    const sendBtn = document.querySelector('[data-testid="send-button"]');
    if (sendBtn) {
        sendBtn.click();
        return true;
    }
    const input = document.querySelector('#prompt-textarea');
    if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        return true;
    }
    return false;
}

async function waitForResponse(timeout = 180000) {
    console.log("[ChatGPT] Aguardando resposta...");
    await wait(4000);
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const stopBtn = document.querySelector('[data-testid="stop-button"], button[aria-label="Stop generating"]');
        if (!stopBtn) {
            await wait(2000);
            return true;
        }
        await wait(1000);
    }
    return false;
}

// Extrai dados usando os novos marcadores
function extractData(text, startTag, endTag) {
    const startIdx = text.indexOf(startTag);
    const endIdx = text.indexOf(endTag);
    if (startIdx !== -1 && endIdx !== -1) {
        return text.substring(startIdx + startTag.length, endIdx).trim();
    }
    return null;
}

async function startChatGPTAutomation() {
    console.log("[ChatGPT] Iniciando automação...");
    const result = await chrome.storage.local.get(['trelloData']);
    if (!result.trelloData) return;

    const { description, domain } = result.trelloData;
    const input = await waitForSelector('#prompt-textarea');
    if (!input) return;

    // 1. Enviar Dados Trello
    console.log("[ChatGPT 1/5] Enviando dados do Trello...");
    await typeIntoChat(`${description}\n\nvou te mandar o prompt não faça nada até eu enviar`);
    await clickSend();
    await waitForResponse();

    // 2. Enviar Prompt 1
    console.log("[ChatGPT 2/5] Enviando Prompt 1...");
    const prompt1 = await loadPromptFile('pr1.txt');
    await typeIntoChat(prompt1);
    await clickSend();
    await waitForResponse();

    // 3. Extrair CSV1 e Texto da última resposta
    const responses = Array.from(document.querySelectorAll('.markdown.prose'));
    const lastResponse = responses[responses.length - 1]?.innerText || "";
    const csv1 = extractData(lastResponse, "[[[CSV1_START]]]", "[[[CSV1_END]]]");
    const texto_inst = extractData(lastResponse, "[[[TEXT_START]]]", "[[[TEXT_END]]]");
    
    console.log("[ChatGPT] CSV1 e Texto extraídos.");

    // 4. Enviar Prompt 2
    console.log("[ChatGPT 3/5] Enviando Prompt 2...");
    const prompt2 = await loadPromptFile('pr2.txt');
    await typeIntoChat(prompt2);
    await clickSend();
    await waitForResponse();

    // 5. Extrair CSV2 da última resposta
    const currentResponses = Array.from(document.querySelectorAll('.markdown.prose'));
    const lastResponse2 = currentResponses[currentResponses.length - 1]?.innerText || "";
    const csv2 = extractData(lastResponse2, "[[[CSV2_START]]]", "[[[CSV2_END]]]");
    
    console.log("[ChatGPT] CSV2 extraído.");

    // 6. Salvar todos os dados parseados e abrir o site
    console.log("[ChatGPT 4/5] Salvando dados parseados e abrindo o site...");
    await chrome.storage.local.set({ 
        chatgptResults: { csv1, csv2, texto_inst } 
    });

    // Copia tudo para o clipboard também, por segurança
    const allText = currentResponses.map(el => el.innerText).join('\n\n---\n\n');
    await navigator.clipboard.writeText(allText);

    console.log("[ChatGPT 5/5] Finalizado! Redirecionando...");
    chrome.runtime.sendMessage({ action: "open_site_login", domain: domain });
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_chatgpt_automation") {
        startChatGPTAutomation();
        sendResponse({ status: "started" });
    }
});

window.addEventListener('load', () => {
    if (window.location.href.includes("chatgpt.com")) {
        setTimeout(startChatGPTAutomation, 3000);
    }
});
