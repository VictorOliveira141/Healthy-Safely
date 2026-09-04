const { tarefaModel } = require("../models/Tarefa");
const { usuarioModel } = require("../models/Usuario");
const { body, validationResult } = require("express-validator");

const mapearTarefa = (t) => ({
  _id: t.id,
  title: t.titulo,
  completed: !!t.concluida,
  categoria: t.categoria,
  data: t.data || null,
  horario: t.horario || null,
  repeticao: t.repeticao || "once",
  dia_semana: t.dia_semana || null,
  descricao: t.descricao || "",
});

const diasSemana = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

const tarefasDoDia = (tarefas) => {
  const hoje = new Date();
  const dataHoje = [
    hoje.getFullYear(),
    String(hoje.getMonth() + 1).padStart(2, "0"),
    String(hoje.getDate()).padStart(2, "0"),
  ].join("-");
  const diaHoje = diasSemana[hoje.getDay()];

  return tarefas.filter((tarefa) => {
    const data = tarefa.data
      ? typeof tarefa.data === "string"
        ? tarefa.data.slice(0, 10)
        : [
            tarefa.data.getFullYear(),
            String(tarefa.data.getMonth() + 1).padStart(2, "0"),
            String(tarefa.data.getDate()).padStart(2, "0"),
          ].join("-")
      : null;

    if (data && data > dataHoje) return false;
    if (tarefa.repeticao === "daily") return true;
    if (tarefa.repeticao === "weekly") {
      return tarefa.dia_semana === diaHoje;
    }
    return !data || data === dataHoje;
  });
};

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
    body("data")
      .optional({ nullable: true })
      .isISO8601()
      .withMessage("Data inválida."),
    body("horario")
      .optional({ nullable: true })
      .matches(/^([01]\d|2[0-3]):[0-5]\d$/)
      .withMessage("Horário inválido."),
    body("repeticao")
      .optional({ nullable: true })
      .isIn(["once", "daily", "weekly"])
      .withMessage("Repetição inválida."),
    body("dia_semana").custom((value, { req }) => {
      if (req.body.repeticao === "weekly") {
        if (!value) {
          throw new Error(
            "Dia da semana é obrigatório para repetição semanal.",
          );
        }
        const diasValidos = [
          "domingo",
          "segunda",
          "terca",
          "quarta",
          "quinta",
          "sexta",
          "sabado",
        ];
        if (!diasValidos.includes(value)) {
          throw new Error("Dia da semana inválido.");
        }
      }
      return true;
    }),
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

      const tasks = tarefasDoDia(tarefas).map(mapearTarefa);
      // Feedback flash
      const flash = req.session.flash || null;
      delete req.session.flash;
      res.render("pages/app/dashboard", {
        nome: req.session.nome,
        pctSemana: pct,
        tasks,
        flash,
        usuario: req.session.usuario,
      });
    } catch (err) {
      console.error("Erro dashboard:", err);
      res.render("pages/app/dashboard", {
        nome: req.session.nome,
        pctSemana: 0,
        tasks: [],
        flash: null,
      });
    }
  },

  listarTarefas: async (req, res) => {
    try {
      const tarefas = await tarefaModel.listarPorUsuario(
        req.session.usuario.id,
      );
      const tasks = tarefas.map(mapearTarefa);
      const flash = req.session.flash || null;
      delete req.session.flash;
      res.render("pages/app/tasks", {
        tasks,
        flash,
        usuario: req.session.usuario,
        taskToEdit: null,
        modoEdicao: false,
      });
    } catch (err) {
      res.render("pages/app/tasks", {
        tasks: [],
        flash: null,
        usuario: req.session.usuario,
        taskToEdit: null,
        modoEdicao: false,
      });
    }
  },

  buscarTarefaParaEdicao: async (req, res) => {
    try {
      const tarefa = await tarefaModel.buscarPorId(
        req.params.id,
        req.session.usuario.id,
      );

      if (!tarefa) {
        req.session.flash = { tipo: "erro", msg: "Tarefa não encontrada." };
        return res.redirect("/tasks");
      }

      const tarefas = await tarefaModel.listarPorUsuario(
        req.session.usuario.id,
      );
      const flash = req.session.flash || null;
      delete req.session.flash;

      return res.render("pages/app/tasks", {
        tasks: tarefas.map(mapearTarefa),
        flash,
        usuario: req.session.usuario,
        taskToEdit: mapearTarefa(tarefa),
        modoEdicao: true,
      });
    } catch (err) {
      console.error("Erro ao carregar tarefa para edição:", err);
      req.session.flash = { tipo: "erro", msg: "Erro ao carregar tarefa." };
      return res.redirect("/tasks");
    }
  },

  // Criar tarefa com express-validator
  criarTarefa: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.flash = { tipo: "erro", msg: errors.array()[0].msg };
      return res.redirect("/tasks");
    }
    const { titulo, descricao, categoria, data, horario, repeticao, dia_semana } = req.body;
    try {
      await tarefaModel.criar({
        usuarioId: req.session.usuario.id,
        titulo: titulo.trim(),
        descricao: descricao || null,
        categoria: categoria || "geral",
        data: data || null,
        horario: horario || null,
        repeticao: repeticao || "once",
        diaSemana: dia_semana || null,
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

  atualizarTarefa: async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      req.session.flash = { tipo: "erro", msg: errors.array()[0].msg };
      return res.redirect("/tasks");
    }

    const { id } = req.params;
    const {
      titulo,
      descricao,
      categoria,
      data,
      horario,
      repeticao,
      dia_semana,
    } = req.body;

    try {
      const tarefaAtual = await tarefaModel.buscarPorId(
        id,
        req.session.usuario.id,
      );
      if (!tarefaAtual) {
        req.session.flash = { tipo: "erro", msg: "Tarefa não encontrada." };
        return res.redirect("/tasks");
      }

      await tarefaModel.atualizar(id, req.session.usuario.id, {
        titulo: titulo.trim(),
        descricao: descricao || null,
        categoria: categoria || "geral",
        data: data || null,
        horario: horario || null,
        repeticao: repeticao || "once",
        diaSemana: dia_semana || null,
      });

      req.session.flash = {
        tipo: "sucesso",
        msg: "✅ Tarefa atualizada com sucesso!",
      };
    } catch (e) {
      console.error(e);
      req.session.flash = { tipo: "erro", msg: "Erro ao atualizar tarefa." };
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
        req.session.flash = {
          tipo: "sucesso",
          msg: "Tarefa concluída!",
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

  // Histórico do usuário
  exibirHistorico: async (req, res) => {
    try {
      const uid = req.session.usuario.id;
      const [historico, pctSemanal, totalConcluidas] = await Promise.all([
        tarefaModel.historicoPorData(uid),
        tarefaModel.percentualSemanal(uid),
        tarefaModel.totalConcluidas(uid),
      ]);
      res.render("pages/app/historico", {
        historico,
        pctSemanal,
        totalConcluidas,
      });
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
