// Variáveis específicas do admin
let jsonFiles = {};
let adminVideoList = [];
let currentFilter = 'without-rhythm';
let adminRitmos = {};
let directoryHandle = null;

// IndexedDB para persistência do directoryHandle
const DB_NAME = 'AdminFileSystemPersistence';
const STORE_NAME = 'directoryHandles';
const DB_VERSION = 1;

// Funções para persistir directoryHandle no IndexedDB
async function openDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);
        request.onupgradeneeded = (event) => {
            const db = event.target.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: 'id' });
            }
        };
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveDirectoryHandle(handle) {
    if (!handle) return;
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readwrite');
        const store = tx.objectStore(STORE_NAME);
        await store.put({ id: 'directoryHandle', handle: handle, name: handle.name });
        localStorage.setItem('adminDirectoryName', handle.name);
        console.log(`Diretório salvo no IndexedDB: ${handle.name}`);
    } catch (err) {
        console.error('Erro ao salvar no IndexedDB:', err);
    }
}

async function restoreDirectoryHandle() {
    try {
        const db = await openDB();
        const tx = db.transaction(STORE_NAME, 'readonly');
        const store = tx.objectStore(STORE_NAME);
        const request = store.get('directoryHandle');
        return new Promise((resolve) => {
            request.onsuccess = async () => {
                const saved = request.result;
                if (saved?.handle) {
                    try {
                        const permission = await saved.handle.queryPermission({ mode: 'readwrite' });
                        if (permission === 'granted') {
                            directoryHandle = saved.handle;
                            localStorage.setItem('adminDirectoryName', saved.name);
                            console.log(`Diretório restaurado: ${saved.name}`);
                            document.getElementById('folderStatus').textContent = `✅ Conectado automaticamente a: ${saved.name}`;
                            await loadJsonFromDirectory(directoryHandle);
                            resolve(true);
                        } else if (permission === 'prompt') {
                            document.getElementById('folderStatus').textContent = '⚠️ Permissão necessária - Clique em "Escolher Pasta com JSONs"';
                            resolve(false);
                        } else {
                            document.getElementById('folderStatus').textContent = '⚠️ Permissão negada - Reconfigure a pasta';
                            resolve(false);
                        }
                    } catch (err) {
                        console.error('Erro ao verificar diretório:', err);
                        document.getElementById('folderStatus').textContent = `❌ Erro ao verificar diretório: ${err.message}`;
                        resolve(false);
                    }
                } else {
                    console.log('Nenhum diretório salvo encontrado.');
                    document.getElementById('folderStatus').textContent = '⚠️ Clique em "Escolher Pasta com JSONs" para começar';
                    resolve(false);
                }
            };
            request.onerror = () => {
                console.error('Erro ao restaurar:', request.error);
                document.getElementById('folderStatus').textContent = '❌ Erro ao acessar dados salvos';
                resolve(false);
            };
        });
    } catch (err) {
        console.error('Erro ao abrir IndexedDB:', err);
        document.getElementById('folderStatus').textContent = '❌ Erro ao abrir banco de dados';
        return false;
    }
}




// Seleciona pasta usando File System Access API
async function selectFolder(event) {
    event?.preventDefault();
    const folderStatus = document.getElementById('folderStatus');
    if (directoryHandle) {
        if (folderStatus) {
            folderStatus.textContent = `✅ Sistema já configurado: ${directoryHandle.name}`;
        }
        return;
    }
    if (!('showDirectoryPicker' in window)) {
        if (folderStatus) {
            folderStatus.textContent = '❌ Navegador não suporta File System API.';
        }
        return;
    }
    if (!window.isSecureContext) {
        if (folderStatus) {
            folderStatus.textContent = '❌ Use HTTPS ou localhost.';
        }
        return;
    }
    try {
        const newHandle = await window.showDirectoryPicker({
            mode: 'readwrite',
            startIn: 'documents'
        });
        directoryHandle = newHandle;
        await saveDirectoryHandle(newHandle);
        await loadJsonFromDirectory(newHandle);
        if (folderStatus) {
            folderStatus.textContent = `✅ Conectado a: ${newHandle.name}`;
        }
        localStorage.setItem('adminFolderSelected', 'true');
        localStorage.setItem('adminDirectoryName', newHandle.name);
        document.getElementById('selectFolderBtn').style.display = 'none';
        document.querySelector('main').style.display = 'block';
    } catch (err) {
        console.error('Erro:', err);
        if (folderStatus) {
            folderStatus.textContent = err.name === 'AbortError' ? '⚠️ Seleção cancelada.' : `❌ Erro: ${err.message}`;
        }
    }
}

// Carrega arquivos JSON da pasta selecionada
async function loadJsonFromDirectory(directoryHandle) {
    jsonFiles = {};
    adminRitmos = {};
    
    document.getElementById('folderStatus').textContent = 'Carregando arquivos...';

    if (!directoryHandle) {
        document.getElementById('folderStatus').textContent = '❌ Nenhuma pasta selecionada';
        return;
    }
    
    for await (const [name, handle] of directoryHandle.entries()) {
        if (handle.kind === 'file' && name.endsWith('.json')) {
            try {
                const file = await handle.getFile();
                const content = await file.text();
                const jsonData = JSON.parse(content);
                
                jsonFiles[name] = {
                    data: jsonData,
                    handle: handle,
                    name: name
                };
                
                if (name.includes('ritmo')) {
                    Object.assign(adminRitmos, jsonData);
                }
            } catch (error) {
                console.error(`Erro ao ler ${name}:`, error);
            }
        }
    }
    
    const loadedFiles = Object.keys(jsonFiles);
    document.getElementById('folderStatus').textContent = 
        `✅ ${loadedFiles.length} arquivo(s) carregado(s) de: ${directoryHandle.name}`;
    
    updateAdminInterface();
}

// Configura event listeners específicos do admin
function setupAdminEventListeners() {
    const selectBtn = document.getElementById('selectFolderBtn');
    if (selectBtn) {
        selectBtn.addEventListener('click', async (event) => {
            await selectFolder(event);
        });
        selectBtn.style.display = 'block'; // Garante que o botão esteja visível inicialmente
    }
    
    // Adiciona event listener para pesquisa do admin
    addSearchEventListener();
}

// Manipula a seleção da pasta com arquivos JSON
async function handleFolderSelection(event) {
    const files = Array.from(event.target.files).filter(file => file.name.endsWith('.json'));
    jsonFiles = {};
    adminRitmos = {};
    
    if (files.length === 0) {
        alert('Nenhum arquivo JSON encontrado na pasta selecionada.');
        return;
    }
    
    // Processa cada arquivo JSON selecionado
    for (let file of files) {
        try {
            const content = await file.text();
            const jsonData = JSON.parse(content);
            jsonFiles[file.name] = {
                data: jsonData,
                file: file,
                path: file.webkitRelativePath || file.name
            };
            
            // Se for arquivo de ritmos, adiciona aos ritmos administrativos
            if (file.name.includes('ritmo')) {
                Object.assign(adminRitmos, jsonData);
            }
        } catch (error) {
            console.error(`Erro ao ler arquivo ${file.name}:`, error);
        }
    }
    
    console.log('Arquivos JSON carregados:', Object.keys(jsonFiles));
    
    // Atualiza a interface com os novos dados
    updateAdminInterface();
}

// Foca no próximo vídeo sem ritmo
function focusNextVideoWithoutRhythm(currentVideoId) {
    console.log('Executando focusNextVideoWithoutRhythm - currentFilter:', currentFilter);
    if (currentFilter !== 'without-rhythm') {
        console.log('Saindo - filtro não é without-rhythm');
        return;
    }
    
    // Primeiro pega TODOS os containers visíveis
    const allVisibleContainers = Array.from(document.querySelectorAll('.video-container'))
    .filter(container => container.style.display !== 'none');

    // Encontra o index do container atual
    const currentIndex = allVisibleContainers.findIndex(container => 
    container.dataset.videoId === currentVideoId);

    
    // Encontra o próximo vídeo SEM ritmo após o atual
    let nextContainer = null;
    for (let i = currentIndex + 1; i < allVisibleContainers.length; i++) {
    if (allVisibleContainers[i].dataset.hasRhythm === 'false') {
        nextContainer = allVisibleContainers[i];
                break;
    }
    }

  
    
    if (nextContainer) {
        
        const nextInput = nextContainer.querySelector('.rhythm-input');
                
        // Scroll suave para o próximo vídeo
        console.log('Fazendo scroll para o próximo container');
        nextContainer.scrollIntoView({ behavior: 'smooth', block: 'center' });

        // Foca no input após o scroll
        setTimeout(() => {
            console.log('Tentando focar no input');
            nextInput.focus();
            nextInput.select();
            console.log('Foco aplicado no input:', document.activeElement === nextInput);
        }, 800);
    }
}

// Atualiza a interface administrativa
function updateAdminInterface() {
    // Mescla ritmos do common.js com ritmos administrativos
    const allRitmos = { ...window.ritmos, ...adminRitmos };
    
    // Atualiza estatísticas
    updateStats(allRitmos);
    
    // Recarrega os vídeos com a nova interface administrativa
    loadAdminVideos(allRitmos);
}

// Atualiza as estatísticas na interface
function updateStats(ritmos = {}) {
    const totalVideos = videoList.length;
    let withRhythm = 0;
    let withoutRhythm = 0;
    
    videoList.forEach(video => {
        const ritmoKey = `${video.title}:${video.videoId}`;
        const hasRhythm = ritmos[ritmoKey]?.ritmo;
        
        if (hasRhythm) {
            withRhythm++;
        } else {
            withoutRhythm++;
        }
    });
    
    // Atualiza elementos da interface
    document.getElementById('totalVideos').textContent = totalVideos;
    document.getElementById('withRhythm').textContent = withRhythm;
    document.getElementById('withoutRhythm').textContent = withoutRhythm;
}

// Carrega vídeos com interface administrativa
function loadAdminVideos(ritmos = {}) {
    const allRitmos = ritmos.length ? ritmos : { ...window.ritmos, ...adminRitmos };
    const container = document.getElementById("videos");
    const encaixeContainer = document.getElementById("encaixe-videos");
    
    // Limpa containers
    container.innerHTML = "";
    encaixeContainer.innerHTML = "<h1>Aulas de Violão - Encaixe da Voz</h1>";
    
    // Processa vídeos principais
    videoList.filter(v => !v.isEncaixe).forEach(video => {
        const videoElement = createAdminVideoElement(video, allRitmos);
        container.appendChild(videoElement);
    });
    
    // Processa vídeos de encaixe
    videoList.filter(v => v.isEncaixe).forEach(video => {
        const videoElement = createAdminVideoElement(video, allRitmos);
        encaixeContainer.appendChild(videoElement);
    });
    
    // Aplica filtro atual
    filterVideos(currentFilter);
    
    // Atualiza estatísticas
    updateStats(allRitmos);
}

// Cria elemento de vídeo com interface administrativa
function createAdminVideoElement(video, ritmos) {
    const { videoId, title, description } = video;
    const ritmoKey = `${title}:${videoId}`;
    const currentRhythm = ritmos[ritmoKey]?.ritmo || "";
    const hasRhythm = !!currentRhythm;
    
    const div = document.createElement("div");
    div.className = "video-container";
    div.dataset.videoId = videoId;
    div.dataset.hasRhythm = hasRhythm;
    div.id = "vid_" + videoId;
    
    // Extrai links de cifra
    const cifraLinks = extractCifraLinks(description);
    let cifraButton = '';
    let cifraList = '';
    
    if (cifraLinks.length === 1) {
        cifraButton = `<a href="${cifraLinks[0].link}" class="toggle-btn cifra-btn" data-download data-fileid="${cifraLinks[0].originalId}">Baixar Cifra</a>`;
    } else if (cifraLinks.length > 1) {
        cifraButton = `<button class="toggle-btn cifra-btn" onclick="toggleCifras(this)"><span class="toggle-indicator"></span> Cifras</button>`;
        cifraList = `<div class="cifra-list" style="display: none;">${cifraLinks.map(link => 
            `<a href="${link.link}" class="toggle-btn cifra-btn" data-download data-fileid="${link.originalId}">Baixar Cifra: ${link.title || 'Cifra'}</a>`
        ).join('')}</div>`;
    }
    
    // Status visual do ritmo
    const rhythmStatus = hasRhythm 
        ? `<span class="rhythm-status has-rhythm">✓ Tem ritmo</span>`
        : `<span class="rhythm-status no-rhythm">✗ Sem ritmo</span>`;
    
    div.innerHTML = `
        <h2>${title} ${rhythmStatus}</h2>
        ${hasRhythm ? `<p style="font-size: 16px; color: #ffc107; margin-bottom: 10px;" class="current-rhythm">Ritmo atual: ${currentRhythm}</p>` : ''}
        <div class="player-wrapper" data-video-id="${videoId}">
            <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${title}" />
            <button class="play-btn">▶</button>
        </div>
        <div class="buttons-container">
            <button type="button" class="toggle-btn" onclick="toggleDescription(this)"><span class="toggle-indicator"></span> Descrição</button>
            ${cifraButton}
            <button class="toggle-btn copy-link-btn" onclick="copyVideoLink('${videoId}')">Copiar Link da aula</button>
        </div>
        <div class="description">${convertLinks(description.replace(/\n/g, '<br>'))}</div>
        ${cifraList}
        <div class="rhythm-editor">
            <div class="rhythm-input-group">
                <input type="text" class="rhythm-input" placeholder="Digite o ritmo (ex: Rock, Pop Rock, Guarânia...)" 
                       value="${currentRhythm}" onkeypress="handleRhythmKeypress(event, '${videoId}', '${title.replace(/'/g, "\\'")}')">
                <button class="save-rhythm-btn" onclick="saveRhythm('${videoId}', '${title.replace(/'/g, "\\'")}')">Salvar</button>
            </div>
            <small style="color: #bbb;">Pressione Enter ou clique em Salvar para aplicar o ritmo</small>
        </div>
    `;
    
    // Adiciona event listener para o botão play
    div.querySelector(".play-btn").addEventListener("click", () => {
        
    });
    
    return div;
}

// Manipula tecla pressionada no campo de ritmo
function handleRhythmKeypress(event, videoId, title) {
    if (event.key === 'Enter') {
        event.preventDefault();
        saveRhythm(videoId, title);
    }
}

// Salva o ritmo de um vídeo
async function saveRhythm(videoId, title) {
    const container = document.getElementById(`vid_${videoId}`);
    const input = container.querySelector('.rhythm-input');
    const saveBtn = container.querySelector('.save-rhythm-btn');
    const newRhythm = input.value.trim();
    
    if (!newRhythm) {
        alert('Por favor, digite um ritmo válido.');
        return;
    }
    
    // Desabilita botão durante salvamento
    saveBtn.disabled = true;
    saveBtn.textContent = 'Salvando...';
    
    try {
        const ritmoKey = `${title}:${videoId}`;
        
        // Atualiza ritmos administrativos
        adminRitmos[ritmoKey] = { ritmo: newRhythm };
        
        // Determina qual arquivo JSON usar baseado no tipo de vídeo
        const video = videoList.find(v => v.videoId === videoId);
        const isEncaixeVideo = video?.isEncaixe;
        const jsonFileName = isEncaixeVideo ? 'ritmos_encaixe.json' : 'ritmos.json';
        
        // Encontra o arquivo JSON correspondente
        const jsonFile = jsonFiles[jsonFileName];
        if (!jsonFile) {
            throw new Error(`Arquivo ${jsonFileName} não encontrado. Certifique-se de que está na pasta selecionada.`);
        }
        
        // Atualiza os dados do arquivo
        jsonFile.data[ritmoKey] = { ritmo: newRhythm };
        
        // Simula salvamento (em ambiente real, aqui seria feita a escrita do arquivo)
        await simulateSaveToFile(jsonFileName, jsonFile.data);
        
        // Atualiza a interface
        updateVideoRhythmDisplay(videoId, title, newRhythm);
        
        // Feedback visual
        saveBtn.style.background = '#28a745';
        saveBtn.textContent = 'Salvo!';
        // Confirma que a pasta ainda está conectada
        if (directoryHandle) {
            document.getElementById('folderStatus').textContent = `✅ Salvo em: ${directoryHandle.name}`;
        }
        setTimeout(() => {
            saveBtn.disabled = false;
            saveBtn.textContent = 'Salvar';
            saveBtn.style.background = '';
        }, 2000);
        
        // Atualiza estatísticas
        updateStats({ ...window.ritmos, ...adminRitmos });
        
        console.log(`Ritmo "${newRhythm}" salvo para "${title}"`);
        
        // Foca no próximo vídeo sem ritmo
        console.log('Chamando focusNextVideoWithoutRhythm para:', videoId, 'Filtro atual:', currentFilter);
        focusNextVideoWithoutRhythm(videoId);

    } catch (error) {
        console.error('Erro ao salvar ritmo:', error);
        
        // Se perdeu conexão com a pasta, permite reselecionar
        if (error.message.includes('Pasta não selecionada')) {
            document.getElementById('folderStatus').textContent = '❌ Conexão perdida - Reselecione a pasta';
            directoryHandle = null;
        }
        
        alert('Erro ao salvar ritmo: ' + error.message);
        
        saveBtn.disabled = false;
        saveBtn.textContent = 'Erro';
        saveBtn.style.background = '#dc3545';
        
        setTimeout(() => {
            saveBtn.textContent = 'Salvar';
            saveBtn.style.background = '';
        }, 2000);
    }
}

// Salva arquivo usando File System Access API
async function simulateSaveToFile(fileName, data) {
    try {
        if (!directoryHandle) {
            throw new Error('Pasta não selecionada');
        }
        const fileHandle = await directoryHandle.getFileHandle(fileName, { create: true });
        const writable = await fileHandle.createWritable();
        await writable.write(JSON.stringify(data, null, 2));
        await writable.close();
        console.log(`Arquivo ${fileName} salvo com sucesso`);
    } catch (error) {
        console.error('Erro ao salvar arquivo:', error);
        document.getElementById('folderStatus').textContent = `❌ Erro ao salvar ${fileName}: ${error.message}`;
        throw error;
    }
}

// Atualiza a exibição do ritmo na interface
function updateVideoRhythmDisplay(videoId, title, newRhythm) {
    const container = document.getElementById(`vid_${videoId}`);
    
    // Atualiza status visual
    const statusSpan = container.querySelector('.rhythm-status');
    statusSpan.className = 'rhythm-status has-rhythm';
    statusSpan.innerHTML = '✓ Tem ritmo';
    
    // Atualiza ou adiciona parágrafo com ritmo atual
    let currentRhythmP = container.querySelector('.current-rhythm');
    if (!currentRhythmP) {
        currentRhythmP = document.createElement('p');
        currentRhythmP.className = 'current-rhythm';
        currentRhythmP.style.cssText = 'font-size: 16px; color: #ffc107; margin-bottom: 10px;';
        container.querySelector('h2').insertAdjacentElement('afterend', currentRhythmP);
    }
    currentRhythmP.textContent = `Ritmo atual: ${newRhythm}`;
    
    // Atualiza dataset
    container.dataset.hasRhythm = 'true';
}

// Filtra vídeos por status de ritmo
function filterVideos(filter) {
    currentFilter = filter;
    
    // Atualiza botões ativos
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    document.querySelector(`.filter-btn[onclick="filterVideos('${filter}')"]`)?.classList.add('active');
    
    // Filtra vídeos
    document.querySelectorAll('.video-container').forEach(container => {
        const hasRhythm = container.dataset.hasRhythm === 'true';
        let shouldShow = false;
        
        switch (filter) {
            case 'all':
                shouldShow = true;
                break;
            case 'with-rhythm':
                shouldShow = hasRhythm;
                break;
            case 'without-rhythm':
                shouldShow = !hasRhythm;
                break;
        }
        
        // Verifica também critério de pesquisa se houver
        if (shouldShow && currentSearchTerm) {
            const videoId = container.dataset.videoId;
            const video = videoList.find(v => v.videoId === videoId);
            shouldShow = video && video.title.toLowerCase().includes(currentSearchTerm.toLowerCase());
        }
        
        container.style.display = shouldShow ? 'block' : 'none';
    });
    
    // Atualiza visibilidade das seções
    updateSectionVisibility();
}

// Atualiza visibilidade das seções baseado nos filtros
function updateSectionVisibility() {
    const encaixeContainer = document.getElementById("encaixe-videos");
    const visibleEncaixeVideos = Array.from(encaixeContainer.querySelectorAll(".video-container"))
        .some(div => div.style.display !== "none");
    encaixeContainer.classList.toggle("hidden", !visibleEncaixeVideos);
}

// Sobrescreve a função de pesquisa para trabalhar com filtros administrativos
function searchVideos() {
    const term = document.getElementById("search").value.trim().toLowerCase();
    if (!term) return;
    
    currentSearchTerm = term;
    
    const resetBtn = document.getElementById("resetBtn");
    resetBtn.style.display = "inline-block";
    document.getElementById("suggestions").innerHTML = "";
    
    // Aplica pesquisa considerando filtro atual
    filterVideos(currentFilter);
}

// Inicialização automática quando a página carrega
document.addEventListener('DOMContentLoaded', async () => {
    console.log('DOM carregado, inicializando admin...');
    const mainContent = document.querySelector('main') || document.body;
    const selectBtn = document.getElementById('selectFolderBtn');
    const folderStatus = document.getElementById('folderStatus');
    
    // Carrega vídeos iniciais para evitar tela branca
    await loadVideos();
    setupAdminEventListeners();
    loadAdminVideos();
    
    const restored = await restoreDirectoryHandle();
    if (restored && directoryHandle) {
        selectBtn.style.display = 'none';
        mainContent.style.display = 'block';
        await loadJsonFromDirectory(directoryHandle);
        loadAdminVideos();
    } else {
        selectBtn.style.display = 'block';
        mainContent.style.display = 'block'; // Mantém interface visível
        if (folderStatus) {
            folderStatus.textContent = '⚠️ Clique em "Escolher Pasta com JSONs" para começar';
        }
    }
});

// Sobrescreve a função de reset para trabalhar com filtros administrativos
function resetSearch() {
    document.getElementById("search").value = "";
    currentSearchTerm = "";
    document.getElementById("resetBtn").style.display = "none";
    document.getElementById("suggestions").innerHTML = "";
    
    // Reaplica apenas o filtro atual
    filterVideos(currentFilter);
}

// Função para verificar se ainda tem acesso à pasta
async function checkDirectoryAccess() {
    if (!directoryHandle) return false;
    
    try {
        const permission = await directoryHandle.queryPermission({ mode: 'readwrite' });
        return permission === 'granted';
    } catch (error) {
        console.error('Erro ao verificar acesso:', error);
        return false;
    }
}

// Verificação periódica de conexão (opcional)
setInterval(async () => {
    if (directoryHandle) {
        const hasAccess = await checkDirectoryAccess();
        if (!hasAccess) {
            document.getElementById('folderStatus').textContent = '⚠️ Conexão com pasta perdida - Clique para reconectar';
            // Não limpa o directoryHandle para tentar restaurar
        }
    }
}, 30000); // Verifica a cada 30 segundos