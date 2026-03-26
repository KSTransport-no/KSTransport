const pool = require('../config/database');
const logger = require('./logger');

/**
 * Create a notification for a specific user
 */
async function createNotification({ mottakerId, type, tittel, melding, lenke, relatertType, relatertId }) {
  try {
    await pool.query(
      `INSERT INTO varslinger (mottaker_id, type, tittel, melding, lenke, relatert_type, relatert_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [mottakerId, type, tittel, melding, lenke || null, relatertType || null, relatertId || null]
    );
  } catch (error) {
    logger.error('Failed to create notification:', error.message);
  }
}

/**
 * Notify all admins about a new avvik or forbedringsforslag
 */
async function notifyAdmins({ type, tittel, melding, lenke, relatertType, relatertId }) {
  try {
    const admins = await pool.query('SELECT id FROM sjåfører WHERE admin = true AND aktiv = true');
    for (const admin of admins.rows) {
      await createNotification({
        mottakerId: admin.id,
        type,
        tittel,
        melding,
        lenke,
        relatertType,
        relatertId,
      });
    }
  } catch (error) {
    logger.error('Failed to notify admins:', error.message);
  }
}

/**
 * Notify user when their avvik status changes
 */
async function notifyAvvikStatusChange(avvikId, newStatus, adminNavn) {
  try {
    const result = await pool.query('SELECT sjåfør_id, type FROM avvik WHERE id = $1', [avvikId]);
    if (result.rows.length === 0) return;

    const { sjåfør_id, type } = result.rows[0];
    const statusLabels = {
      under_behandling: 'under behandling',
      løst: 'løst',
      avvist: 'avvist',
      ny: 'ny',
    };

    await createNotification({
      mottakerId: sjåfør_id,
      type: 'avvik_oppdatering',
      tittel: `Avvik oppdatert`,
      melding: `Ditt avvik "${type}" er nå ${statusLabels[newStatus] || newStatus}${adminNavn ? ` av ${adminNavn}` : ''}.`,
      lenke: '/avvik',
      relatertType: 'avvik',
      relatertId: avvikId,
    });
  } catch (error) {
    logger.error('Failed to notify avvik status change:', error.message);
  }
}

/**
 * Notify user when admin comments on their avvik
 */
async function notifyAvvikComment(avvikId, adminNavn) {
  try {
    const result = await pool.query('SELECT sjåfør_id, type FROM avvik WHERE id = $1', [avvikId]);
    if (result.rows.length === 0) return;

    const { sjåfør_id, type } = result.rows[0];

    await createNotification({
      mottakerId: sjåfør_id,
      type: 'avvik_kommentar',
      tittel: 'Ny kommentar på avvik',
      melding: `${adminNavn} har kommentert på ditt avvik "${type}".`,
      lenke: '/avvik',
      relatertType: 'avvik',
      relatertId: avvikId,
    });
  } catch (error) {
    logger.error('Failed to notify avvik comment:', error.message);
  }
}

/**
 * Notify user when their forbedringsforslag status changes
 */
async function notifyForslagStatusChange(forslagId, newStatus, adminNavn) {
  try {
    const result = await pool.query('SELECT sjåfør_id, tittel FROM forbedringsforslag WHERE id = $1', [forslagId]);
    if (result.rows.length === 0) return;

    const { sjåfør_id, tittel } = result.rows[0];
    const statusLabels = {
      'under behandling': 'under behandling',
      besvart: 'besvart',
      ny: 'ny',
    };

    await createNotification({
      mottakerId: sjåfør_id,
      type: 'forslag_oppdatering',
      tittel: 'Forbedringsforslag oppdatert',
      melding: `Ditt forslag "${tittel}" er nå ${statusLabels[newStatus] || newStatus}${adminNavn ? ` av ${adminNavn}` : ''}.`,
      lenke: '/forbedringsforslag',
      relatertType: 'forbedringsforslag',
      relatertId: forslagId,
    });
  } catch (error) {
    logger.error('Failed to notify forslag status change:', error.message);
  }
}

/**
 * Notify user when admin comments on their forbedringsforslag
 */
async function notifyForslagComment(forslagId, adminNavn) {
  try {
    const result = await pool.query('SELECT sjåfør_id, tittel FROM forbedringsforslag WHERE id = $1', [forslagId]);
    if (result.rows.length === 0) return;

    const { sjåfør_id, tittel } = result.rows[0];

    await createNotification({
      mottakerId: sjåfør_id,
      type: 'forslag_kommentar',
      tittel: 'Ny kommentar på forslag',
      melding: `${adminNavn} har kommentert på ditt forslag "${tittel}".`,
      lenke: '/forbedringsforslag',
      relatertType: 'forbedringsforslag',
      relatertId: forslagId,
    });
  } catch (error) {
    logger.error('Failed to notify forslag comment:', error.message);
  }
}

module.exports = {
  createNotification,
  notifyAdmins,
  notifyAvvikStatusChange,
  notifyAvvikComment,
  notifyForslagStatusChange,
  notifyForslagComment,
};
