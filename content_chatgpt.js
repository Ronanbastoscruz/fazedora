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

// Insere texto no campo do ChatGPT (contenteditable div)
async function typeIntoChat(text) {
    // ChatGPT usa um div contenteditable, não um textarea
    const input = document.querySelector('#prompt-textarea');
    if (!input) {
        console.error("[ChatGPT] Campo de texto não encontrado!");
        return false;
    }

    input.focus();

    // Limpa o que tinha antes
    input.innerHTML = '';

    // Cola o texto linha por linha via clipboard API
    await navigator.clipboard.writeText(text).catch(() => {
        // Fallback se clipboard falhar
        console.warn("Clipboard API falhou, tentando execCommand...");
    });

    // Dispara o evento de paste para o React processar
    const dataTransfer = new DataTransfer();
    dataTransfer.setData('text/plain', text);
    input.dispatchEvent(new ClipboardEvent('paste', {
        bubbles: true,
        cancelable: true,
        clipboardData: dataTransfer
    }));

    await wait(800);
    console.log("[ChatGPT] Texto inserido. Tamanho:", text.length, "chars.");
    return true;
}

// Clica no botão de enviar
async function clickSend() {
    await wait(500);
    const sendBtn = document.querySelector('[data-testid="send-button"]');
    if (sendBtn) {
        sendBtn.click();
        console.log("[ChatGPT] Botão de enviar clicado!");
        return true;
    }
    // Fallback: pressionar Enter
    const input = document.querySelector('#prompt-textarea');
    if (input) {
        input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
        console.log("[ChatGPT] Enter pressionado como fallback.");
        return true;
    }
    console.error("[ChatGPT] Botão de enviar não encontrado.");
    return false;
}

// Aguarda o ChatGPT parar de gerar resposta
async function waitForResponse(timeout = 180000) {
    console.log("[ChatGPT] Aguardando resposta...");
    await wait(4000); // Aguarda iniciar

    const start = Date.now();
    while (Date.now() - start < timeout) {
        const stopBtn = document.querySelector('[data-testid="stop-button"], button[aria-label="Stop generating"]');
        if (!stopBtn) {
            // Sem botão de stop = resposta finalizada
            await wait(2000); // Margem de segurança
            console.log("[ChatGPT] Resposta finalizada!");
            return true;
        }
        await wait(1000);
    }
    console.warn("[ChatGPT] Timeout aguardando resposta.");
    return false;
}

async function startChatGPTAutomation() {
    console.log("[ChatGPT 0/4] Iniciando automação...");

    // 1. Pegar dados do Trello do storage
    const result = await chrome.storage.local.get(['trelloData']);
    if (!result.trelloData) {
        console.warn("[ChatGPT] Nenhum dado do Trello no storage. Abortando.");
        return;
    }

    const { description } = result.trelloData;
    console.log("[ChatGPT 1/4] Dados carregados. Aguardando campo de texto...");

    // 2. Aguardar o campo de input aparecer
    const input = await waitForSelector('#prompt-textarea');
    if (!input) {
        console.error("[ChatGPT] Campo de texto não apareceu em 30s.");
        return;
    }

    console.log("[ChatGPT 2/4] Enviando dados do Trello...");
    const initialMsg = `${description}\n\nvou te mandar o prompt não faça nada até eu enviar`;
    await typeIntoChat(initialMsg);
    const sent1 = await clickSend();
    if (!sent1) return;

    // 3. Aguardar a resposta da mensagem inicial
    await waitForResponse();

    // 4. Enviar pr1.txt
    try {
        console.log("[ChatGPT 3/5] Enviando Prompt 1...");
        const prompt1 = await loadPromptFile('pr1.txt');
        await typeIntoChat(prompt1);
        await clickSend();
        await waitForResponse();

        // 5. Enviar pr2.txt
        console.log("[ChatGPT 4/5] Enviando Prompt 2...");
        const prompt2 = await loadPromptFile('pr2.txt');
        await typeIntoChat(prompt2);
        await clickSend();
        await waitForResponse();

        // 6. Finalização: Copiar tudo e abrir o site
        console.log("[ChatGPT 5/5] Finalizando: Copiando resultados e abrindo o site...");
        
        // Seleciona as mensagens do ChatGPT (markdown.prose) evitando duplicidade
        const messageElements = document.querySelectorAll('.markdown.prose');
        const allMessages = Array.from(messageElements)
            .map(el => el.innerText.trim())
            .filter(text => text.length > 0)
            .join('\n\n---\n\n');
        
        await navigator.clipboard.writeText(allMessages);
        console.log("Dados copiados para o clipboard (sem duplicatas)!");

        const { domain } = result.trelloData;
        chrome.runtime.sendMessage({ 
            action: "open_site_login", 
            domain: domain 
        });

    } catch (e) {
        console.error("[ChatGPT] Erro no fluxo de prompts:", e.message);
    }
}

// Aguarda a página carregar completamente antes de iniciar
window.addEventListener('load', () => {
    console.log("[ChatGPT Automator] Página carregada. Iniciando em 3s...");
    setTimeout(startChatGPTAutomation, 3000);
});
