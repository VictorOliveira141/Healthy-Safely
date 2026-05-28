const express         = require("express");
const router          = express.Router();
const adminController = require("../controllers/adminController");

function verificarAdmin(req, res, next) {
  if (req.session?.adminAutenticado) return next();
  return res.redirect("/admin");
}

// ──────────────── Apenas admin podem acessar ────────────────
router.get("/",       adminController.exibirLogin);
router.post("/",      adminController.processarLogin);
router.get("/painel", verificarAdmin, adminController.exibirPainel);
router.get("/suporte", verificarAdmin,adminController.exibirSuporte);
router.get("/sair",   verificarAdmin, adminController.sair);

/*Gerenciamento de usuários*/
router.post("/usuario/deletar/:id", verificarAdmin, adminController.deletarUsuario);

/*Solicitações*/
router.post("/solicitacao/aprovar/:id",  verificarAdmin, adminController.aprovarSolicitacao);
router.post("/solicitacao/rejeitar/:id", verificarAdmin, adminController.rejeitarSolicitacao);

module.exports = router;
