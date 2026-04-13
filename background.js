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
});
