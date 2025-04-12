// Variável global para acompanhar o ritmo e termo de pesquisa atuais
let currentRhythm = "Todos os ritmos";
let currentSearchTerm = "";

const videoList = [];

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
        const match = line.match(/https:\/\/drive\.google\.com\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            const fileId = match[1];
            const downloadLink = `https://drive.google.com/uc?export=download&id=${fileId}`;
            cifraLinks.push({ title: lastTitle, link: downloadLink });
        } else if (line) {
            lastTitle = line;
        }
    }

    return cifraLinks.length > 1 
        ? cifraLinks.map(c => ({ title: c.title || "Sem título", link: c.link }))
        : cifraLinks.map(c => ({ title: null, link: c.link }));
}

function toggleDescription(button) {
    const desc = button.closest(".video-container").querySelector(".description");
    desc.style.display = desc.style.display === "block" ? "none" : "block";
    button.textContent = desc.style.display === "block" ? "Esconder Descrição" : "Ver Descrição";
}

function toggleCifras(button) {
    const cifraList = button.nextElementSibling;
    cifraList.style.display = cifraList.style.display === "block" ? "none" : "block";
    button.textContent = cifraList.style.display === "block" ? "Esconder Cifras" : "Ver Cifras";
}

document.addEventListener("click", function(e) {
    if (e.target.classList.contains("play-btn")) {
        const wrapper = e.target.closest(".player-wrapper");
        const videoId = wrapper.dataset.videoId;
        const iframe = document.createElement("iframe");
        iframe.src = `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`;
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
    if (!term) return; // Não faz nada se o input estiver vazio
    
    // Atualiza o termo de pesquisa atual
    currentSearchTerm = term;
    
    const resetBtn = document.getElementById("resetBtn");
    resetBtn.style.display = "inline-block";
    document.getElementById("suggestions").innerHTML = "";
    
    // Aplica os dois filtros juntos: pesquisa e ritmo
    document.querySelectorAll(".video-container").forEach(div => {
        const vid = div.dataset.videoId;
        const data = videoList.find(v => v.videoId === vid);
        
        // Verifica critério de pesquisa
        const matchesSearch = data && data.title.toLowerCase().includes(term);
        
        // Verifica critério de ritmo (se já estiver usando ritmos)
        let matchesRhythm = true; // por padrão, assume que corresponde
        if (window.ritmos) {
            const ritmoKey = `${data?.title}:${vid}`;
            const videoRhythm = window.ritmos[ritmoKey]?.ritmo || "";
            matchesRhythm = (currentRhythm === "Todos os ritmos" || videoRhythm === currentRhythm);
        }
        
        // Combina os dois critérios
        div.style.display = (matchesSearch && matchesRhythm) ? "block" : "none";
    });
    
    // Atualiza a mensagem de ritmo, se existir
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
    
    document.getElementById("videos").prepend(message);
}

async function loadRhythmButtons(isEncaixe = false) {
    const ritmosFile = isEncaixe ? 'ritmos_encaixe.json' : 'ritmos.json';
    const ritmosResponse = await fetch(ritmosFile);
    window.ritmos = await ritmosResponse.json();
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
async function loadVideos(isEncaixe = false) {
    const container = document.getElementById("videos");
    container.innerHTML = "<p style='text-align: center; padding: 20px;'>Carregando vídeos...</p>";
    
    try {
        const [videoResponse, ritmosResponse] = await Promise.all([
            fetch(isEncaixe ? 'videos_encaixe.json' : 'videos.json'),
            fetch(isEncaixe ? 'ritmos_encaixe.json' : 'ritmos.json')
        ]);
        const videos = await videoResponse.json();
        const ritmos = await ritmosResponse.json();
        container.innerHTML = "";
        videoList.length = 0;
        videos.sort((a, b) => a.title.localeCompare(b.title));
        for (const video of videos) {
            const videoId = video.id;
            const title = video.title;
            const description = video.description;
            const ritmoKey = `${title}:${videoId}`;
            const ritmo = ritmos[ritmoKey]?.ritmo || "";
            
            videoList.push({ videoId, title, description });
            
            const div = document.createElement("div");
            div.className = "video-container";
            div.dataset.videoId = videoId;
            div.id = "vid_" + videoId;
            
            const cifraLinks = extractCifraLinks(description);
            let cifraButton = '';
            if (cifraLinks.length === 1) {
                cifraButton = `<a href="${cifraLinks[0].link}" class="toggle-btn cifra-btn" target="_blank" rel="noopener" onclick="window.open('${cifraLinks[0].link}', '_blank'); console.log('Abrindo: ${cifraLinks[0].link}'); return false;">Baixar Cifra</a>`;
            } else if (cifraLinks.length > 1) {
                cifraButton = `
                    <button class="toggle-btn cifra-btn" onclick="toggleCifras(this)">Ver Cifras</button>
                    <div class="cifra-list">${cifraLinks.map(link => 
                        `<a href="${link.link}" class="toggle-btn cifra-btn" target="_blank" rel="noopener" onclick="window.open('${link.link}', '_blank'); console.log('Abrindo: ${link.link}'); return false;">Baixar Cifra: ${link.title || 'Cifra'}</a>`
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
                    <button class="toggle-btn" onclick="toggleDescription(this)">Ver Descrição</button>
                    ${cifraButton}
                    <button class="toggle-btn copy-link-btn" onclick="copyVideoLink('${videoId}')">Copiar Link da aula</button>
                 </div>
                </div>
                <div class="description">${convertLinks(description.replace(/\n/g, '<br>'))}</div>
            `;
            
            container.appendChild(div);
        }

        if (videoList.length === 0) {
            container.innerHTML = `<p class="error">Nenhum vídeo carregado.</p>`;
        }
    } catch (error) {
        console.error("Erro ao carregar vídeos:", error);
        container.innerHTML = `
            <div class="error">
                <p>Erro ao carregar lista de vídeos</p>
                <button onclick="loadVideos(${isEncaixe})">Tentar novamente</button>
            </div>
        `;
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
                    const el = document.getElementById("vid_" + match.videoId);
                    el.scrollIntoView({ behavior: "smooth" });
                    setTimeout(() => {
                        const btn = el.querySelector(".play-btn");
                        if (btn) btn.click();
                    }, 400);
                    suggestions.innerHTML = "";
                    document.getElementById("search").value = match.title;
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
                            el.scrollIntoView({ behavior: "smooth" });
                            setTimeout(() => {
                                const btn = el.querySelector(".play-btn");
                                if (btn) btn.click();
                            }, 400);
                            suggestions.innerHTML = "";
                            document.getElementById("search").value = match.title;
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
    const link = `https://www.youtube.com/watch?v=${videoId}`;
    navigator.clipboard.writeText(link)
        .catch(err => console.error("Erro ao copiar link:", err));
}