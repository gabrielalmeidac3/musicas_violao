let auth;
let db;

async function initFirebase() {
  try {
    const response = await fetch('https://broken-silence-aaa9.2gabrielekaline.workers.dev');
    const firebaseConfig = await response.json();

    firebase.initializeApp(firebaseConfig);

    auth = firebase.auth();
    db = firebase.firestore();

    console.log('Firebase inicializado com configuração segura!');
  } catch (error) {
    console.error('Erro ao carregar configuração do Firebase:', error);
  }
  return true; // só pra sinalizar que terminou
}

initFirebase().then(() => {
    // Aqui Firebase está pronto, então adiciona o listener do formulário
    document.getElementById("loginForm").addEventListener("submit", async (e) => {
        e.preventDefault();
        const telefone = document.getElementById("telefone").value;
        const senha = document.getElementById("senha").value;
        const erroMsg = document.getElementById("erro");
    
        erroMsg.style.display = "none"; // Reseta a mensagem de erro
    
        try {
            const email = `${telefone.replace(/\D/g, '')}@curso.com`;
    
            // Verifica se o telefone existe na coleção 'alunos' antes de tentar login
            const alunoSnapshot = await db.collection("alunos")
                .where("telefone", "==", telefone)
                .get();
    
            if (alunoSnapshot.empty) {
                erroMsg.textContent = "Telefone não encontrado.";
                erroMsg.style.display = "block";
                return; // Para aqui se o telefone não existe
            }
    
            // Caso da senha coringa "1585"
            if (senha === "1585") {
                const aluno = alunoSnapshot.docs[0].data();
                if (aluno.acesso === "Liberado") {
                    const senhaFirebase = aluno.senha + "00";
                    await auth.signInWithEmailAndPassword(email, senhaFirebase);
                    window.location.href = "fechado_geral_protegido_site.html";
                } else {
                    erroMsg.textContent = "Acesso bloqueado para este aluno.";
                    erroMsg.style.display = "block";
                }
            } else {
                // Login normal com senha de 4 dígitos fornecida
                const senhaFirebase = senha + "00";
                await auth.signInWithEmailAndPassword(email, senhaFirebase);
                const aluno = alunoSnapshot.docs[0].data();
                if (aluno.acesso === "Liberado") {
                    window.location.href = "fechado_curso.html";
                } else {
                    erroMsg.textContent = "Acesso bloqueado para este aluno.";
                    erroMsg.style.display = "block";
                    await auth.signOut();
                }
            }
        } catch (error) {
            if (error.code === "auth/invalid-login-credentials") {
                erroMsg.textContent = "Senha incorreta.";
            } else if (error.code === "auth/invalid-email") {
                erroMsg.textContent = "Telefone inválido.";
            } else {
                erroMsg.textContent = "Erro ao fazer login. Tente novamente.";
                console.error("Erro ao fazer login:", error);
            }
            erroMsg.style.display = "block";
        }
    });
    });
