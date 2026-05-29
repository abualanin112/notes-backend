import nodemailer from 'nodemailer';
import { config } from './config.js';
import { logger } from './logger.js';

const transport = nodemailer.createTransport(config.email.smtp);
/* istanbul ignore next */
if (config.env !== 'test') {
  transport
    .verify()
    .then(() => logger.info({ event: 'system.email.connected' }, 'Connected to email server'))
    .catch(() =>
      logger.warn(
        { event: 'system.email.connection_failed' },
        'Unable to connect to email server. Make sure you have configured the SMTP options in .env',
      ),
    );
}

/**
 * Send an email
 * @param {string} to
 * @param {string} subject
 * @param {string} text
 * @returns {Promise}
 */
const sendEmail = async (to, subject, text) => {
  const msg = { from: config.email.from, to, subject, text };
  await transport.sendMail(msg);
};

export { transport, sendEmail };
