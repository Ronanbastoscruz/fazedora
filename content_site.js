// content_site.js
console.log("[Site Automator] Script ativo na URL:", window.location.href);

async function wait(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Injeta e executa código JS no contexto real da página (MAIN WORLD)
function executeInPage(code) {
    const script = document.createElement('script');
    script.textContent = code;
    document.head.appendChild(script);
    script.remove();
}

async function handleLogin() {
    console.log("[Site Automator] Página de LOGIN detectada. Pressionando Enter...");
    await wait(1500); // Aguarda a extensão de senha preencher o campo

    // Pressiona Enter no formulário de login
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    
    // Tenta também submeter o form diretamente
    const form = document.querySelector('form');
    if (form) form.submit();

    // Verifica se houve redirecionamento a cada 2 segundos, por até 20 segundos
    console.log("[Site Automator] Aguardando redirecionamento para /painel/my-pages/...");
    for (let i = 0; i < 10; i++) {
        await wait(2000);
        if (window.location.href.includes('/painel/my-pages/')) {
            console.log("[Site Automator] Login OK! Redirecionado para o painel.");
            return; // A próxima execução do script vai lidar com o painel
        }
        console.log("[Site Automator] Ainda no login. Tentando Enter novamente...");
        const form2 = document.querySelector('form');
        if (form2) form2.submit();
        else document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', keyCode: 13, bubbles: true }));
    }
    console.error("[Site Automator] Falha no login após várias tentativas.");
}

async function handlePanel() {
    const stored = await chrome.storage.local.get(['trelloData']);
    if (!stored.trelloData) return;

    const domain = stored.trelloData.domain;
    let base = domain.startsWith('http') ? domain : 'https://' + domain;
    base = base.replace(/\/+$/, '');
    
    const editorUrl = `${base}/projetocontroler/editor/?page=1`;
    console.log("[Site Automator] Painel detectado! Navegando para o editor:", editorUrl);
    await wait(800);
    window.location.href = editorUrl;
}

async function handleEditor() {
    console.log("[Site Automator] Editor detectado! Iniciando sequência...");
    await wait(2000); // Aguarda o editor carregar

    // Chama bringlast()
    console.log("[Site Automator] Chamando bringlast()...");
    executeInPage('if(typeof bringlast === "function") bringlast(); else console.warn("bringlast não encontrado!");');
    
    await wait(1000);

    // Clica em .abrirtemplate
    const abrirBtn = document.querySelector('.abrirtemplate');
    if (abrirBtn) {
        console.log("[Site Automator] Clicando em .abrirtemplate...");
        abrirBtn.click();
    } else {
        console.warn("[Site Automator] .abrirtemplate não encontrado.");
    }

    await wait(800);

    // Chama newtemplate()
    const templateUrl = 'https://m3rsistemas.com.br/projetocontroler/templates/psiversion.txt';
    console.log("[Site Automator] Chamando newtemplate()...");
    executeInPage(`if(typeof newtemplate === "function") newtemplate('${templateUrl}'); else console.warn("newtemplate não encontrado!");`);

    console.log("[Site Automator] Sequência do editor concluída!");
}

async function startSiteAutomation() {
    const url = window.location.href;
    
    const stored = await chrome.storage.local.get(['trelloData']);
    if (!stored.trelloData) {
        console.warn("[Site Automator] Sem dados do Trello no storage.");
        return;
    }

    const domain = stored.trelloData.domain.replace(/^https?:\/\//, '').replace(/\/+$/, '');

    if (url.includes(domain + '/login') || url.includes(domain + '/painel/login') || (url.includes(domain) && url.includes('login'))) {
        await handleLogin();
    } else if (url.includes('/painel/my-pages/')) {
        await handlePanel();
    } else if (url.includes('/projetocontroler/editor/')) {
        await handleEditor();
    } else {
        console.log("[Site Automator] URL não reconhecida para automação:", url);
    }
}

// Escuta comandos do popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start_site_automation") {
        console.log("[Site Automator] Comando recebido do popup!");
        startSiteAutomation();
        sendResponse({ status: "started" });
    }
});

// Auto-execução: ao carregar qualquer página, verifica se deve agir
startSiteAutomation();
