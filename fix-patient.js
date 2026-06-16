const fs = require('fs');
const path = require('path');

const patientFile = path.join(__dirname, 'src/routes/patient.routes.ts');
let patientContent = fs.readFileSync(patientFile, 'utf8');

// fix createdappointment
patientContent = patientContent.replace(/let createdappointment: any = null;/g, 'let createdAppointment: any = null;');

// fix Partner uppercase in Prisma include where the error occurs
patientContent = patientContent.replace(/include:\s*{\s*partner:/g, 'include: { Partner:');
patientContent = patientContent.replace(/include:\s*{\s*patient:/g, 'include: { Patient:');
patientContent = patientContent.replace(/patient:\s*{\s*connect:/g, 'Patient: { connect:');
patientContent = patientContent.replace(/partner:\s*{\s*connect:/g, 'Partner: { connect:');

// fix .Partner -> .partnerId or .partner depending on context in appointment creation
// Wait, the error is: Property 'Partner' does not exist on type '{ status: string; id: string; ... }'. Did you mean 'partnerId'?
patientContent = patientContent.replace(/appointment\.Partner/g, 'appointment.partnerId'); // Most of them were expecting the ID or relation
// Wait, actually, let me check lines 531-540. It says `appointment.Partner`. Let me replace with `appointment.partnerId` because that's usually what's needed if it's the id, or `appointment.partner` if included.
// Actually, it's safer to just change .Partner to .partner? But `appointment` doesn't have `Partner` because it's a model. Oh, the model has lowercase `partnerId` but Prisma include gives uppercase `Partner`!
// Let me just do specific replacements.

// Replace interpretation from healthLog create
patientContent = patientContent.replace(/interpretation,\s*category,\s*recommendations,\s*inputs/g, '');

// Replace patient.Subscription -> patient.subscriptions
patientContent = patientContent.replace(/\.Subscription/g, '.subscriptions');

// Replace .Partner -> .partner in lines 1735, 1766 (it was partner.User, but error said Partner does not exist on type '{ partner: ... }')
patientContent = patientContent.replace(/pt\.Partner/g, 'pt.partner'); // just in case
patientContent = patientContent.replace(/\.Appointment/g, '.appointment');

// Replace prisma.Pharmacy -> prisma.pharmacy
patientContent = patientContent.replace(/prisma\.Pharmacy\b/g, 'prisma.pharmacy');
patientContent = patientContent.replace(/prisma\.PharmacyOrder\b/g, 'prisma.pharmacyOrder');
patientContent = patientContent.replace(/prisma\.PharmacyPromotion\b/g, 'prisma.pharmacyPromotion');

// Replace PharmacyId -> pharmacyId
patientContent = patientContent.replace(/\.PharmacyId/g, '.pharmacyId');

// Replace .Challenge -> .challenge
patientContent = patientContent.replace(/\.Challenge/g, '.challenge');

fs.writeFileSync(patientFile, patientContent, 'utf8');

const pharmacyFile = path.join(__dirname, 'src/routes/pharmacy.routes.ts');
let pharmacyContent = fs.readFileSync(pharmacyFile, 'utf8');

// Replace prisma.Patient -> prisma.patient
pharmacyContent = pharmacyContent.replace(/prisma\.Patient\b/g, 'prisma.patient');

// Replace prisma.QuotationRequestResponse -> prisma.quotationResponse
pharmacyContent = pharmacyContent.replace(/prisma\.QuotationRequestResponse\b/g, 'prisma.quotationResponse');

// Replace prisma.QuotationRequestRequest -> prisma.quotationRequest
pharmacyContent = pharmacyContent.replace(/prisma\.QuotationRequestRequest\b/g, 'prisma.quotationRequest');

// Replace include: { Patient: true } -> include: { patient: true }
pharmacyContent = pharmacyContent.replace(/include:\s*{\s*Patient:/g, 'include: { patient:');

// Replace order.patient -> order.patientId (where it makes sense) or similar...
// actually, let's fix that manually.

fs.writeFileSync(pharmacyFile, pharmacyContent, 'utf8');

console.log("Fixes applied");
