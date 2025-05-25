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
  
      if (localStorage.getItem("produtorLogado") === "true") {
        document.getElementById("loginProdutorForm").style.display = "none";
        document.getElementById("painel").style.display = "block";
        carregarAlunos(); // CHAMA SÓ AQUI, quando db e auth já estão prontos
      } else {
        document.getElementById("loginProdutorForm").style.display = "block";
        document.getElementById("painel").style.display = "none";
      }
    } catch (error) {
      console.error('Erro ao carregar configuração do Firebase:', error);
    }
  }
  
  

// Função para gerar senha aleatória de 4 dígitos
function gerarSenhaAleatoria() {
    return Math.floor(1000 + Math.random() * 9000).toString();
}



// Login do produtor
document.getElementById("loginProdutorForm").addEventListener("submit", (e) => {
    e.preventDefault();
    console.log("Formulário de login submetido");

    const usuario = document.getElementById("usuario").value;
    const senha = document.getElementById("senhaProdutor").value;

    if (usuario === "admin" && senha === "admin123") {
        console.log("Credenciais corretas, exibindo painel");
        localStorage.setItem("produtorLogado", "true");
        document.getElementById("loginProdutorForm").style.display = "none";
        document.getElementById("painel").style.display = "block";
        carregarAlunos();
    } else {
        console.log("Credenciais inválidas");
        const erroMsg = document.createElement("p");
        erroMsg.textContent = "Usuário ou senha incorretos.";
        erroMsg.style.color = "red";
        document.getElementById("loginProdutorForm").appendChild(erroMsg);
        setTimeout(() => erroMsg.remove(), 3000);
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

// Carregar lista de alunos
async function carregarAlunos() {
    const lista = document.getElementById("listaAlunos");
    lista.innerHTML = "";
    const snapshot = await db.collection("alunos").get();
    snapshot.forEach((doc) => {
        const aluno = doc.data();
        const li = document.createElement("li");
        li.dataset.id = doc.id;

        const infoDiv = document.createElement("div");
        infoDiv.className = "aluno-info";
        infoDiv.innerHTML = `
            <div class="aluno-nome">${aluno.nome}</div>
            <div class="aluno-telefone">${aluno.telefone}</div>
        `;

        const senhaDiv = document.createElement("div");
        senhaDiv.className = "aluno-senha";
        senhaDiv.textContent = `Senha: ${aluno.senha || "1585"}`;

        const botaoAcesso = document.createElement("button");
        botaoAcesso.textContent = aluno.acesso === "Liberado" ? "Bloquear" : "Liberar";
        botaoAcesso.className = `acesso-btn ${aluno.acesso === "Liberado" ? "liberado" : "bloqueado"}`;
        botaoAcesso.onclick = () => toggleAcesso(doc.id, li);

        const botaoExcluir = document.createElement("button");
        botaoExcluir.textContent = "Excluir";
        botaoExcluir.className = "excluir-btn";
        botaoExcluir.onclick = () => excluirAluno(doc.id, aluno.telefone, li);

        li.appendChild(infoDiv);
        li.appendChild(senhaDiv);
        li.appendChild(botaoAcesso);
        li.appendChild(botaoExcluir);
        lista.appendChild(li);
    });
}

// Toggle de acesso
async function toggleAcesso(id, liElement) {
    const botao = liElement.querySelector(".acesso-btn");
    const acessoAtual = botao.textContent === "Bloquear" ? "Liberado" : "Bloqueado";
    const novoAcesso = acessoAtual === "Liberado" ? "Bloqueado" : "Liberado";

    try {
        await db.collection("alunos").doc(id).update({ acesso: novoAcesso });

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
            liElement.remove();
            console.log("Aluno excluído com sucesso do Firestore!");
        } catch (error) {
            console.error("Erro ao excluir aluno do Firestore:", error);
            alert("Erro ao excluir aluno. Tente novamente.");
        }
    }
}
