import dotenv from 'dotenv';
dotenv.config();

import { sendEmail } from './src/services/email.service.js';

async function testReceipt() {
  console.log('Iniciando envio de recibo de teste...');
  console.log('SMTP HOST:', process.env.SMTP_HOST);
  console.log('SMTP USER:', process.env.SMTP_USER);

  try {
    const info = await sendEmail({
      // Mandando o recibo para o email de teste do admin da plataforma
      to: 'doctonsaude@gmail.com', 
      subject: '🧾 Recebemos seu pagamento! Recibo Docton Saúde #001',
      html: `
        <div style="font-family: Arial, sans-serif; background-color: #f7f9fc; padding: 30px;">
          <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 4px 10px rgba(0,0,0,0.05);">
            <div style="background-color: #2563eb; color: white; padding: 20px; text-align: center;">
              <h2>Docton Saúde</h2>
              <p style="margin: 0;">Recibo de Pagamento</p>
            </div>
            
            <div style="padding: 30px;">
              <h3 style="color: #333;">Olá! Temos ótimas notícias. 🎉</h3>
              <p style="color: #555; line-height: 1.6;">O seu pagamento no valor de <strong>R$ 85,90</strong> referente à cotação médica foi processado com sucesso. A farmácia já está separando o seu pedido (Nº 120593).</p>
              
              <div style="background-color: #f1f5f9; padding: 15px; border-radius: 6px; margin: 20px 0;">
                <p style="margin: 5px 0; color: #555;"><strong>Método:</strong> PIX Instantâneo</p>
                <p style="margin: 5px 0; color: #555;"><strong>Data:</strong> ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}</p>
                <p style="margin: 5px 0; color: #555;"><strong>Destinatário:</strong> Farmácia São Paulo</p>
              </div>

              <p style="color: #555;">Este é um email 100% transacional usando sua nova infraestrutura Resend conectada à plataforma Docton Saúde.</p>
              
              <center>
                <a href="https://doctonsaude.com.br" style="display: inline-block; background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; margin-top: 10px;">Acompanhar Pedido</a>
              </center>
            </div>
          </div>
        </div>
      `,
    });

    console.log('✅ SUCESSO! Recibo enviado com sucesso!');
    console.log('ID do Resend:', info.messageId);
    
  } catch(error: any) {
    console.error('❌ Falha ao tentar disparar email:', error.message);
  }
}

testReceipt();
