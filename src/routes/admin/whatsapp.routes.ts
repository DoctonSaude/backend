import { Router } from 'express';
import prisma from '../../lib/prisma';
import whatsappService from '../../services/whatsapp.service';

const router = Router();

// GET /whatsapp/connections
router.get('/connections', async (req, res) => {
  try {
    const connections = await prisma.adminWhatsappConnection.findMany();
    res.json(connections);
  } catch (error) {
    console.error('Error fetching WhatsApp connections:', error);
    res.status(500).json({ error: 'Erro ao buscar conexões' });
  }
});

// POST /connections (Create/Update Instance & Boot Baileys)
router.post('/connections', async (req, res) => {
  try {
    const { instanceName, role } = req.body;
    let connection = await prisma.adminWhatsappConnection.findUnique({
      where: { instanceName }
    });
    
    if (!connection) {
       connection = await prisma.adminWhatsappConnection.create({
         // @ts-ignore - TODO: Schema drift fix
         data: { instanceName, role, status: 'INITIATING' }
       });
    } else {
       connection = await prisma.adminWhatsappConnection.update({
         where: { instanceName },
         // @ts-ignore - TODO: Schema drift fix
         data: { role, status: 'INITIATING', lastQrCode: null }
       });
    }

    // Trigger Baileys async initialization
    whatsappService.getOrCreateSession(instanceName);

    res.json(connection);
  } catch (error) {
    console.error('Error creating connection:', error);
    res.status(500).json({ error: 'Erro ao criar conexão' });
  }
});

// GET /whatsapp/qr/:instanceName
router.get('/qr/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    const connection = await prisma.adminWhatsappConnection.findUnique({
      where: { instanceName }
    });

    if (!connection) {
      return res.status(404).json({ error: 'Conexão não encontrada' });
    }

    // Retorna o base64 real armazenado pelo serviço do Baileys
    res.json({
      qrCode: connection.lastQrCode,
      status: connection.status,
      connectedPhone: connection.connectedPhone
    });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao carregar QR Code' });
  }
});

// DELETE /whatsapp/connections/:instanceName
router.delete('/connections/:instanceName', async (req, res) => {
  try {
    const { instanceName } = req.params;
    
    // Kill the Baileys session gracefully
    await whatsappService.logoutSession(instanceName);

    await prisma.adminWhatsappConnection.update({
      where: { instanceName },
      data: { status: 'DISCONNECTED', lastQrCode: null, connectedPhone: null }
    });
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error disconnecting:', error);
    res.status(500).json({ error: 'Erro ao desconectar' });
  }
});

export default router;
