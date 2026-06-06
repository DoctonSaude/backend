import { Router } from 'express';
import prisma from '../../lib/prisma';
import whatsappService from '../../services/whatsapp.service';

const router = Router();

// --- LEADS ---

// GET /crm/leads
router.get('/leads', async (req, res) => {
  try {
    const leads = await prisma.acquiredLead.findMany({
      orderBy: { createdAt: 'desc' }
    });
    res.json(leads);
  } catch (error) {
    console.error('Error fetching leads:', error);
    res.status(500).json({ error: 'Erro ao buscar leads' });
  }
});

// DELETE /crm/leads/:id
router.delete('/leads/:id', async (req, res) => {
  try {
    await prisma.acquiredLead.delete({ where: { id: req.params.id } });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao remover lead' });
  }
});

// POST /crm/leads (Manual or Scraper ingestion)
router.post('/leads', async (req, res) => {
  try {
    const { businessName, phone, city, category, notes } = req.body;
    const lead = await prisma.acquiredLead.create({
      data: { businessName, phone, city, category, notes }
    });
    res.json(lead);
  } catch (error) {
    console.error('Error creating lead:', error);
    res.status(500).json({ error: 'Erro ao criar lead' });
  }
});

// POST /leads/bulk (CSV Upload)
router.post('/leads/bulk', async (req, res) => {
  try {
    const { leads } = req.body;
    if (!leads || !Array.isArray(leads)) return res.status(400).json({ error: 'Formato inválido' });

    let importedCount = 0;
    for (const lead of leads) {
       await prisma.acquiredLead.create({
         data: {
           businessName: lead.businessName,
           city: lead.city || 'Desconhecido',
           phone: lead.phone,
           category: lead.category || 'Outros',
           status: 'COLD'
         }
       });
       importedCount++;
    }

    res.json({ message: 'Lote importado', count: importedCount });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Erro ao processar CSV' });
  }
});

// POST /scraper (Mock Data Extractor Bot)
router.post('/scraper', async (req, res) => {
  try {
    const { city, category } = req.body;
    
    // Simulate real web scraping latency
    await new Promise(resolve => setTimeout(resolve, 3500));

    const mockNames = ['Vida', 'Saúde', 'Cuidar', 'Bem Estar', 'Prime', 'Excelência'];
    const mockSurnames = ['Centro Médico', 'Clínica', 'Odontologia', 'Especialidades', 'Integrada'];

    const countToExtract = Math.floor(Math.random() * 5) + 3; // 3 to 7 leads
    
    for (let i=0; i < countToExtract; i++) {
       const n1 = mockNames[Math.floor(Math.random() * mockNames.length)];
       const n2 = mockSurnames[Math.floor(Math.random() * mockSurnames.length)];
       const fakePhone = `55119${Math.floor(10000000 + Math.random() * 90000000)}`;
       
       await prisma.acquiredLead.create({
         data: {
           businessName: `${n2} ${n1}`,
           phone: fakePhone,
           city: city || 'São Paulo',
           category: category || 'Clínica Médica',
           status: 'COLD'
         }
       });
    }

    res.json({ success: true, count: countToExtract });
  } catch (error) {
    res.status(500).json({ error: 'Erro no scraper bot' });
  }
});

// --- CAMPAIGNS ---

// GET /crm/campaigns
router.get('/campaigns', async (req, res) => {
  try {
    const campaigns = await prisma.adminCampaign.findMany({
      orderBy: { createdAt: 'desc' }
    });
    // Add stats logic if needed
    res.json(campaigns);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao buscar campanhas' });
  }
});

// POST /crm/campaigns
router.post('/campaigns', async (req, res) => {
  try {
    const { name, targetCity } = req.body;
    
    // Count exactly how many leads match
    const leadsCount = await prisma.acquiredLead.count({
      where: targetCity ? { city: targetCity } : undefined
    });

    const campaign = await prisma.adminCampaign.create({
      data: {
        name,
        targetCity,
        totalLeads: leadsCount,
        status: 'DRAFT'
      }
    });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao criar campanha' });
  }
});

// POST /crm/campaigns/:id/pause
router.post('/campaigns/:id/pause', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.adminCampaign.update({
      where: { id },
      data: { status: 'PAUSED' }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao pausar campanha' });
  }
});

// PUT /crm/campaigns/:id (Edit)
router.put('/campaigns/:id', async (req, res) => {
  try {
    const { name, targetCity } = req.body;
    const { id } = req.params;
    
    let updateData: any = { name };
    
    if (targetCity !== undefined) {
      updateData.targetCity = targetCity;
      updateData.totalLeads = await prisma.acquiredLead.count({
        where: targetCity ? { city: targetCity } : undefined
      });
    }

    const campaign = await prisma.adminCampaign.update({
      where: { id },
      data: updateData
    });
    res.json(campaign);
  } catch (error) {
    res.status(500).json({ error: 'Erro ao editar campanha' });
  }
});

// DELETE /crm/campaigns/:id
router.delete('/campaigns/:id', async (req, res) => {
  try {
    await prisma.adminCampaign.delete({
      where: { id: req.params.id }
    });
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao excluir campanha' });
  }
});

// POST /crm/campaigns/:id/start
router.post('/campaigns/:id/start', async (req, res) => {
  try {
    const { id } = req.params;
    const campaign = await prisma.adminCampaign.findUnique({ where: { id } });
    if (!campaign) return res.status(404).json({ error: 'Campanha não encontrada' });

    await prisma.adminCampaign.update({
      where: { id },
      data: { status: 'SENDING' }
    });

    // Fire and forget Async Loop
    (async () => {
      try {
        const leads = await prisma.acquiredLead.findMany({
          where: { 
            city: campaign.targetCity || undefined,
            status: { in: ['COLD', 'DRAFT'] }
          }
        });

        const sock = await whatsappService.getOrCreateSession('hunters');

        for (const lead of leads) {
          // Re-check if paused
          const campCheck = await prisma.adminCampaign.findUnique({ where: { id } });
          if (campCheck?.status !== 'SENDING') {
            console.log(`Campanha ${id} pausada. Parando loop.`);
            break;
          }

          const cleanPhone = lead.phone.replace(/\D/g, '');
          // Envia msg e aguarda
          await sock?.sendMessage(`55${cleanPhone}@s.whatsapp.net`, { 
            text: `Olá! Notamos o estabelecimento *${lead.businessName}* em nossa varredura de parceiros.\n\nSou Consultor de Expansão da Docton Saúde 💙 e gostaria de propor uma parceria rentável. Tem interesse em aumentar o fluxo de pacientes aí?` 
          });

          await prisma.acquiredLead.update({
             where: { id: lead.id },
             data: { status: 'CONTACTED' }
          });

          await prisma.adminCampaign.update({
             where: { id },
             data: { sentCount: { increment: 1 } }
          });

          // Delay de 5s entre disparos para não levar ban no WhatsApp
          await new Promise(r => setTimeout(r, 5000));
        }

        // Finalizou
        const finalCamp = await prisma.adminCampaign.findUnique({ where: { id } });
        if (finalCamp?.status === 'SENDING') {
           await prisma.adminCampaign.update({
             where: { id },
             data: { status: 'COMPLETED' }
           });
        }
      } catch (err) {
        console.error('Erro no engine de disparo:', err);
        await prisma.adminCampaign.update({
           where: { id },
           data: { status: 'PAUSED' }
        });
      }
    })();

    res.json({ success: true, message: 'Disparos iniciados' });
  } catch (error) {
    res.status(500).json({ error: 'Erro ao iniciar campanha' });
  }
});

export default router;
