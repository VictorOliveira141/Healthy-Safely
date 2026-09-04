const { adminModel } = require("../models/Admin");

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "admin123";

const adminController = {

  // ── Exibir formulário de login ─────────────────────────────
  exibirLogin: (req, res) => {
    if (req.session.adminAutenticado) return res.redirect("/admin/painel");
    res.render("pages/admin/login", { erro: null });
  },

  // ── Processar login (senha do .env) ───────────────────────
  processarLogin: (req, res) => {
    if (req.body.senha === ADMIN_PASSWORD) {
      req.session.adminAutenticado = true;
      return res.redirect("/admin/painel");
    }
    res.render("pages/admin/login", { erro: "Senha incorreta. Tente novamente." });
  },

  // ── Painel principal ───────────────────────────────────────
  exibirPainel: async (req, res) => {
    const resultados = await Promise.allSettled([
      adminModel.listarTodosUsuarios(),      // 0
      adminModel.estatisticasGerais(),       // 1
      adminModel.cadastrosPorDia(),          // 2
      adminModel.tarefasConcluidasPorDia(),  // 3
    ]);

    const pegar = (i, fallback) =>
      resultados[i].status === "fulfilled" ? resultados[i].value : fallback;

    const usuarios       = pegar(0, []);
    const stats          = pegar(1, {
      total_usuarios: 0, total_tarefas: 0, tarefas_concluidas: 0,
    });
    const cadastrosPorDia  = pegar(2, []);
    const tarefasPorDia    = pegar(3, []);
    res.render("pages/admin/painel", {
      usuarios,
      stats,
      cadastrosPorDia,
      tarefasPorDia,
    });
  },

  exibirSuporte: async (req, res) => {

  // TEMPORÁRIO (sem banco)
  const suporte = [
    {
      id: 1,
      nome: "Victor Hugo",
      email: "victor@email.com",
      tipo: "Problema com login",
      mensagem: "Não consigo acessar minha conta.",
      status: "pendente",
      criado_em: new Date(),
    },

    {
      id: 2,
      nome: "Maria Clara",
      email: "maria@email.com",
      tipo: "Erro no sistema",
      mensagem: "As tarefas não estão aparecendo.",
      status: "respondido",
      criado_em: new Date(),
    }
  ];

  res.render("pages/admin/suporte", {
    suporte
  });
},

  // ── Deletar usuário ─────────────────────────────────────────
  deletarUsuario: async (req, res) => {
    try {
      await adminModel.deletarUsuario(req.params.id);
    } catch (e) {
      console.error("[Admin.deletarUsuario]", e.message);
    }
    res.redirect("/admin/painel");
  },

  // ── Sair do admin ───────────────────────────────────────────
  sair: (req, res) => {
    req.session.adminAutenticado = false;
    res.redirect("/admin");
  },
};

module.exports = adminController;
