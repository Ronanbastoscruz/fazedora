// background.js - Gerencia downloads e navegação entre abas
console.log("Background service worker carregado.");

// 1. Escuta o clique no ícone da extensão
chrome.action.onClicked.addListener((tab) => {
    console.log("Ícone clicado na aba:", tab.url);
    if (tab.url.includes("trello.com")) {
        chrome.tabs.sendMessage(tab.id, { action: "start_trello_automation" }, (response) => {
            if (chrome.runtime.lastError) {
                console.error("Erro ao enviar mensagem:", chrome.runtime.lastError.message);
                alert("Erro: Certifique-se de que a aba do Trello foi atualizada após instalar a extensão.");
            } else {
                console.log("Comando enviado com sucesso:", response);
            }
        });
    } else {
        console.warn("Aba não compatível:", tab.url);
    }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.action === "download_attachments") {
        message.attachments.forEach(url => {
            chrome.downloads.download({ url: url });
        });
        sendResponse({ status: "downloads_started" });
    }

    if (message.action === "open_site_login") {
        let domain = message.domain;
        if (!domain.startsWith('http')) domain = 'https://' + domain;
        domain = domain.replace(/\/+$/, '');
        const loginUrl = `${domain}/login`;
        chrome.tabs.create({ url: loginUrl });
        console.log("Abrindo site do cliente:", loginUrl);
    }

    if (message.action === "execute_in_main") {
        const tabId = sender.tab?.id;
        if (!tabId) { console.error("Tab ID não disponível para execute_in_main."); return; }

        const codeToRun = message.code;
        chrome.scripting.executeScript({
            target: { tabId: tabId },
            world: "MAIN",
            func: (code) => { eval(code); },
            args: [codeToRun]
        }).then(() => {
            console.log("execute_in_main: código executado na aba", tabId);
        }).catch(err => {
            console.error("execute_in_main falhou:", err.message);
        });
        sendResponse({ status: "executed" });
    }
});
