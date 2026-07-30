const CHAVE = "hs_alim_prog";
      let progresso = Number(localStorage.getItem(CHAVE) || 0);
      const btn = document.getElementById("btnAcao");
      const porcTexto = document.getElementById("porcTexto");
      const fill = document.getElementById("barraFill");
      const track = document.getElementById("barraTrack");

      function renderProgresso() {
        fill.style.width = progresso + "%";
        porcTexto.textContent = progresso + "% concluída";
        track.setAttribute("aria-valuenow", progresso);
        if (progresso >= 100) {
          btn.textContent = "✓ Concluída!";
          btn.disabled = true;
        }
      }

      function salvarDia() {
        if (progresso >= 100) return;
        const ids = ["cafe", "lanche1", "almoco", "lanche2", "jantar"];
        const marcadas = ids.filter(
          (id) => document.getElementById(id).checked,
        ).length;
        if (marcadas === 0) {
          alert("Marque pelo menos uma refeição antes de salvar!");
          return;
        }
        progresso = Math.min(progresso + 14, 100);
        localStorage.setItem(CHAVE, progresso);
        renderProgresso();
        if (progresso < 100) btn.textContent = "Salvar próximo dia";
        ids.forEach((id) => {
          document.getElementById(id).checked = false;
        });
      }

      renderProgresso();