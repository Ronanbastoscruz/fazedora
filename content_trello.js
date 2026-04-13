// content_trello.js
console.log("[Trello Automator] Script ativo e aguardando comando.");

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

async function waitForSelectorAll(selector, minCount = 2, timeout = 30000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const els = document.querySelectorAll(selector);
        if (els.length >= minCount) return els;
        await wait(500);
    }
    return null;
}

async function startAutomation() {
    // Só roda se a extensão estiver ativada
    const flags = await chrome.storage.local.get(['fazedoraActive']);
    if (!flags.fazedoraActive) {
        console.log("[Trello Automator] Extensão desativada. Ignorando.");
        return;
    }

    console.log("[1/6] Aguardando colunas do Trello carregarem...");

    // 1. Encontrar a 2ª coluna
    const listSelector = '[data-testid="list-wrapper"], .list-wrapper, .js-list';
    const lists = await waitForSelectorAll(listSelector, 2);
    if (!lists) {
        alert("Erro: Colunas do Trello não encontradas. Está logado e no quadro correto?");
        return;
    }

    const secondList = lists[1];
    console.log("[2/6] Segunda coluna encontrada. Aguardando cards...");

    // 2. Encontrar o 1º card da 2ª coluna
    const cardSelector = '[data-testid="trello-card"], .list-card, .js-member-draggable';
    let firstCard = null;
    for (let i = 0; i < 40; i++) {
        firstCard = secondList.querySelector(cardSelector);
        if (firstCard) break;
        await wait(500);
    }

    if (!firstCard) {
        alert("Erro: Nenhum card encontrado na segunda coluna.");
        return;
    }

    console.log("[3/6] Abrindo o primeiro card...");
    firstCard.click();

    // 3. Aguardar o modal abrir pelo título
    const titleSelector = '[data-testid="card-back-title-input"], .js-card-name-input';
    const cardTitleElem = await waitForSelector(titleSelector, 15000);
    if (!cardTitleElem) {
        alert("Erro: Modal do card não abriu.");
        return;
    }

    const fullTitle = cardTitleElem.value || cardTitleElem.innerText;
    const domain = extractDomain(fullTitle);
    console.log("[4/6] Card aberto. Título:", fullTitle, "| Domínio:", domain);

    // 4. Clicar em "Show more" se o botão existir
    console.log("[5/6] Procurando botão 'Show more'...");
    const showMoreBtn = document.querySelector('.n5aizWl5ghtEtS[role="button"]');
    if (showMoreBtn) {
        console.log("     Botão 'Show more' encontrado! Clicando...");
        showMoreBtn.click();
        await wait(1500);
    } else {
        console.log("     Botão 'Show more' não encontrado (descrição já visível).");
    }

    // 5. Extrair a descrição de .ak-renderer-document
    console.log("[6/6] Extraindo descrição de .ak-renderer-document...");
    let description = "";
    const rendererDoc = document.querySelector('.ak-renderer-document');
    if (rendererDoc) {
        description = rendererDoc.innerText.trim();
        console.log("     Descrição extraída! Tamanho:", description.length, "chars.");
    } else {
        console.warn("     .ak-renderer-document não encontrado.");
    }

    // 6. Validar antes de prosseguir
    if (!description || description.length < 5) {
        alert("Erro: Descrição não encontrada no card. Verifique se o card tem conteúdo na seção 'Description'.");
        return;
    }

    // 7. Pegar links de anexos
    const attachmentLinks = Array.from(document.querySelectorAll(
        '.attachment-thumbnail-details-title-options-item a, .js-download-attachment'
    )).map(el => el.href).filter(url => url && url.startsWith('http'));

    console.log(`Coleta finalizada: domínio="${domain}", descrição=${description.length} chars, ${attachmentLinks.length} anexo(s).`);

    // 8. Salvar no storage e acionar downloads
    chrome.storage.local.set({ trelloData: { domain, description, attachments: attachmentLinks } }, () => {
        if (attachmentLinks.length > 0) {
            chrome.runtime.sendMessage({ action: "download_attachments", attachments: attachmentLinks });
        }
        console.log("Abrindo ChatGPT em nova aba...");
        setTimeout(() => window.open("https://chatgpt.com", "_blank"), 1000);
    });
}

function extractDomain(text) {
    const match = text.match(/([a-z0-9-]+\.)*[a-z0-9-]+\.[a-z]{2,}/i);
    return match ? match[0] : text;
}

// Escuta o clique no ícone da extensão
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_trello_automation") {
        console.log("[Trello Automator] Comando recebido! Iniciando...");
        startAutomation();
        sendResponse({ status: "started" });
    }
});
