const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

function verificarAdmin(req, res, next) {
  if (req.session?.adminAutenticado) {
    return next();
  }

  return res.redirect("/admin");
}

router.get("/", adminController.exibirLogin);
router.post("/", adminController.processarLogin);

router.get("/painel", verificarAdmin, adminController.exibirPainel);

router.get("/usuarios", verificarAdmin, adminController.exibirUsuarios);
router.get("/usuario/:id", verificarAdmin, adminController.exibirUsuario);
router.post(
  "/usuario/deletar/:id",
  verificarAdmin,
  adminController.deletarUsuario,
);

router.get("/suporte", verificarAdmin, adminController.exibirSuporte);
router.post(
  "/suporte/:id/responder",
  verificarAdmin,
  adminController.responderSuporte,
);
router.post(
  "/suporte/:id/status",
  verificarAdmin,
  adminController.alterarStatusSuporte,
);

router.get("/sair", verificarAdmin, adminController.sair);

module.exports = router;
