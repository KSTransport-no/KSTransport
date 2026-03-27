const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");
const pool = require("../config/database");
const { authenticateToken } = require("../middleware/auth");
const logger = require("../utils/logger");
const { handleError } = require("../utils/errorHandler");
const { sendMail } = require("../utils/email");

const router = express.Router();

// Strict rate limiter for login — 5 attempts per 15 minutes per IP
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { feil: "For mange innloggingsforsøk. Prøv igjen om 15 minutter." },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Strict rate limiter for password change — 5 attempts per 15 minutes
const passwordChangeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { feil: "For mange forsøk på passordendring. Prøv igjen om 15 minutter." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Pålogging
router.post(
  "/login",
  loginLimiter,
  [body("epost").isEmail(), body("passord").isLength({ min: 6 })],
  async (req, res) => {
    try {
      logger.debug('Login attempt', { epost: req.body.epost });

      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        logger.debug('Login validation failed', errors.array());
        return res
          .status(400)
          .json({ feil: "Ugyldig input", detaljer: errors.array() });
      }

      const { epost, passord } = req.body;

      // Finn bruker
      const result = await pool.query(
        "SELECT id, navn, epost, passord_hash, aktiv, admin FROM sjåfører WHERE epost = $1",
        [epost],
      );

      if (result.rows.length === 0) {
        logger.debug('Login failed - user not found');
        return res.status(401).json({ feil: "Ugyldig e-post eller passord" });
      }

      const sjåfør = result.rows[0];

      if (!sjåfør.aktiv) {
        logger.info('Login rejected - deactivated account', { userId: sjåfør.id });
        return res.status(401).json({ feil: "Kontoen er deaktivert" });
      }

      // Sjekk passord
      const validPassword = await bcrypt.compare(passord, sjåfør.passord_hash);

      if (!validPassword) {
        logger.debug('Login failed - invalid password');
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
  passwordChangeLimiter,
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

// Rate limiter for reset requests
const resetLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 3,
  message: { feil: "For mange forespørsler. Prøv igjen om 15 minutter." },
  standardHeaders: true,
  legacyHeaders: false,
});

// Request password reset — sends email with time-limited token
router.post(
  "/glemt-passord",
  resetLimiter,
  [body("epost").isEmail()],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ feil: "Ugyldig e-postadresse" });
      }

      const { epost } = req.body;

      // Always return success to prevent email enumeration
      const successMsg = { melding: "Hvis e-postadressen finnes, vil du motta en tilbakestillingslenke." };

      const result = await pool.query(
        "SELECT id, navn FROM sjåfører WHERE epost = $1 AND aktiv = true",
        [epost],
      );

      if (result.rows.length === 0) {
        return res.json(successMsg);
      }

      const sjåfør = result.rows[0];

      // Invalidate any existing unused tokens for this user
      await pool.query(
        "UPDATE password_reset_tokens SET used = true WHERE sjåfør_id = $1 AND used = false",
        [sjåfør.id],
      );

      // Generate a secure random token
      const rawToken = crypto.randomBytes(32).toString("hex");
      const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      await pool.query(
        "INSERT INTO password_reset_tokens (sjåfør_id, token_hash, expires_at) VALUES ($1, $2, $3)",
        [sjåfør.id, tokenHash, expiresAt],
      );

      // Build reset URL
      const baseUrl = process.env.FRONTEND_URL || "http://localhost:3002";
      const resetUrl = `${baseUrl}/login/tilbakestill?token=${rawToken}`;

      await sendMail({
        to: epost,
        subject: "Tilbakestill passord — KS Transport",
        html: `
          <h2>Hei ${sjåfør.navn},</h2>
          <p>Vi mottok en forespørsel om å tilbakestille passordet ditt.</p>
          <p><a href="${resetUrl}" style="display:inline-block;padding:12px 24px;background:#2563eb;color:#fff;border-radius:6px;text-decoration:none;font-weight:bold;">Tilbakestill passord</a></p>
          <p>Lenken er gyldig i 1 time. Hvis du ikke ba om dette, kan du ignorere denne e-posten.</p>
          <p style="color:#666;font-size:12px;">— KS Transport</p>
        `,
      });

      res.json(successMsg);
    } catch (error) {
      handleError(error, req, res, "Password reset request endpoint");
    }
  },
);

// Reset password with token
router.post(
  "/tilbakestill-passord",
  resetLimiter,
  [
    body("token").isLength({ min: 64, max: 64 }),
    body("nyttPassord").isLength({ min: 6 }),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ feil: "Ugyldig input" });
      }

      const { token, nyttPassord } = req.body;
      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

      const result = await pool.query(
        `SELECT prt.id, prt.sjåfør_id
         FROM password_reset_tokens prt
         JOIN sjåfører s ON s.id = prt.sjåfør_id AND s.aktiv = true
         WHERE prt.token_hash = $1 AND prt.used = false AND prt.expires_at > NOW()`,
        [tokenHash],
      );

      if (result.rows.length === 0) {
        return res.status(400).json({ feil: "Ugyldig eller utløpt tilbakestillingslenke" });
      }

      const { id: tokenId, sjåfør_id } = result.rows[0];

      const newHash = await bcrypt.hash(nyttPassord, 10);

      await pool.query(
        "UPDATE sjåfører SET passord_hash = $1, sist_endret = CURRENT_TIMESTAMP WHERE id = $2",
        [newHash, sjåfør_id],
      );

      await pool.query(
        "UPDATE password_reset_tokens SET used = true WHERE id = $1",
        [tokenId],
      );

      res.json({ melding: "Passordet er tilbakestilt. Du kan nå logge inn." });
    } catch (error) {
      handleError(error, req, res, "Password reset endpoint");
    }
  },
);

module.exports = router;
