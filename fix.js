const fs = require('fs');

function replaceFile(path, replacers) {
  if (!fs.existsSync(path)) return;
  let code = fs.readFileSync(path, 'utf8');
  for (const [re, sub] of replacers) {
    code = code.replace(re, sub);
  }
  fs.writeFileSync(path, code);
}

replaceFile('src/controllers/admin/marketing.ts', [
  [/\{ name:(.*?), objective:(.*?), status:(.*?), targetAudience:(.*?), stats:(.*?) \}/g, '{ type: "WHATSAPP", name:$1, objective:$2, status:$3, targetAudience:$4, stats:$5 }']
]);
replaceFile('src/routes/admin/marketing.routes.ts', [
  [/\{ name:(.*?), objective:(.*?), status:(.*?), targetAudience:(.*?), stats:(.*?) \}/g, '{ type: "WHATSAPP", name:$1, objective:$2, status:$3, targetAudience:$4, stats:$5 }']
]);

replaceFile('src/routes/auth.routes.ts', [
  [/Subscription: /g, 'subscriptions: '],
  [/Subscription\?/g, 'subscriptions?']
]);

replaceFile('src/routes/patient.routes.ts', [
  [/Patient: /g, 'patient: '],
  [/SupportMessage:/g, 'messages:'],
  [/Review:/g, 'review:'],
  [/wouldRecommend: [^,]+,/g, ''],
  [/interpretation: [^,]+,/g, ''],
  [/Subscription: /g, 'subscriptions: '],
  [/Subscription\?/g, 'subscriptions?'],
  [/Plan: /g, 'plan: '],
  [/Partner: /g, 'partner: '],
  [/Partner\?/g, 'partner?'],
  [/Appointment: /g, 'appointment: '],
  [/pharmacy:/g, 'Pharmacy:'],
  [/Challenge:/g, 'challenge:'],
  [/QuotationResponse\?/g, 'QuotationResponse'],
  [/QuotationRequestItem/g, 'QuotationRequestItem'],
  [/responses:/g, 'QuotationResponse:'],
  [/\.responses/g, '.QuotationResponse'],
  [/QuotationResponse: \{\n\s*include: \{\n\s*pharmacy: \{/g, 'QuotationResponse: {\n          include: {\n            Pharmacy: {'],
  [/q\.QuotationResponse/g, 'q.QuotationResponse'],
  [/\.pharmacy/g, '.Pharmacy']
]);

replaceFile('src/routes/pharmacy.routes.ts', [
  [/patient: /g, 'Patient: '],
  [/\.patient\./g, '.Patient.'],
  [/quotation:/g, 'QuotationRequest:'],
  [/\.quotation/g, '.QuotationRequest']
]);

console.log('Todos os replaces aplicados.');
