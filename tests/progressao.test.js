const test = require("node:test");
const assert = require("node:assert/strict");
const {
  dataSaoPaulo,
  somarDias,
  inicioDaSemana,
  concluidaAgora,
  tarefaPrevistaNoDia,
  calcularProgressao,
  agruparHistorico,
} = require("../app/utils/progressao");

// 2026-10-08 é uma quinta-feira
const HOJE = "2026-10-08";
const diaria = {
  id: 1,
  repeticao: "daily",
  dia_semana: null,
  data: null,
  criado_em: "2026-09-01",
};
const conclusoesDe = (tarefaId, dias) =>
  dias.map((dia, i) => ({ id: tarefaId * 1000 + i, tarefa_id: tarefaId, dia }));

test("datas: fuso de São Paulo e semana de segunda a domingo", () => {
  // 01:30 UTC de 8/10 ainda é 7/10 em São Paulo (UTC-3)
  assert.equal(dataSaoPaulo(new Date("2026-10-08T01:30:00Z")), "2026-10-07");
  assert.equal(somarDias("2026-03-01", -1), "2026-02-28");
  assert.equal(inicioDaSemana("2026-10-08"), "2026-10-05"); // quinta -> segunda
  assert.equal(inicioDaSemana("2026-10-11"), "2026-10-05"); // domingo -> segunda anterior
});

test("concluidaAgora: recorrentes só valem na ocorrência atual", () => {
  const ontem = new Date("2026-10-07T15:00:00Z");
  const hoje = new Date("2026-10-08T15:00:00Z");
  assert.equal(
    concluidaAgora(
      { concluida: 1, repeticao: "once", concluida_em: ontem },
      HOJE,
    ),
    true,
  );
  assert.equal(
    concluidaAgora(
      { concluida: 1, repeticao: "daily", concluida_em: ontem },
      HOJE,
    ),
    false,
  );
  assert.equal(
    concluidaAgora(
      { concluida: 1, repeticao: "daily", concluida_em: hoje },
      HOJE,
    ),
    true,
  );
  assert.equal(
    concluidaAgora(
      { concluida: 1, repeticao: "weekly", concluida_em: ontem },
      HOJE,
    ),
    true,
  ); // mesma semana
  assert.equal(
    concluidaAgora(
      {
        concluida: 1,
        repeticao: "weekly",
        concluida_em: new Date("2026-10-02T15:00:00Z"),
      },
      HOJE,
    ),
    false,
  );
  assert.equal(
    concluidaAgora({ concluida: 0, repeticao: "once" }, HOJE),
    false,
  );
});

test("tarefas previstas: diária, semanal, única e início", () => {
  const semanal = {
    id: 2,
    repeticao: "weekly",
    dia_semana: "quinta",
    data: null,
    criado_em: "2026-09-01",
  };
  const unica = {
    id: 3,
    repeticao: "once",
    data: "2026-10-06",
    criado_em: "2026-10-01",
  };
  const semData = {
    id: 4,
    repeticao: "once",
    data: null,
    criado_em: "2026-10-02",
  };
  assert.equal(tarefaPrevistaNoDia(diaria, "2026-08-31"), false); // antes de existir
  assert.equal(tarefaPrevistaNoDia(diaria, "2026-09-02"), true);
  assert.equal(tarefaPrevistaNoDia(semanal, "2026-10-08"), true);
  assert.equal(tarefaPrevistaNoDia(semanal, "2026-10-09"), false);
  assert.equal(tarefaPrevistaNoDia(unica, "2026-10-06"), true);
  assert.equal(tarefaPrevistaNoDia(unica, "2026-10-07"), false);
  assert.equal(tarefaPrevistaNoDia(semData, "2026-10-02"), true);
});

test("sequência: dias consecutivos, hoje pendente não quebra", () => {
  const r = calcularProgressao({
    tarefas: [diaria],
    conclusoes: conclusoesDe(1, ["2026-10-05", "2026-10-06", "2026-10-07"]),
    hoje: HOJE,
  });
  assert.equal(r.sequencia.atual, 3);
  assert.equal(r.sequencia.recorde, 3);
});

test("sequência: uma pausa é tolerada, duas seguidas quebram e o recorde é preservado", () => {
  // 02, 03, 04 ativos; 05 pausa (tolerada); 06 ativo -> 4 dias ativos em sequência
  let r = calcularProgressao({
    tarefas: [diaria],
    conclusoes: conclusoesDe(1, [
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-06",
    ]),
    hoje: "2026-10-06",
  });
  assert.equal(r.sequencia.atual, 4);

  // 02, 03, 04 ativos; 05 e 06 pausas -> quebra; recorde 3 preservado; hoje (07) pendente
  r = calcularProgressao({
    tarefas: [diaria],
    conclusoes: conclusoesDe(1, ["2026-10-02", "2026-10-03", "2026-10-04"]),
    hoje: "2026-10-07",
  });
  assert.equal(r.sequencia.atual, 0);
  assert.equal(r.sequencia.recorde, 3);

  // depois de quebrar, uma nova sequência começa do zero e o recorde continua
  r = calcularProgressao({
    tarefas: [diaria],
    conclusoes: conclusoesDe(1, [
      "2026-10-02",
      "2026-10-03",
      "2026-10-04",
      "2026-10-07",
      "2026-10-08",
    ]),
    hoje: HOJE,
  });
  assert.equal(r.sequencia.atual, 2);
  assert.equal(r.sequencia.recorde, 3);
});

test("sequência: dias sem tarefas previstas não quebram", () => {
  // tarefa semanal de segunda e quinta é criada separadamente; só segunda 05 e quinta 08 são previstos
  const segunda = {
    id: 5,
    repeticao: "weekly",
    dia_semana: "segunda",
    data: null,
    criado_em: "2026-10-01",
  };
  const quinta = {
    id: 6,
    repeticao: "weekly",
    dia_semana: "quinta",
    data: null,
    criado_em: "2026-10-01",
  };
  const r = calcularProgressao({
    tarefas: [segunda, quinta],
    conclusoes: [
      { id: 1, tarefa_id: 5, dia: "2026-10-05" },
      { id: 2, tarefa_id: 6, dia: "2026-10-08" },
    ],
    hoje: HOJE,
  });
  assert.equal(r.sequencia.atual, 2); // terça a quarta eram neutros
});

test("a mesma conclusão não é contada duas vezes", () => {
  const r = calcularProgressao({
    tarefas: [diaria],
    conclusoes: [
      { id: 1, tarefa_id: 1, dia: HOJE },
      { id: 2, tarefa_id: 1, dia: HOJE },
    ],
    hoje: HOJE,
  });
  assert.equal(r.metaDiaria.concluidas, 1);
  assert.equal(r.periodos[7].total, 1);
});

test("metas: diária e semanal usam as tarefas previstas; percentual nunca passa de 100%", () => {
  const t2 = {
    id: 2,
    repeticao: "daily",
    dia_semana: null,
    data: null,
    criado_em: "2026-09-01",
  };
  const r = calcularProgressao({
    tarefas: [diaria, t2],
    conclusoes: [
      { id: 1, tarefa_id: 1, dia: HOJE },
      { id: 2, tarefa_id: 99, dia: HOJE }, // tarefa removida/fora do previsto
    ],
    hoje: HOJE,
  });
  assert.equal(r.metaDiaria.concluidas, 2);
  assert.equal(r.metaDiaria.previstas, 3); // 2 previstas + 1 conclusão extra
  assert.ok(r.metaSemanal.concluidas <= r.metaSemanal.previstas);
  assert.equal(r.semana.metaDiasAtivos, 7);
  assert.equal(r.semana.diasAtivos, 1);
});

test("comparação só existe com histórico suficiente", () => {
  // histórico começa em 07/10: não cobre os 7 dias anteriores -> sem comparação
  let r = calcularProgressao({
    tarefas: [diaria],
    conclusoes: conclusoesDe(1, ["2026-10-07", HOJE]),
    hoje: HOJE,
  });
  assert.equal(r.periodos[7].comparacao, null);

  // histórico começa em 20/09 e há conclusões no período anterior -> calcula
  const anteriores = ["2026-09-20", "2026-10-01", "2026-10-02"]; // 3 no período anterior (02/10–08/10 é atual? não)
  r = calcularProgressao({
    tarefas: [diaria],
    conclusoes: conclusoesDe(1, [
      ...anteriores,
      "2026-10-03",
      "2026-10-04",
      "2026-10-05",
      "2026-10-06",
      HOJE,
    ]),
    hoje: HOJE,
  });
  const p = r.periodos[7]; // atual: 02–08/10 ; anterior: 25/09–01/10
  assert.equal(p.total, 6);
  assert.deepEqual(p.comparacao, { totalAnterior: 1, variacao: 500 });
});

test("conquistas: só com condição real e com identificador estável", () => {
  const semRegistro = calcularProgressao({
    tarefas: [diaria],
    conclusoes: [],
    hoje: HOJE,
  });
  assert.equal(semRegistro.conquista, null);
  assert.equal(semRegistro.temHistorico, false);

  const recorde = calcularProgressao({
    tarefas: [diaria],
    conclusoes: conclusoesDe(1, ["2026-10-06", "2026-10-07", HOJE]),
    hoje: HOJE,
  });
  assert.equal(recorde.conquista.id, "recorde-3");

  // sequência de 3 dias, mas a última atividade foi há 3 dias: nada a celebrar agora
  const antigo = calcularProgressao({
    tarefas: [],
    conclusoes: conclusoesDe(1, ["2026-10-02", "2026-10-03", "2026-10-04"]),
    hoje: HOJE,
  });
  assert.equal(antigo.conquista, null);
});

test("agruparHistorico: por dia, mais recente primeiro", () => {
  const g = agruparHistorico([
    { dia: "2026-10-07", titulo: "A" },
    { dia: "2026-10-08", titulo: "B" },
    { dia: "2026-10-08", titulo: "C" },
  ]);
  assert.deepEqual(g, [
    { dia: "2026-10-08", total: 2, titulos: ["B", "C"] },
    { dia: "2026-10-07", total: 1, titulos: ["A"] },
  ]);
});
