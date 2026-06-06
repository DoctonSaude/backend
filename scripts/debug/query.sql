SELECT q.id as qid, r.id as rid, r.price, ph."deliveryFee"
FROM "QuotationRequest" q
JOIN "QuotationResponse" r ON q.id = r."quotationId"
JOIN "Pharmacy" ph ON r."pharmacyId" = ph.id
WHERE q.id = 'e3797050-1eee-4f7e-ad68-b9b00c37c31d';
