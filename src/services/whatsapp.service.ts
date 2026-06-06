import makeWASocket, { DisconnectReason, useMultiFileAuthState } from '@whiskeysockets/baileys';
import { Boom } from '@hapi/boom';
import * as QRCode from 'qrcode';
import prisma from '../lib/prisma';
import fs from 'fs';
import path from 'path';

class WhatsAppService {
  private sessions = new Map<string, ReturnType<typeof makeWASocket>>();

  public async getOrCreateSession(instanceName: string) {
    if (this.sessions.has(instanceName)) {
      return this.sessions.get(instanceName);
    }

    try {
      const sessionDir = path.join(process.cwd(), 'whatsapp_sessions', instanceName);
      if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
      }

      const { state, saveCreds } = await useMultiFileAuthState(sessionDir);

      const sock = makeWASocket({
        auth: state,
        printQRInTerminal: false,
        browser: ['Docton Admin', 'Chrome', '1.0.0'],
      });

      this.sessions.set(instanceName, sock);

      sock.ev.on('creds.update', saveCreds);

      sock.ev.on('connection.update', async (update) => {
        const { connection, lastDisconnect, qr } = update;

        if (qr) {
          console.log(`[WhatsApp] Receieved QR for ${instanceName}`);
          const qrBase64 = await QRCode.toDataURL(qr);
          
          await prisma.adminWhatsappConnection.update({
            where: { instanceName },
            data: { 
              status: 'QRCODE_READY',
              lastQrCode: qrBase64 
            }
          });
        }

        if (connection === 'close') {
          const shouldReconnect = (lastDisconnect?.error as Boom)?.output?.statusCode !== DisconnectReason.loggedOut;
          console.log(`[WhatsApp] Connection closed for ${instanceName}. Reconnecting: ${shouldReconnect}`);
          
          if (shouldReconnect) {
            this.sessions.delete(instanceName);
            this.getOrCreateSession(instanceName);
          } else {
            console.log(`[WhatsApp] Logged out from ${instanceName}. Clearing DB state.`);
            this.sessions.delete(instanceName);
            // Deleles local folder
            fs.rmSync(sessionDir, { recursive: true, force: true });
            await prisma.adminWhatsappConnection.update({
              where: { instanceName },
              data: { status: 'DISCONNECTED', lastQrCode: null, connectedPhone: null }
            });
          }
        } else if (connection === 'open') {
          console.log(`[WhatsApp] Connected successfully for ${instanceName}`);
          await prisma.adminWhatsappConnection.update({
            where: { instanceName },
            data: { 
              status: 'CONNECTED', 
              lastQrCode: null,
              connectedPhone: sock.user?.id?.split(':')[0] || 'Unknown'
            }
          });
        }
      });

      // --- INCOMING MESSAGE HANDLER (Future CRM Integration) ---
      sock.ev.on('messages.upsert', async ({ messages, type }) => {
        if (type === 'notify') {
          for (const msg of messages) {
            if (!msg.key.fromMe && msg.message) {
              console.log(`[WhatsApp Msg - ${instanceName}] from ${msg.key.remoteJid}: `, msg.message.conversation);
              // Integration with Neural Chains or Support will go here
            }
          }
        }
      });

      return sock;
    } catch (error) {
      console.error(`[WhatsApp] Failed to init session ${instanceName}`, error);
      throw error;
    }
  }

  public async logoutSession(instanceName: string) {
     const sock = this.sessions.get(instanceName);
     if (sock) {
       await sock.logout();
       this.sessions.delete(instanceName);
     }
  }

  public async sendMessage(instanceName: string, to: string, text: string) {
    try {
      const sock = await this.getOrCreateSession(instanceName);
      if (!sock) throw new Error('WhatsApp session not ready');
      
      const jid = to.includes('@s.whatsapp.net') ? to : `${to.replace(/\D/g, '')}@s.whatsapp.net`;
      
      return await sock.sendMessage(jid, { text });
    } catch (error) {
      console.error(`[WhatsApp] Failed to send message to ${to} on ${instanceName}:`, error);
      throw error;
    }
  }
}

export default new WhatsAppService();
