// Variável global para acompanhar o ritmo e termo de pesquisa atuais
let isVideosLoaded = false;
let currentRhythm = "Todos os ritmos";
let currentSearchTerm = "";
const videoList = [];

// Modificação no event listener para garantir link correto
document.addEventListener("click", function(e) {
    if (e.target.matches(".cifra-btn[data-download]")) {
        e.preventDefault();
        // Usar o ID armazenado no atributo de dados, não o href
        const fileId = e.target.getAttribute("data-fileid");
        if (fileId && fileId.length === 33) {
            const secureLink = `https://drive.google.com/uc?export=download&id=${fileId}&cachebust=${Date.now()}`;
            const link = document.createElement("a");
            link.href = secureLink;
            link.download = "";
            link.style.display = "none";
            document.body.appendChild(link);
            setTimeout(() => {
                link.click();
                document.body.removeChild(link);
            }, 100);
        }
    }
});

function extractVideoId(url) {
    const regExp = /(?:v=)([a-zA-Z0-9_-]{11})/;
    const match = url.match(regExp);
    return match ? match[1] : null;
}

function convertLinks(text) {
    let formattedText = text.replace(/\n/g, '<br>');
    return formattedText.replace(/(^|\s|<br>)(https?:\/\/[^\s<]+)(?=\s|$|<br>|<(?!a\s))/g, '$1<a href="$2" target="_blank">$2</a>');
}

function extractCifraLinks(text) {
    const lines = text.split('\n');
    const cifraLinks = [];
    let lastTitle = null;

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        const match = line.match(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]{33})(?:\/view|\?usp=sharing)?/);
        if (match) {
            const fileId = match[1];
            const downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
            cifraLinks.push({ title: lastTitle, link: downloadLink, originalId: fileId });
        }
    }
    return cifraLinks.length > 1 
        ? cifraLinks.map(c => ({ title: c.title || "Sem título", link: c.link, originalId: c.originalId }))
        : cifraLinks.map(c => ({ title: null, link: c.link, originalId: c.originalId }));
}

function toggleDescription(button) {
    const desc = button.closest(".video-container").querySelector(".description");
    desc.style.display = desc.style.display === "block" ? "none" : "block";
    button.classList.toggle("active", desc.style.display === "block");
    history.replaceState(null, '', window.location.pathname + window.location.search);
}
// Função toggleCifras
function toggleCifras(button) {
    const videoContainer = button.closest(".video-container");
    const cifraList = videoContainer.querySelector(".cifra-list");
    if (cifraList) {
        cifraList.style.display = cifraList.style.display === "block" ? "none" : "block";
        button.classList.toggle("active", cifraList.style.display === "block");
    }
    history.replaceState(null, '', window.location.pathname + window.location.search);
}

document.addEventListener("click", function(e) {
    if (e.target.classList.contains("play-btn")) {
        const wrapper = e.target.closest(".player-wrapper");
        const videoId = wrapper.dataset.videoId;
        pauseAllVideos(videoId); // Pausar outros vídeos
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0&enablejsapi=1`; // Adicionar enablejsapi
        iframe.frameBorder = "0";
        iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture";
        iframe.allowFullscreen = true;
        iframe.style.width = "100%";
        iframe.style.height = "100%";
        wrapper.innerHTML = "";
        wrapper.appendChild(iframe);
    }
});


function searchVideos() {
    const term = document.getElementById("search").value.trim().toLowerCase();
    if (!term) return;
    
    currentSearchTerm = term;
    
    const resetBtn = document.getElementById("resetBtn");
    resetBtn.style.display = "inline-block";
    document.getElementById("suggestions").innerHTML = "";
    
    document.querySelectorAll(".video-container").forEach(div => {
        const vid = div.dataset.videoId;
        const data = videoList.find(v => v.videoId === vid);
        
        const matchesSearch = data && data.title.toLowerCase().includes(term);
        
        let matchesRhythm = true;
        if (window.ritmos) {
            const ritmoKey = `${data?.title}:${vid}`;
            const videoRhythm = window.ritmos[ritmoKey]?.ritmo || "";
            matchesRhythm = (currentRhythm === "Todos os ritmos" || videoRhythm === currentRhythm);
        }
        
        div.style.display = (matchesSearch && matchesRhythm) ? "block" : "none";
    });
    const encaixeContainer = document.getElementById("encaixe-videos");
    const visibleEncaixeVideos = Array.from(encaixeContainer.querySelectorAll(".video-container")).some(div => div.style.display !== "none");
    encaixeContainer.classList.toggle("hidden", !visibleEncaixeVideos);
    updateRhythmMessage();
}



// Função auxiliar para atualizar a mensagem
function updateRhythmMessage() {
    const messageEl = document.getElementById("rhythmMessage");
    if (!messageEl) return;
    
    if (currentSearchTerm) {
        if (currentRhythm === "Todos os ritmos") {
            messageEl.textContent = `Exibindo resultados para "${currentSearchTerm}" em todos os ritmos`;
        } else {
            messageEl.textContent = `Exibindo resultados para "${currentSearchTerm}" no ritmo de ${currentRhythm}`;
        }
    } else {
        if (currentRhythm === "Todos os ritmos") {
            messageEl.textContent = "Exibindo músicas de todos os ritmos";
        } else {
            messageEl.textContent = `Exibindo músicas no ritmo de ${currentRhythm}`;
        }
    }
}



function resetSearch() {
    document.getElementById("search").value = "";
    currentSearchTerm = "";
    document.getElementById("resetBtn").style.display = "none";
    document.getElementById("suggestions").innerHTML = "";
    
    // Reaplica apenas o filtro de ritmo atual
    document.querySelectorAll(".video-container").forEach(div => {
        const vid = div.dataset.videoId;
        const data = videoList.find(v => v.videoId === vid);
        
        // Verifica apenas o critério de ritmo
        let shouldDisplay = true;
        if (window.ritmos) {
            const ritmoKey = `${data?.title}:${vid}`;
            const videoRhythm = window.ritmos[ritmoKey]?.ritmo || "";
            shouldDisplay = (currentRhythm === "Todos os ritmos" || videoRhythm === currentRhythm);
        }
        
        div.style.display = shouldDisplay ? "block" : "none";
    });
    const encaixeContainer = document.getElementById("encaixe-videos");
    const visibleEncaixeVideos = Array.from(encaixeContainer.querySelectorAll(".video-container")).some(div => div.style.display !== "none");
    encaixeContainer.classList.toggle("hidden", !visibleEncaixeVideos);
    // Atualiza a mensagem
    updateRhythmMessage();
}



window.onscroll = function() {
    document.getElementById("topBtn").style.display = document.documentElement.scrollTop > 200 ? "block" : "none";
};

function scrollToTop() {
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function filterByRhythm(rhythm) {
    currentRhythm = rhythm;
    
    const buttons = document.querySelectorAll(".rhythm-btn");
    buttons.forEach(btn => btn.classList.remove("active"));
    document.querySelector(`.rhythm-btn[data-rhythm="${rhythm}"]`)?.classList.add("active");

    document.querySelectorAll(".video-container").forEach(div => {
        const videoId = div.dataset.videoId;
        const data = videoList.find(v => v.videoId === videoId);
        if (!data) return;
        
        const ritmoKey = `${data.title}:${videoId}`;
        const videoRhythm = window.ritmos[ritmoKey]?.ritmo || "";
        const matchesRhythm = (rhythm === "Todos os ritmos" || videoRhythm === rhythm);
        
        const matchesSearch = !currentSearchTerm || 
                           data.title.toLowerCase().includes(currentSearchTerm.toLowerCase());
        
        div.style.display = (matchesRhythm && matchesSearch) ? "block" : "none";
    });

    const message = document.getElementById("rhythmMessage") || document.createElement("div");
    message.id = "rhythmMessage";
    message.style.textAlign = "center";
    message.style.margin = "10px 0";
    message.style.color = "#bbb";
    
    if (currentSearchTerm) {
        if (rhythm === "Todos os ritmos") {
            message.textContent = `Exibindo resultados para "${currentSearchTerm}" em todos os ritmos`;
        } else {
            message.textContent = `Exibindo resultados para "${currentSearchTerm}" no ritmo de ${rhythm}`;
        }
    } else {
        if (rhythm === "Todos os ritmos") {
            message.textContent = "Exibindo músicas de todos os ritmos";
        } else {
            message.textContent = `Exibindo músicas no ritmo de ${rhythm}`;
        }
    }
    const encaixeContainer = document.getElementById("encaixe-videos");
    const visibleEncaixeVideos = Array.from(encaixeContainer.querySelectorAll(".video-container")).some(div => div.style.display !== "none");
    encaixeContainer.classList.toggle("hidden", !visibleEncaixeVideos);
    document.getElementById("videos").prepend(message);
}

async function loadRhythmButtons() {
    const ritmosResponse = await fetch('ritmos.json');
    window.ritmos = await ritmosResponse.json();
    const ritmosEncaixe = await (await fetch('ritmos_encaixe.json')).json();
    Object.assign(window.ritmos, ritmosEncaixe);
    const rhythms = ["Todos os ritmos", ...new Set(Object.values(window.ritmos).map(r => r.ritmo).filter(r => r))];
    const container = document.getElementById("rhythmButtons");

    rhythms.forEach(rhythm => {
        const btn = document.createElement("button");
        btn.className = "rhythm-btn";
        btn.dataset.rhythm = rhythm;
        btn.textContent = rhythm;
        btn.onclick = () => filterByRhythm(rhythm);
        container.appendChild(btn);
    });

    filterByRhythm("Todos os ritmos");
}

async function loadVideos() {
    if (isVideosLoaded) return;
    isVideosLoaded = true;
    const container = document.getElementById("videos");
    const encaixeContainer = document.getElementById("encaixe-videos");
    container.innerHTML = "<p style='text-align: center; padding: 20px;'>Carregando vídeos...</p>";
    encaixeContainer.innerHTML = "<h1>Aulas de Violão - Encaixe da Voz</h1>";

    try {
        const [videoResponse, ritmosResponse, encaixeVideoResponse] = await Promise.all([
            fetch('videos.json'),
            fetch('ritmos.json'),
            fetch('videos_encaixe.json')
        ]);
        const videos = await videoResponse.json();
        const ritmos = await ritmosResponse.json();
        const ritmosEncaixe = await (await fetch('ritmos_encaixe.json')).json();
        Object.assign(ritmos, ritmosEncaixe);
        const encaixeVideos = await encaixeVideoResponse.json();

        container.innerHTML = "";
        videoList.length = 0;
        videos.sort((a, b) => a.title.localeCompare(b.title));
        for (const video of videos) {
            const videoId = video.id;
            const title = video.title;
            const description = video.description;
            const ritmoKey = `${title}:${videoId}`;
            const ritmo = ritmos[ritmoKey]?.ritmo || "";
            
            videoList.push({ videoId, title, description, isEncaixe: false });
            
            const div = document.createElement("div");
            div.className = "video-container";
            div.dataset.videoId = videoId;
            div.id = "vid_" + videoId;
            
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
            
            div.innerHTML = `
                <h2>${title}</h2>
                ${ritmo ? `<p style="font-size: 16px; color: #bbb; margin-bottom: 10px;">Ritmo: ${ritmo}</p>` : ''}
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
            `;
            div.querySelector(".play-btn").addEventListener("click", () => {
                history.replaceState(null, '', window.location.pathname + window.location.search);
            });
           
            container.appendChild(div);
        }

        encaixeVideos.sort((a, b) => a.title.localeCompare(b.title));
        for (const video of encaixeVideos) {
            const videoId = video.id;
            const title = video.title;
            const description = video.description;
            const ritmoKey = `${title}:${videoId}`;
            const ritmo = ritmos[ritmoKey]?.ritmo || "";
            
            videoList.push({ videoId, title, description, isEncaixe: true });
            
            const div = document.createElement("div");
            div.className = "video-container";
            div.dataset.videoId = videoId;
            div.id = "vid_" + videoId;
            
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
            
            div.innerHTML = `
                <h2>${title}</h2>
                ${ritmo ? `<p style="font-size: 16px; color: #bbb; margin-bottom: 10px;">Ritmo: ${ritmo}</p>` : ''}
                <div class="player-wrapper" data-video-id="${videoId}">
                    <img src="https://img.youtube.com/vi/${videoId}/hqdefault.jpg" alt="${title}" />
                    <button class="play-btn">▶</button>
                </div>
                <div class="buttons-container">
                    <button type="button" class="toggle-btn" onclick="toggleDescription(this)"><span class="toggle-indicator"></span>Descrição</button>
                    ${cifraButton}
                    <button class="toggle-btn copy-link-btn" onclick="copyVideoLink('${videoId}')">Copiar Link da aula</button>
                </div>
                <div class="description">${convertLinks(description.replace(/\n/g, '<br>'))}</div>
                ${cifraList}
            `;
            div.querySelector(".play-btn").addEventListener("click", () => {
                history.replaceState(null, '', window.location.pathname + window.location.search);

            });
           
            encaixeContainer.appendChild(div);
        }

        Array.from(encaixeContainer.querySelectorAll(".video-container")).forEach(div => div.style.display = "block");
            encaixeContainer.classList.remove("hidden");

        if (videoList.length === 0) {
            container.innerHTML = `<p class="error">Nenhum vídeo carregado.</p>`;
        }
    } catch (error) {
        console.error("Erro ao carregar vídeos:", error);
        container.innerHTML = `
            <div class="error">
                <p>Erro ao carregar lista de vídeos</p>
                <button onclick="loadVideos()">Tentar novamente</button>
            </div>`;
        encaixeContainer.innerHTML = `<p class="error">Erro ao carregar vídeos de encaixe.</p>`;
    }
}


function addSearchEventListener() {
    const searchInput = document.getElementById("search");
    const suggestions = document.getElementById("suggestions");
    if (searchInput && suggestions) {
        searchInput.addEventListener("keydown", (e) => {
            if (e.key === "Enter") searchVideos();
        });
        searchInput.addEventListener("input", function() {
            const value = this.value.toLowerCase();
            suggestions.innerHTML = "";
            if (!value) return;
            const matches = videoList.filter(v => v.title.toLowerCase().includes(value));
            const show = matches.slice(0, 5);
            const remaining = matches.slice(5);
            for (const match of show) {
                const div = document.createElement("div");
                div.className = "item";
                div.innerHTML = `<img src="https://img.youtube.com/vi/${match.videoId}/default.jpg" alt="${match.title}" /><span>${match.title}</span>`;
                div.onclick = () => {
                    currentSearchTerm = "";
                    searchInput.value = ""; // Limpar campo de pesquisa
                    document.querySelectorAll(".video-container").forEach(div => div.style.display = "block");
                    const el = document.getElementById("vid_" + match.videoId);
                    scrollToVideoElement(el, true);
                    suggestions.innerHTML = "";
                };
                suggestions.appendChild(div);
            }
            if (remaining.length > 0) {
                const moreBtn = document.createElement("div");
                moreBtn.className = "more-btn";
                moreBtn.textContent = "Mostrar mais";
                moreBtn.onclick = () => {
                    for (const match of remaining) {
                        const div = document.createElement("div");
                        div.className = "item";
                        div.innerHTML = `<img src="https://img.youtube.com/vi/${match.videoId}/default.jpg" alt="${match.title}" /><span>${match.title}</span>`;
                        div.onclick = () => {
                            const el = document.getElementById("vid_" + match.videoId);
                            scrollToVideoElement(el, true);
                            suggestions.innerHTML = "";
                        };
                        suggestions.appendChild(div);
                    }
                    moreBtn.remove();
                };
                suggestions.appendChild(moreBtn);
            }
        });
    } else {
        console.error("Elemento 'search' ou 'suggestions' não encontrado.");
    }
}


function copyVideoLink(videoId) {
    const url = `${window.location.origin}${window.location.pathname}#vid_${videoId}`;
    navigator.clipboard.writeText(url).then(() => {
        history.replaceState(null, '', window.location.pathname + window.location.search);

    }).catch(err => {
        console.error("Erro ao copiar:", err);
    });
}

function pauseAllVideos(exceptVideoId) {
    document.querySelectorAll(".player-wrapper iframe").forEach(iframe => {
        const videoId = iframe.closest(".player-wrapper").dataset.videoId;
        if (videoId !== exceptVideoId) {
            iframe.contentWindow.postMessage('{"event":"command","func":"pauseVideo","args":""}', '*');
        }
    });
}

function scrollToEncaixe() {
    document.getElementById('encaixe-videos').scrollIntoView({ behavior: 'smooth' });
}

function scrollToVideoElement(el, playAfter = false) {
    if (!el) return;
    
    // Aplicar margem superior
    const yOffset = -30;
    const y = el.getBoundingClientRect().top + window.pageYOffset + yOffset;
    
    // Rolagem suave
    window.scrollTo({
        top: y,
        behavior: 'smooth'
    });
    
    // Opcionalmente inicia o vídeo após a rolagem
    if (playAfter) {
        setTimeout(() => {
            const btn = el.querySelector(".play-btn");
            if (btn) btn.click();
        }, 500);
    }
}

async function scrollToVideo() {
    await loadVideos();
    const hash = window.location.hash;
    if (hash.startsWith("#vid_")) {
        const attemptScroll = () => {
            const video = document.querySelector(hash);
            if (video) {
                scrollToVideoElement(video);
                video.classList.add("highlight");
                history.replaceState(null, '', window.location.pathname + window.location.search);

            } else {
                setTimeout(attemptScroll, 200); // Aumenta delay para links externos
            }
        };
        setTimeout(attemptScroll, 500); // Delay inicial para carregamento completo
    }
}

window.addEventListener("load", scrollToVideo);

async function checkUpdateStatus() {
    try {
        const response = await fetch('execution_log.json');
        const data = await response.json();
        if (data.status === "incompleto") {
            document.getElementById("update-error").style.display = "block";
        }
    } catch (error) {
        console.error("Erro ao verificar status de atualização:", error);
    }
}