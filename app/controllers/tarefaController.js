const { tarefaModel } = require("../models/Tarefa");
const { usuarioModel } = require("../models/Usuario");
const { body, validationResult } = require("express-validator");

const tarefaController = {
  // Regras de validação para criar tarefa (express-validator)
  regrasValidacaoTarefa: [
    body("titulo")
      .trim()
      .notEmpty()
      .withMessage("O título é obrigatório.")
      .isLength({ min: 2, max: 200 })
      .withMessage("O título deve ter entre 2 e 200 caracteres."),
    body("categoria")
      .optional()
      .isIn(["saude", "sono", "alimentacao", "exercicio", "geral"])
      .withMessage("Categoria inválida."),
    body("pontos")
      .optional()
      .isInt({ min: 1, max: 100 })
      .withMessage("Pontos devem ser entre 1 e 100."),
  ],

  exibirDashboard: async (req, res) => {
    try {
      const uid = req.session.usuario.id;
      console.log("1 - entrou dashboard");

      const tarefas = await tarefaModel.listarPorUsuario(uid);
      console.log("2 - tarefas ok");

      const pct = await tarefaModel.percentualSemanal(uid);
      console.log("3 - percentual ok");

      const usuAtual = await usuarioModel.buscarPorId(uid);
      console.log("4 - usuario ok");

      const vinculo = await usuarioModel.buscarVinculo(uid);
      console.log("5 - vinculo ok");

      const profissionais = await usuarioModel.listarProfissionais("");
      console.log("6 - profissionais ok");
      if (usuAtual) {
        req.session.usuario.pontos = usuAtual.pontos;
        req.session.usuario.nivel = usuAtual.nivel;
        req.session.nivel = usuAtual.nivel;
      }
      const tasks = tarefas.map((t) => ({
        _id: t.id,
        title: t.titulo,
        completed: !!t.concluida,
        categoria: t.categoria,
        pontos: t.pontos,
      }));
      // Feedback flash
      const flash = req.session.flash || null;
      delete req.session.flash;
      res.render("pages/app/dashboard", {
        nome: req.session.nome,
        nivel: usuAtual?.nivel || req.session.nivel || "iniciante",
        pontos: usuAtual?.pontos || 0,
        pctSemana: pct,
        tasks,
        vinculo,
        profissionais,
        flash,
      });
    } catch (err) {
      console.error("Erro dashboard:", err);
      res.render("pages/app/dashboard", {
        nome: req.session.nome,
        nivel: "iniciante",
        pontos: 0,
        pctSemana: 0,
        tasks: [],
        vinculo: null,
        profissionais: [],
        flash: null,
      });
    }
  },

  listarTarefas: async (req, res) => {
    try {
      const tarefas = await tarefaModel.listarPorUsuario(
        req.session.usuario.id,
      );
      const tasks = tarefas.map((t) => ({
        _id: t.id,
        title: t.titulo,
        completed: !!t.concluida,
        categoria: t.categoria,
        pontos: t.pontos,
      }));
      const flash = req.session.flash || null;
      delete req.session.flash;
      res.render("pages/app/tasks", { tasks, flash });
    } catch (err) {
      res.render("pages/app/tasks", { tasks: [], flash: null });
    }
  },

  // Criar tarefa com express-validator
  criarTarefa: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.flash = { tipo: "erro", msg: errors.array()[0].msg };
      return res.redirect("/tasks");
    }
    const { titulo, descricao, pontos, categoria } = req.body;
    try {
      await tarefaModel.criar({
        usuarioId: req.session.usuario.id,
        titulo: titulo.trim(),
        descricao: descricao || null,
        pontos: Number(pontos) || 10,
        categoria: categoria || "geral",
      });
      req.session.flash = {
        tipo: "sucesso",
        msg: "✅ Tarefa criada com sucesso!",
      };
    } catch (e) {
      console.error(e);
      req.session.flash = { tipo: "erro", msg: "Erro ao criar tarefa." };
    }
    res.redirect("/tasks");
  },

  alternarConclusao: async (req, res) => {
    const { id } = req.query;
    try {
      const tarefa = await tarefaModel.alternarConclusao(
        id,
        req.session.usuario.id,
      );
      if (tarefa?.concluida) {
        const r = await usuarioModel.atualizarPontos(
          req.session.usuario.id,
          tarefa.pontos || 10,
        );
        if (r) {
          req.session.usuario.nivel = r.nivel;
          req.session.nivel = r.nivel;
        }
        req.session.flash = {
          tipo: "sucesso",
          msg: `🎉 Tarefa concluída! +${tarefa.pontos || 10} pts`,
        };
        // Gera notificação de conclusão
        await usuarioModel.criarNotificacao(
          req.session.usuario.id,
          `Tarefa concluída: ${tarefa.titulo || "tarefa"}`,
        );
      } else {
        req.session.flash = {
          tipo: "info",
          msg: "Tarefa marcada como pendente.",
        };
      }
    } catch (e) {
      console.error(e);
    }
    res.redirect(req.get("Referer") || "/tasks");
  },

  excluirTarefa: async (req, res) => {
    const { id } = req.params;
    try {
      await tarefaModel.excluir(id, req.session.usuario.id);
      req.session.flash = { tipo: "sucesso", msg: "🗑️ Tarefa excluída." };
    } catch (e) {
      req.session.flash = { tipo: "erro", msg: "Erro ao excluir tarefa." };
    }
    res.redirect("/tasks");
  },

  buscarProfissionais: async (req, res) => {
    const lista = await usuarioModel.listarProfissionais(req.query.q || "");
    res.json(lista);
  },

  solicitarVinculo: async (req, res) => {
    try {
      await usuarioModel.solicitarVinculo(
        req.session.usuario.id,
        req.body.profissionalId,
      );
      req.session.flash = {
        tipo: "sucesso",
        msg: "Solicitação de vínculo enviada com sucesso!",
      };
    } catch (e) {
      req.session.flash = { tipo: "erro", msg: "Erro ao solicitar vínculo." };
    }
    res.redirect("/dashboard");
  },

  exibirPainelProfissional: async (req, res) => {
    try {
      const [pacientes, solicitacoes] = await Promise.all([
        usuarioModel.listarPacientes(),
        usuarioModel.listarSolicitacoesProfissional(req.session.usuario.id),
      ]);
      const flash = req.session.flash || null;
      delete req.session.flash;
      res.render("pages/profissional/painel-financeiro", {
        colaborador: req.session.usuario,
        pacientes,
        solicitacoes,
        mensagem: flash,
      });
    } catch (err) {
      res.render("pages/profissional/painel-financeiro", {
        colaborador: req.session.usuario,
        pacientes: [],
        solicitacoes: [],
        mensagem: null,
      });
    }
  },

  listarPacientes: async (req, res) => {
    try {
      const [pacientes, solicitacoes] = await Promise.all([
        usuarioModel.listarPacientes(),
        usuarioModel.listarSolicitacoesProfissional(req.session.usuario.id),
      ]);
      const flash = req.session.flash || null;
      delete req.session.flash;
      res.render("pages/profissional/pacientes", {
        colaborador: req.session.usuario,
        pacientes,
        solicitacoes,
        flash,
      });
    } catch (e) {
      res.render("pages/profissional/pacientes", {
        colaborador: req.session.usuario,
        pacientes: [],
        solicitacoes: [],
        flash: null,
      });
    }
  },

  tarefasDoPaciente: async (req, res) => {
    try {
      const { clienteId } = req.params;
      const [paciente, tarefas] = await Promise.all([
        usuarioModel.buscarPorId(clienteId),
        usuarioModel.buscarTarefasCliente(clienteId),
      ]);
      const flash = req.session.flash || null;
      delete req.session.flash;
      res.render("pages/profissional/tarefas-paciente", {
        colaborador: req.session.usuario,
        paciente,
        tarefas,
        flash,
      });
    } catch (e) {
      res.redirect("/profissional/pacientes");
    }
  },

  criarTarefaParaPaciente: async (req, res) => {
    const { clienteId, titulo, descricao, pontos, categoria } = req.body;
    try {
      await tarefaModel.criar({
        usuarioId: Number(clienteId),
        criadoPor: req.session.usuario.id,
        titulo: titulo.trim(),
        descricao: descricao || null,
        pontos: Number(pontos) || 10,
        categoria: categoria || "geral",
      });
      // Notifica o paciente
      await usuarioModel.criarNotificacao(
        Number(clienteId),
        `Seu profissional criou uma nova tarefa para você: ${titulo.trim()}`,
      );
      req.session.flash = {
        tipo: "sucesso",
        msg: "✅ Tarefa criada para o paciente!",
      };
    } catch (e) {
      console.error(e);
      req.session.flash = { tipo: "erro", msg: "Erro ao criar tarefa." };
    }
    res.redirect(`/profissional/paciente/${clienteId}/tarefas`);
  },

  // Profissional envia feedback para paciente
  regrasValidacaoFeedback: [
    body("comentario")
      .trim()
      .notEmpty()
      .withMessage("O comentário é obrigatório.")
      .isLength({ min: 5, max: 500 })
      .withMessage("O comentário deve ter entre 5 e 500 caracteres."),
  ],

  enviarFeedback: async (req, res) => {
    const errors = validationResult(req);
    const { clienteId } = req.params;
    if (!errors.isEmpty()) {
      req.session.flash = { tipo: "erro", msg: errors.array()[0].msg };
      return res.redirect(`/profissional/paciente/${clienteId}/tarefas`);
    }
    const { comentario } = req.body;
    try {
      const profNome = req.session.usuario.nome || "Seu profissional";
      await usuarioModel.criarNotificacao(
        Number(clienteId),
        `💬 Feedback de ${profNome}: ${comentario}`,
      );
      req.session.flash = {
        tipo: "sucesso",
        msg: "✅ Feedback enviado ao paciente!",
      };
    } catch (e) {
      req.session.flash = { tipo: "erro", msg: "Erro ao enviar feedback." };
    }
    res.redirect(`/profissional/paciente/${clienteId}/tarefas`);
  },

  // Profissional gerencia vínculo (aceitar/recusar)
  gerenciarVinculo: async (req, res) => {
    const { solicitacaoId, acao } = req.body;
    try {
      await usuarioModel.gerenciarVinculo(solicitacaoId, acao);
      const msg =
        acao === "aprovar" ? "✅ Vínculo aceito!" : "Solicitação recusada.";
      req.session.flash = {
        tipo: acao === "aprovar" ? "sucesso" : "info",
        msg,
      };
    } catch (e) {
      req.session.flash = {
        tipo: "erro",
        msg: "Erro ao processar solicitação.",
      };
    }
    res.redirect("/profissional/pacientes");
  },

  // Histórico do usuário
  exibirHistorico: async (req, res) => {
    try {
      const uid = req.session.usuario.id;
      const [historico, pctSemanal, totalConcluidas] = await Promise.all([
        tarefaModel.historicoPorData(uid),
        tarefaModel.percentualSemanal(uid),
        tarefaModel.totalConcluidas(uid),
      ]);
      res.render("pages/app/historico", { historico, pctSemanal, totalConcluidas });
    } catch (e) {
      res.render("pages/app/historico", {
        historico: [],
        pctSemanal: 0,
        totalConcluidas: 0,
      });
    }
  },

  // Registrar sono
  registrarSono: async (req, res) => {
    const { horas_dormidas, qualidade } = req.body;
    try {
      await usuarioModel.registrarSono(
        req.session.usuario.id,
        Number(horas_dormidas),
        Number(qualidade) || 3,
      );
      req.session.flash = {
        tipo: "sucesso",
        msg: "💤 Registro de sono salvo!",
      };
    } catch (e) {
      req.session.flash = { tipo: "erro", msg: "Erro ao salvar registro." };
    }
    res.redirect("/sono");
  },
};

module.exports = tarefaController;
