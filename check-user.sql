SELECT 
  u.id,
  u.name,
  u.email,
  u.role,
  u."isActive",
  p."onboardingCompleted"
FROM "User" u
LEFT JOIN "Patient" p ON u.id = p."userId"
WHERE u.name ILIKE '%ana%' OR u.name ILIKE '%paula%'
LIMIT 10;
