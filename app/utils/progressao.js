const fusoSaoPaulo = "America/Sao_Paulo";
const diasSemana = [
  "domingo",
  "segunda",
  "terca",
  "quarta",
  "quinta",
  "sexta",
  "sabado",
];

function formatarDataNoFuso(data) {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: fusoSaoPaulo,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(data);
  const valores = Object.fromEntries(
    partes.map(({ type, value }) => [type, value]),
  );
  return `${valores.year}-${valores.month}-${valores.day}`;
}

function dataSaoPaulo(valor) {
  if (valor == null || valor === "") return null;
  if (valor instanceof Date) {
    return Number.isNaN(valor.getTime()) ? null : formatarDataNoFuso(valor);
  }

  const texto = String(valor);
  const data = texto.match(/^(\d{4}-\d{2}-\d{2})/);
  if (!data) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(texto)) return texto;
  if (!/[zZ]|[+-]\d{2}:?\d{2}$/.test(texto)) return data[1];

  const parseada = new Date(texto);
  return Number.isNaN(parseada.getTime()) ? null : formatarDataNoFuso(parseada);
}

function hojeSaoPaulo() {
  return formatarDataNoFuso(new Date());
}

function somarDias(data, quantidade) {
  const valor = dataSaoPaulo(data);
  if (!valor) return null;
  const resultado = new Date(`${valor}T12:00:00Z`);
  resultado.setUTCDate(resultado.getUTCDate() + Number(quantidade));
  return resultado.toISOString().slice(0, 10);
}

function inicioDaSemana(data) {
  const valor = dataSaoPaulo(data);
  if (!valor) return null;
  const resultado = new Date(`${valor}T12:00:00Z`);
  const dia = resultado.getUTCDay();
  resultado.setUTCDate(resultado.getUTCDate() - ((dia + 6) % 7));
  return resultado.toISOString().slice(0, 10);
}

function concluidaAgora(tarefa, hoje = hojeSaoPaulo()) {
  if (Number(tarefa?.concluida) !== 1 && tarefa?.concluida !== true)
    return false;
  const repeticao = tarefa.repeticao || "once";
  if (repeticao === "once") return true;

  const dataConclusao = dataSaoPaulo(tarefa.concluida_em);
  if (!dataConclusao) return true;
  if (repeticao === "daily") return dataConclusao === dataSaoPaulo(hoje);
  if (repeticao === "weekly") {
    return inicioDaSemana(dataConclusao) === inicioDaSemana(hoje);
  }
  return true;
}

function diaSemanaDaData(data) {
  const valor = dataSaoPaulo(data);
  if (!valor) return null;
  return diasSemana[new Date(`${valor}T12:00:00Z`).getUTCDay()];
}

function normalizarDiaSemana(dia) {
  if (dia == null) return null;
  const normalizado = String(dia)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .slice(0, 3);
  const aliases = {
    dom: "domingo",
    seg: "segunda",
    ter: "terca",
    qua: "quarta",
    qui: "quinta",
    sex: "sexta",
    sab: "sabado",
    sun: "domingo",
    mon: "segunda",
    tue: "terca",
    wed: "quarta",
    thu: "quinta",
    fri: "sexta",
    sat: "sabado",
  };
  return aliases[normalizado] || normalizado;
}

function dataTarefa(valor) {
  if (valor instanceof Date) {
    if (Number.isNaN(valor.getTime())) return null;
    return [
      valor.getFullYear(),
      String(valor.getMonth() + 1).padStart(2, "0"),
      String(valor.getDate()).padStart(2, "0"),
    ].join("-");
  }
  return dataSaoPaulo(valor);
}

function tarefaPrevistaNoDia(tarefa, dia) {
  const data = dataSaoPaulo(dia);
  if (!data) return false;
  const criacao = dataSaoPaulo(tarefa.criado_em);
  const datasDeInicio = [dataTarefa(tarefa.data), criacao]
    .filter(Boolean)
    .sort();
  const inicio = datasDeInicio.at(-1) || null;
  if (inicio && data < inicio) return false;

  const repeticao = tarefa.repeticao || "once";
  if (repeticao === "daily") return true;
  if (repeticao === "weekly") {
    return normalizarDiaSemana(tarefa.dia_semana) === diaSemanaDaData(data);
  }
  return inicio ? data === inicio : false;
}

function calcularAnalisePremium(registros, hoje = hojeSaoPaulo()) {
  const dataHoje = dataSaoPaulo(hoje);
  if (!dataHoje) throw new RangeError("Data inválida para análise Premium.");

  const eventos = (registros || [])
    .map((registro) => ({
      dia: dataSaoPaulo(registro.dia),
      categoria: registro.categoria || "geral",
      total: Number(registro.total) || 0,
    }))
    .filter((registro) => registro.dia && registro.total > 0);

  const totalEntre = (inicio, fim) =>
    eventos
      .filter((evento) => evento.dia >= inicio && evento.dia <= fim)
      .reduce((soma, evento) => soma + evento.total, 0);
  const contarDiasAtivos = (inicio, fim) =>
    new Set(
      eventos
        .filter((evento) => evento.dia >= inicio && evento.dia <= fim)
        .map((evento) => evento.dia),
    ).size;
  const contarCategorias = (inicio, fim) => {
    const totais = new Map();
    for (const evento of eventos) {
      if (evento.dia < inicio || evento.dia > fim) continue;
      totais.set(
        evento.categoria,
        (totais.get(evento.categoria) || 0) + evento.total,
      );
    }
    return [...totais.entries()]
      .map(([categoria, total]) => ({ categoria, total }))
      .sort((a, b) => b.total - a.total);
  };
  const variacao = (atual, anterior) =>
    anterior === 0
      ? atual === 0
        ? 0
        : null
      : Math.round(((atual - anterior) / anterior) * 100);

  const inicio30 = somarDias(dataHoje, -29);
  const inicio30Anterior = somarDias(dataHoje, -59);
  const fim30Anterior = somarDias(dataHoje, -30);
  const inicioSemana = inicioDaSemana(dataHoje);
  const inicioSemanaAnterior = somarDias(inicioSemana, -7);
  const fimSemanaAnterior = somarDias(inicioSemana, -1);
  const total30 = totalEntre(inicio30, dataHoje);
  const total30Anterior = totalEntre(inicio30Anterior, fim30Anterior);
  const totalSemana = totalEntre(inicioSemana, dataHoje);
  const totalSemanaAnterior = totalEntre(
    inicioSemanaAnterior,
    fimSemanaAnterior,
  );

  const tendenciaSemanal = Array.from({ length: 13 }, (_, indice) => {
    const inicio = somarDias(inicioSemana, (indice - 12) * 7);
    const fim = [somarDias(inicio, 6), dataHoje].sort()[0];
    return { inicio, total: totalEntre(inicio, fim) };
  });

  return {
    total90: totalEntre(somarDias(dataHoje, -89), dataHoje),
    total30,
    total30Anterior,
    variacao30: variacao(total30, total30Anterior),
    semanaAtual: {
      total: totalSemana,
      diasAtivos: contarDiasAtivos(inicioSemana, dataHoje),
      categorias: contarCategorias(inicioSemana, dataHoje),
    },
    semanaAnterior: {
      total: totalSemanaAnterior,
      diasAtivos: contarDiasAtivos(inicioSemanaAnterior, fimSemanaAnterior),
      categorias: contarCategorias(inicioSemanaAnterior, fimSemanaAnterior),
    },
    variacaoSemanal: variacao(totalSemana, totalSemanaAnterior),
    categorias: contarCategorias(inicio30, dataHoje),
    tendenciaSemanal,
  };
}

function intervaloDias(inicio, quantidade) {
  return Array.from({ length: quantidade }, (_, indice) =>
    somarDias(inicio, indice),
  );
}

function criarEventos(conclusoes) {
  const eventosPorDia = new Map();
  const eventos = new Set();
  for (const conclusao of conclusoes || []) {
    const dia = dataSaoPaulo(conclusao.dia || conclusao.data_referencia);
    if (!dia || conclusao.tarefa_id == null) continue;
    const tarefaId = String(conclusao.tarefa_id);
    const chave = `${dia}:${tarefaId}`;
    if (eventos.has(chave)) continue;
    eventos.add(chave);
    if (!eventosPorDia.has(dia)) eventosPorDia.set(dia, new Set());
    eventosPorDia.get(dia).add(tarefaId);
  }
  return { eventos, eventosPorDia };
}

function contarEventos(eventosPorDia, inicio, fim) {
  let total = 0;
  for (const [dia, tarefasDoDia] of eventosPorDia) {
    if (dia >= inicio && dia <= fim) total += tarefasDoDia.size;
  }
  return total;
}

function calcularComparacao(eventosPorDia, hoje, periodo, primeiraConclusao) {
  const inicioAnterior = somarDias(hoje, -(periodo * 2 - 1));
  const fimAnterior = somarDias(hoje, -periodo);
  const inicioAtual = somarDias(hoje, -(periodo - 1));
  if (!primeiraConclusao || primeiraConclusao > inicioAnterior) return null;

  const totalAtual = contarEventos(eventosPorDia, inicioAtual, hoje);
  const totalAnterior = contarEventos(
    eventosPorDia,
    inicioAnterior,
    fimAnterior,
  );
  const variacao =
    totalAnterior === 0
      ? totalAtual === 0
        ? 0
        : 100
      : Math.round(((totalAtual - totalAnterior) / totalAnterior) * 100);
  return { totalAnterior, variacao };
}

function calcularSequencia(tarefas, eventosPorDia, hoje) {
  const diasComEventos = [...eventosPorDia.keys()]
    .filter((dia) => dia <= hoje)
    .sort();
  const criacoes = tarefas
    .map((tarefa) => dataSaoPaulo(tarefa.criado_em))
    .filter(Boolean);
  const inicio = [...diasComEventos, ...criacoes].sort()[0];
  if (!inicio) return { atual: 0, recorde: 0 };

  const hojeTemConclusao = eventosPorDia.has(hoje);
  const ultimoDia = hojeTemConclusao ? hoje : somarDias(hoje, -1);
  let atual = 0;
  let recorde = 0;
  let pausas = 0;

  for (let dia = inicio; dia <= ultimoDia; dia = somarDias(dia, 1)) {
    if (eventosPorDia.has(dia)) {
      atual += 1;
      pausas = 0;
      recorde = Math.max(recorde, atual);
      continue;
    }
    if (tarefas.some((tarefa) => tarefaPrevistaNoDia(tarefa, dia))) {
      pausas += 1;
      if (pausas >= 2) {
        atual = 0;
        pausas = 0;
      }
    }
  }
  return { atual, recorde };
}

function calcularProgressao({
  tarefas = [],
  conclusoes = [],
  hoje = hojeSaoPaulo(),
}) {
  const dataHoje = dataSaoPaulo(hoje);
  const { eventos, eventosPorDia } = criarEventos(conclusoes);
  const diasComConclusao = eventosPorDia.size;
  const primeiraConclusao = [...eventosPorDia.keys()].sort()[0] || null;
  const dias = intervaloDias(somarDias(dataHoje, -29), 30).map((iso) => ({
    iso,
    concluidas: eventosPorDia.get(iso)?.size || 0,
  }));

  const periodos = {};
  for (const periodo of [7, 30]) {
    const diasPeriodo = dias.slice(30 - periodo);
    const total = diasPeriodo.reduce((soma, dia) => soma + dia.concluidas, 0);
    const diasAtivos = diasPeriodo.filter((dia) => dia.concluidas > 0).length;
    const inicio = diasPeriodo[0].iso;
    let previstas = 0;
    for (const dia of diasPeriodo) {
      previstas += tarefas.filter((tarefa) =>
        tarefaPrevistaNoDia(tarefa, dia.iso),
      ).length;
    }
    periodos[periodo] = {
      dias: diasPeriodo,
      total,
      diasAtivos,
      taxa: previstas
        ? Math.min(100, Math.round((total / previstas) * 100))
        : null,
      comparacao: calcularComparacao(
        eventosPorDia,
        dataHoje,
        periodo,
        primeiraConclusao,
      ),
    };
  }

  const tarefasPorId = new Map(
    tarefas.map((tarefa) => [String(tarefa.id), tarefa]),
  );
  const conclusoesHoje = eventosPorDia.get(dataHoje) || new Set();
  const previstasHoje = tarefas.filter((tarefa) =>
    tarefaPrevistaNoDia(tarefa, dataHoje),
  );
  const idsPrevistosHoje = new Set(
    previstasHoje.map((tarefa) => String(tarefa.id)),
  );
  const extrasHoje = [...conclusoesHoje].filter(
    (id) => !idsPrevistosHoje.has(id),
  ).length;

  const inicioSemana = inicioDaSemana(dataHoje);
  const diasSemanaAtual = intervaloDias(inicioSemana, 7);
  let previstasSemana = 0;
  for (const dia of diasSemanaAtual) {
    previstasSemana += tarefas.filter((tarefa) =>
      tarefaPrevistaNoDia(tarefa, dia),
    ).length;
  }
  const concluidasSemana = contarEventos(
    eventosPorDia,
    inicioSemana,
    somarDias(inicioSemana, 6),
  );
  const diasEsperadosSemana = new Set();
  for (const dia of diasSemanaAtual) {
    if (tarefas.some((tarefa) => tarefaPrevistaNoDia(tarefa, dia)))
      diasEsperadosSemana.add(dia);
  }

  const recorde = calcularSequencia(tarefas, eventosPorDia, dataHoje);
  const ultimaConclusao = [...eventosPorDia.keys()]
    .filter((dia) => dia <= dataHoje)
    .sort()
    .at(-1);
  let conquista = null;
  if (
    recorde.recorde >= 3 &&
    ultimaConclusao &&
    somarDias(dataHoje, -1) <= ultimaConclusao
  ) {
    conquista = {
      id: `recorde-${recorde.recorde}`,
      titulo: "Nova sequência!",
      texto: `Você concluiu tarefas por ${recorde.recorde} dias seguidos.`,
      icone: "flame",
    };
  }

  return {
    hoje: dataHoje,
    temHistorico: eventos.size > 0,
    diasComConclusao,
    periodos,
    sequencia: recorde,
    semana: {
      diasAtivos: diasSemanaAtual.filter(
        (dia) => (eventosPorDia.get(dia)?.size || 0) > 0,
      ).length,
      totalDias: 7,
      metaDiasAtivos: diasEsperadosSemana.size,
    },
    metaDiaria: {
      concluidas: conclusoesHoje.size,
      previstas: previstasHoje.length + extrasHoje,
    },
    metaSemanal: {
      concluidas: Math.min(concluidasSemana, previstasSemana),
      previstas: previstasSemana,
    },
    conquista,
  };
}

function agruparHistorico(historico) {
  const porDia = new Map();
  for (const item of historico || []) {
    const dia = dataSaoPaulo(item.dia);
    if (!dia) continue;
    if (!porDia.has(dia)) porDia.set(dia, []);
    porDia.get(dia).push(item.titulo);
  }
  return [...porDia.entries()]
    .sort(([diaA], [diaB]) => diaB.localeCompare(diaA))
    .map(([dia, titulos]) => ({ dia, total: titulos.length, titulos }));
}

module.exports = {
  dataSaoPaulo,
  hojeSaoPaulo,
  somarDias,
  inicioDaSemana,
  concluidaAgora,
  tarefaPrevistaNoDia,
  calcularAnalisePremium,
  calcularProgressao,
  agruparHistorico,
};
