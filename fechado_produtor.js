initFirebase();

let auth;
let db;

// Verifica se o Firebase está carregado
if (typeof firebase === 'undefined') {
    console.error("Firebase não foi carregado corretamente. Verifique as URLs no HTML.");
} else {
    console.log("Firebase carregado com sucesso!");
}

async function initFirebase() {
    try {
      const response = await fetch('https://broken-silence-aaa9.2gabrielekaline.workers.dev');
      const firebaseConfig = await response.json();
  
      firebase.initializeApp(firebaseConfig);
      auth = firebase.auth();
      db = firebase.firestore();
  
      console.log('Firebase inicializado com configuração segura!');
  
      // Listener de estado de autenticação para controle de acesso seguro
      auth.onAuthStateChanged(async (user) => {
          const loginForm = document.getElementById("loginProdutorForm");
          const painel = document.getElementById("painel");
          
          if (user) {
              const email = user.email;
              const telefoneEmail = email.split('@')[0];
              
              let cleanedTelefone = telefoneEmail.replace(/\D/g, '');
              if (cleanedTelefone.length === 11 && cleanedTelefone[2] === '9') {
                  cleanedTelefone = cleanedTelefone.substring(0, 2) + cleanedTelefone.substring(3);
              }
              
              // Verifica permissão no Firestore
              let alunoSnapshot = await db.collection("alunos")
                  .where("telefone", "==", cleanedTelefone)
                  .get();

              if (alunoSnapshot.empty && cleanedTelefone.length === 10) {
                  const with9 = cleanedTelefone.substring(0, 2) + '9' + cleanedTelefone.substring(2);
                  alunoSnapshot = await db.collection("alunos")
                      .where("telefone", "==", with9)
                      .get();
              }

              const aluno = !alunoSnapshot.empty ? alunoSnapshot.docs[0].data() : null;
              
              // Verificação de administrador (com o seu número como salvaguarda)
              const isAdmin = (cleanedTelefone === "9584224764" || cleanedTelefone === "95984224764" || (aluno && (aluno.admin === true || aluno.role === "admin")));

              if (isAdmin) {
                  console.log("Produtor autorizado!");
                  loginForm.style.display = "none";
                  painel.style.display = "block";
                  carregarAlunos();
              } else {
                  console.warn("Acesso negado: usuário não é administrador.");
                  alert("Acesso negado. Este usuário não possui permissão de administrador.");
                  await auth.signOut();
                  loginForm.style.display = "block";
                  painel.style.display = "none";
              }
          } else {
              loginForm.style.display = "block";
              painel.style.display = "none";
          }
      });
    } catch (error) {
      console.error('Erro ao carregar configuração do Firebase:', error);
    }
  }
  
  

// Função para gerar senha aleatória de 4 dígitos
function gerarSenhaAleatoria() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}



// Login do produtor
document.getElementById("loginProdutorForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Formulário de login submetido");

    const telefone = document.getElementById("telefoneProdutor").value.trim();
    const senha = document.getElementById("senhaProdutor").value.trim();
    const loginForm = document.getElementById("loginProdutorForm");

    // Limpa qualquer mensagem de erro antiga
    const erroMsgAntiga = document.getElementById("erroLogin");
    if (erroMsgAntiga) erroMsgAntiga.remove();

    const erroMsg = document.createElement("p");
    erroMsg.id = "erroLogin";
    erroMsg.style.color = "red";
    erroMsg.style.marginTop = "10px";

    try {
        let cleanedTelefone = telefone.replace(/\D/g, '');
        if (cleanedTelefone.length === 11 && cleanedTelefone[2] === '9') {
            cleanedTelefone = cleanedTelefone.substring(0, 2) + cleanedTelefone.substring(3);
        }

        // Verifica se o telefone existe no Firestore para confirmar se é administrador
        let alunoSnapshot = await db.collection("alunos")
            .where("telefone", "==", cleanedTelefone)
            .get();

        if (alunoSnapshot.empty && cleanedTelefone.length === 10) {
            const with9 = cleanedTelefone.substring(0, 2) + '9' + cleanedTelefone.substring(2);
            alunoSnapshot = await db.collection("alunos")
                .where("telefone", "==", with9)
                .get();
        }

        const aluno = !alunoSnapshot.empty ? alunoSnapshot.docs[0].data() : null;
        
        // Verificação de administrador
        const isAdmin = (cleanedTelefone === "9584224764" || cleanedTelefone === "95984224764" || (aluno && (aluno.admin === true || aluno.role === "admin")));

        if (!isAdmin) {
            erroMsg.textContent = "Acesso negado. Este usuário não é um administrador.";
            loginForm.appendChild(erroMsg);
            return;
        }

        // Determina o telefone armazenado no Firestore ou usa o limpo como fallback
        const storedTelefone = aluno ? aluno.telefone : cleanedTelefone;
        const email = `${storedTelefone.replace(/\D/g, '')}@curso.com`;
        
        // Determina a senha (suporta a senha coringa 1585)
        let senhaFirebase;
        if (senha === "1585" && aluno) {
            senhaFirebase = (aluno.senha || "1585") + "00";
        } else {
            senhaFirebase = senha + "00";
        }

        // Login oficial via Firebase Auth
        await auth.signInWithEmailAndPassword(email, senhaFirebase);
    } catch (error) {
        console.error("Erro ao fazer login:", error);
        if (error.code === "auth/invalid-login-credentials" || error.code === "auth/wrong-password") {
            erroMsg.textContent = "Senha incorreta.";
        } else if (error.code === "auth/user-not-found") {
            erroMsg.textContent = "Telefone não encontrado no sistema de autenticação.";
        } else {
            erroMsg.textContent = "Erro ao entrar. Tente novamente.";
        }
        loginForm.appendChild(erroMsg);
    }
});

// Cadastro de aluno
document.getElementById("cadastroForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    console.log("Formulário de cadastro submetido");

    const nome = document.getElementById("nome").value;
    const telefone = document.getElementById("telefoneCadastro").value;
    const senhaInput = document.getElementById("senhaCadastro").value;
    const senhaCurta = senhaInput || gerarSenhaAleatoria();
    const senhaFirebase = senhaCurta + "00";
    const email = `${telefone.replace(/\D/g, '')}@curso.com`;
    const mensagemDiv = document.getElementById("cadastroMensagem") || document.createElement("div");
    const formulario = document.getElementById("cadastroForm");

    mensagemDiv.id = "cadastroMensagem";
    mensagemDiv.style.marginTop = "10px";
    formulario.appendChild(mensagemDiv);

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(email, senhaFirebase);
        const uid = userCredential.user.uid;

        await db.collection("alunos").doc(uid).set({
            nome: nome,
            telefone: telefone,
            senha: senhaCurta,
            acesso: "Liberado"
        });

        mensagemDiv.textContent = `Aluno cadastrado com sucesso! Senha: ${senhaCurta}`;
        mensagemDiv.style.color = "#4CAF50";
        setTimeout(() => mensagemDiv.remove(), 3000);
        formulario.reset();
        carregarAlunos();
    } catch (error) {
        if (error.code === "auth/email-already-in-use") {
            mensagemDiv.textContent = "Telefone já cadastrado.";
        } else {
            mensagemDiv.textContent = "Erro ao cadastrar aluno. Tente novamente.";
            console.error("Erro ao cadastrar:", error);
        }
        mensagemDiv.style.color = "#ff4444";
        setTimeout(() => mensagemDiv.remove(), 3000);
    }
});

// Variável global para armazenar alunos em memória para busca rápida
let alunosCarregados = [];

// Função para copiar dados de acesso no formato solicitado
function copiarDadosAcesso(nome, telefone, senha, botao) {
    const texto = `Curso do Zero Ao Repertório
Dados de Acesso
Aluno(a): ${nome}

Telefone:
${telefone}

Senha:
${senha}`;

    navigator.clipboard.writeText(texto).then(() => {
        const textoOriginal = botao.textContent;
        botao.textContent = "Copiado! ✅";
        botao.classList.add("copiado");
        setTimeout(() => {
            botao.textContent = textoOriginal;
            botao.classList.remove("copiado");
        }, 2000);
    }).catch(err => {
        console.error("Erro ao copiar dados:", err);
        alert("Erro ao copiar dados de acesso.");
    });
}

// Renderizar a lista de alunos
function renderListaAlunos(alunos) {
    const lista = document.getElementById("listaAlunos");
    lista.innerHTML = "";
    
    if (alunos.length === 0) {
        const li = document.createElement("li");
        li.className = "nenhum-aluno";
        li.textContent = "Nenhum aluno encontrado.";
        lista.appendChild(li);
        return;
    }

    alunos.forEach((aluno) => {
        const li = document.createElement("li");
        li.dataset.id = aluno.id;

        const infoDiv = document.createElement("div");
        infoDiv.className = "aluno-info";
        infoDiv.innerHTML = `
            <div class="aluno-nome">${aluno.nome}</div>
            <div class="aluno-telefone">${aluno.telefone}</div>
        `;

        const senhaDiv = document.createElement("div");
        senhaDiv.className = "aluno-senha";
        senhaDiv.textContent = `Senha: ${aluno.senha || "1585"}`;

        const actionsDiv = document.createElement("div");
        actionsDiv.className = "aluno-actions";

        const botaoCopiar = document.createElement("button");
        botaoCopiar.textContent = "Copiar";
        botaoCopiar.className = "copiar-btn";
        botaoCopiar.onclick = () => copiarDadosAcesso(aluno.nome, aluno.telefone, aluno.senha || "1585", botaoCopiar);

        const botaoAcesso = document.createElement("button");
        botaoAcesso.textContent = aluno.acesso === "Liberado" ? "Bloquear" : "Liberar";
        botaoAcesso.className = `acesso-btn ${aluno.acesso === "Liberado" ? "liberado" : "bloqueado"}`;
        botaoAcesso.onclick = () => toggleAcesso(aluno.id, li);

        const botaoExcluir = document.createElement("button");
        botaoExcluir.textContent = "Excluir";
        botaoExcluir.className = "excluir-btn";
        botaoExcluir.onclick = () => excluirAluno(aluno.id, aluno.telefone, li);

        actionsDiv.appendChild(botaoCopiar);
        actionsDiv.appendChild(botaoAcesso);
        actionsDiv.appendChild(botaoExcluir);

        li.appendChild(infoDiv);
        li.appendChild(senhaDiv);
        li.appendChild(actionsDiv);
        lista.appendChild(li);
    });
}

// Carregar lista de alunos do Firestore
async function carregarAlunos() {
    try {
        const snapshot = await db.collection("alunos").get();
        alunosCarregados = [];
        snapshot.forEach((doc) => {
            alunosCarregados.push({
                id: doc.id,
                ...doc.data()
            });
        });
        
        // Ordena por nome de A-Z
        alunosCarregados.sort((a, b) => (a.nome || "").localeCompare(b.nome || ""));
        
        const searchQuery = document.getElementById("searchAlunos").value.toLowerCase().trim();
        filtrarEApresentarAlunos(searchQuery);
    } catch (error) {
        console.error("Erro ao carregar alunos:", error);
    }
}

// Filtrar e renderizar os alunos com base na busca
function filtrarEApresentarAlunos(query) {
    if (!query) {
        renderListaAlunos(alunosCarregados);
    } else {
        const filtered = alunosCarregados.filter(aluno => 
            (aluno.nome || "").toLowerCase().includes(query) || 
            (aluno.telefone || "").toLowerCase().includes(query)
        );
        renderListaAlunos(filtered);
    }
}

// Ouvinte do input de pesquisa
document.getElementById("searchAlunos").addEventListener("input", (e) => {
    filtrarEApresentarAlunos(e.target.value.toLowerCase().trim());
});

// Atalho do teclado Ctrl+F / Cmd+F para focar na pesquisa
document.addEventListener("keydown", (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const searchInput = document.getElementById("searchAlunos");
        const painel = document.getElementById("painel");
        if (searchInput && painel && painel.style.display !== "none") {
            e.preventDefault();
            searchInput.focus();
            searchInput.select();
        }
    }
});

// Toggle de acesso do aluno
async function toggleAcesso(id, liElement) {
    const botao = liElement.querySelector(".acesso-btn");
    const acessoAtual = botao.textContent === "Bloquear" ? "Liberado" : "Bloqueado";
    const novoAcesso = acessoAtual === "Liberado" ? "Bloqueado" : "Liberado";

    try {
        await db.collection("alunos").doc(id).update({ acesso: novoAcesso });

        // Atualiza na memória
        const idx = alunosCarregados.findIndex(a => a.id === id);
        if (idx !== -1) {
            alunosCarregados[idx].acesso = novoAcesso;
        }

        botao.textContent = novoAcesso === "Liberado" ? "Bloquear" : "Liberar";
        botao.className = `acesso-btn ${novoAcesso === "Liberado" ? "liberado" : "bloqueado"}`;
    } catch (error) {
        console.error("Erro ao atualizar acesso:", error);
        alert("Erro ao alterar acesso. Tente novamente.");
        botao.textContent = acessoAtual === "Liberado" ? "Bloquear" : "Liberar";
        botao.className = `acesso-btn ${acessoAtual === "Liberado" ? "liberado" : "bloqueado"}`;
    }
}

// Função para excluir aluno
async function excluirAluno(id, telefone, liElement) {
    const confirmacao = confirm("Tem certeza que deseja excluir este aluno?");
    if (confirmacao) {
        try {
            await db.collection("alunos").doc(id).delete();
            
            // Remove da memória
            alunosCarregados = alunosCarregados.filter(a => a.id !== id);
            
            liElement.remove();
            console.log("Aluno excluído com sucesso do Firestore!");
        } catch (error) {
            console.error("Erro ao excluir aluno do Firestore:", error);
            alert("Erro ao excluir aluno. Tente novamente.");
        }
    }
}
