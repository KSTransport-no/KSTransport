const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const logger = require("../utils/logger");
const { handleError } = require("../utils/errorHandler");

const router = express.Router();

// Pålogging
router.post(
  "/login",
  [body("epost").isEmail(), body("passord").isLength({ min: 6 })],
  async (req, res) => {
    try {
      logger.log("Login forespørsel mottatt:", req.body);

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.log("Valideringsfeil:", errors.array());
        return res
          .status(400)
          .json({ feil: "Ugyldig input", detaljer: errors.array() });
      }

      const { epost, passord } = req.body;
      logger.log("Prøver å logge inn:", epost);

      // Finn bruker
      const result = await pool.query(
        "SELECT id, navn, epost, passord_hash, aktiv, admin FROM sjåfører WHERE epost = $1",
        [epost],
      );

      logger.log("Database resultat:", result.rows.length, "rader funnet");

      if (result.rows.length === 0) {
        logger.log("Ingen bruker funnet for e-post:", epost);
        return res.status(401).json({ feil: "Ugyldig e-post eller passord" });
      }

      const sjåfør = result.rows[0];
      logger.log("Bruker funnet:", sjåfør.navn, "Aktiv:", sjåfør.aktiv);

      if (!sjåfør.aktiv) {
        logger.log("Bruker er deaktivert");
        return res.status(401).json({ feil: "Kontoen er deaktivert" });
      }

      // Sjekk passord
      logger.log("Sjekker passord...");
      const validPassword = await bcrypt.compare(passord, sjåfør.passord_hash);
      logger.log("Passord gyldig:", validPassword);

      if (!validPassword) {
        logger.log("Ugyldig passord");
        return res.status(401).json({ feil: "Ugyldig e-post eller passord" });
      }

      // Generer JWT token
      const token = jwt.sign(
        { sjåførId: sjåfør.id, epost: sjåfør.epost },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN || "48h" },
      );

      res.json({
        melding: "Pålogging vellykket",
        token,
        sjåfør: {
          id: sjåfør.id,
          navn: sjåfør.navn,
          epost: sjåfør.epost,
          admin: sjåfør.admin,
        },
      });
    } catch (error) {
      handleError(error, req, res, "Login endpoint", { endpoint: "/login" });
    }
  },
);

// Hent brukerinfo
router.get("/me", authenticateToken, async (req, res) => {
  try {
    res.json({
      sjåfør: req.sjåfør,
    });
  } catch (error) {
    handleError(error, req, res, "Get user info endpoint");
  }
});

// Endre passord
router.put(
  "/endre-passord",
  authenticateToken,
  [
    body("nåværendePassord").isLength({ min: 6 }),
    body("nyttPassord").isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ feil: "Ugyldig input", detaljer: errors.array() });
      }

      const { nåværendePassord, nyttPassord } = req.body;

      // Hent nåværende passord hash
      const result = await pool.query(
        "SELECT passord_hash FROM sjåfører WHERE id = $1",
        [req.sjåfør.id],
      );

      const sjåfør = result.rows[0];

      // Sjekk nåværende passord
      const validPassword = await bcrypt.compare(
        nåværendePassord,
        sjåfør.passord_hash,
      );
      if (!validPassword) {
        return res.status(401).json({ feil: "Nåværende passord er feil" });
      }

      // Hash nytt passord
      const saltRounds = 10;
      const newPasswordHash = await bcrypt.hash(nyttPassord, saltRounds);

      // Oppdater passord
      await pool.query(
        "UPDATE sjåfører SET passord_hash = $1, sist_endret = CURRENT_TIMESTAMP WHERE id = $2",
        [newPasswordHash, req.sjåfør.id],
      );

      res.json({ melding: "Passord endret vellykket" });
    } catch (error) {
      handleError(error, req, res, "Change password endpoint");
    }
  },
);

// Oppdater egen profil
router.put(
  "/profile",
  authenticateToken,
  [
    body("navn").optional().isLength({ min: 2, max: 100 }),
    body("epost").optional().isEmail(),
    body("telefon").optional().isLength({ max: 20 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res
          .status(400)
          .json({ feil: "Ugyldig input", detaljer: errors.array() });
      }

      const { navn, epost, telefon } = req.body;

      const updates = [];
      const values = [];
      let paramCount = 1;

      if (navn !== undefined) {
        updates.push(`navn = $${paramCount++}`);
        values.push(navn);
      }
      if (epost !== undefined) {
        // Sjekk om epost allerede er i bruk av en annen bruker
        const existingUser = await pool.query(
          "SELECT id FROM sjåfører WHERE epost = $1 AND id != $2",
          [epost, req.sjåfør.id],
        );
        if (existingUser.rows.length > 0) {
          return res.status(400).json({ feil: "E-post er allerede i bruk" });
        }
        updates.push(`epost = $${paramCount++}`);
        values.push(epost);
      }
      if (telefon !== undefined) {
        updates.push(`telefon = $${paramCount++}`);
        values.push(telefon);
      }

      if (updates.length === 0) {
        return res.status(400).json({ feil: "Ingen endringer spesifisert" });
      }

      updates.push(`sist_endret = CURRENT_TIMESTAMP`);
      values.push(req.sjåfør.id);

      const result = await pool.query(
        `UPDATE sjåfører SET ${updates.join(", ")} WHERE id = $${paramCount} RETURNING id, navn, epost, telefon, admin`,
        values,
      );

      if (result.rows.length === 0) {
        return res.status(404).json({ feil: "Sjåfør ikke funnet" });
      }

      res.json({ melding: "Profil oppdatert", sjåfør: result.rows[0] });
    } catch (error) {
      handleError(error, req, res, "Update profile endpoint");
    }
  },
);

module.exports = router;
