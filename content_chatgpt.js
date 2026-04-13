// content_chatgpt.js
console.log("Extensão ChatGPT Automator ativa.");

const CONFIG = {
    TEXTAREA_SELECTOR: '#prompt-textarea',
    SEND_BUTTON_SELECTOR: '[data-testid="send-button"]'
};

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function startChatGPTAutomation() {
    chrome.storage.local.get(['trelloData'], async (result) => {
        if (!result.trelloData) {
            console.log("Nenhum dado do Trello encontrado no storage.");
            return;
        }

        const { description } = result.trelloData;
        
        console.log("Aguardando campo de texto do ChatGPT...");
        
        let attempts = 0;
        let textarea = null;
        
        while (attempts < 20) {
            textarea = document.querySelector(CONFIG.TEXTAREA_SELECTOR);
            if (textarea) break;
            await wait(1000);
            attempts++;
        }

        if (!textarea) {
            console.error("Campo de texto do ChatGPT não encontrado.");
            return;
        }

        console.log("Inserindo dados...");
        
        // Simular a entrada de texto de forma que o React/ChatGPT perceba a mudança
        textarea.focus();
        document.execCommand('insertText', false, description + "\n\nvou te mandar o prompt não faça nada até eu enviar");
        
        // Esperar um pouco para o botão habilitar
        await wait(500);
        
        const sendButton = document.querySelector(CONFIG.SEND_BUTTON_SELECTOR);
        if (sendButton && !sendButton.disabled) {
            console.log("Enviando mensagem...");
            sendButton.click();
            
            // Limpar os dados para evitar envios duplicados se a página recarregar
            chrome.storage.local.remove(['trelloData']);
        } else {
            console.error("Botão de enviar não encontrado ou desabilitado.");
        }
    });
}

// Iniciar quando a URL for chatgpt.com
if (window.location.href.includes("chatgpt.com")) {
    // Esperar a página carregar
    setTimeout(startChatGPTAutomation, 3000);
}
