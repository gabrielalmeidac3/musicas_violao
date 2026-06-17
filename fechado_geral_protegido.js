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
            let cleanedTelefone = telefone.replace(/\D/g, '');
            let tel10 = cleanedTelefone;
            let tel11 = cleanedTelefone;
            if (cleanedTelefone.length === 11 && cleanedTelefone[2] === '9') {
                tel10 = cleanedTelefone.substring(0, 2) + cleanedTelefone.substring(3);
            } else if (cleanedTelefone.length === 10) {
                tel11 = cleanedTelefone.substring(0, 2) + '9' + cleanedTelefone.substring(2);
            }

            const senhaFirebase = senha + "00";
            const tentativas = [
                `${tel10}@curso.com`,
                `${tel11}@curso.com`
            ];

            let userCredential = null;
            let erroLogin = null;

            // Tenta logar diretamente via Firebase Auth
            for (const email of tentativas) {
                try {
                    userCredential = await auth.signInWithEmailAndPassword(email, senhaFirebase);
                    break; // Sucesso, sai do loop
                } catch (err) {
                    erroLogin = err;
                }
            }

            if (!userCredential) {
                if (erroLogin && (erroLogin.code === "auth/invalid-login-credentials" || erroLogin.code === "auth/wrong-password" || erroLogin.code === "auth/user-not-found")) {
                    erroMsg.textContent = "Telefone ou senha incorretos.";
                } else {
                    erroMsg.textContent = "Erro ao entrar. Tente novamente.";
                    console.error("Erro auth:", erroLogin);
                }
                erroMsg.style.display = "block";
                return;
            }

            // Agora que está logado (autenticado), pode consultar o Firestore sem problemas de permissão
            const uid = userCredential.user.uid;
            
            // Busca o documento pelo UID ou pelo telefone
            let docSnap = await db.collection("alunos").doc(uid).get();
            let aluno = null;

            if (docSnap.exists) {
                aluno = docSnap.data();
            } else {
                // Tenta buscar por telefone caso o ID do documento não seja o UID
                let alunoSnapshot = await db.collection("alunos")
                    .where("telefone", "==", tel10)
                    .get();

                if (alunoSnapshot.empty) {
                    alunoSnapshot = await db.collection("alunos")
                        .where("telefone", "==", tel11)
                        .get();
                }

                if (!alunoSnapshot.empty) {
                    aluno = alunoSnapshot.docs[0].data();
                }
            }

            if (!aluno) {
                erroMsg.textContent = "Cadastro do aluno não encontrado no banco de dados.";
                erroMsg.style.display = "block";
                await auth.signOut();
                return;
            }

            // Verifica se o acesso está liberado
            if (aluno.acesso === "Liberado") {
                const urlParams = new URLSearchParams(window.location.search);
                const from = urlParams.get('from');
                window.location.href = from === 'geral2' ? 'fechado_index.html?from=geral2' : 'fechado_geral_protegido_site.html';
            } else {
                erroMsg.textContent = "Acesso bloqueado para este aluno.";
                erroMsg.style.display = "block";
                await auth.signOut();
            }

        } catch (error) {
            erroMsg.textContent = "Erro ao processar o login. Tente novamente.";
            console.error("Erro geral no login:", error);
            erroMsg.style.display = "block";
            if (auth.currentUser) {
                await auth.signOut();
            }
        }
    });
});
